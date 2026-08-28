import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { businesses, customers, fbrSubmissions, invoiceItems, invoices, products, settings as settingsTable } from "../../db/schema.js";
import { db } from "../../db/index.js";
import { requireBusiness } from "../auth/service.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", { preHandler: requireBusiness }, async (request) => {
    const businessId = request.auth!.businessId!;

    const [invoiceCount] = await db
      .select({ count: count() })
      .from(invoices)
      .where(eq(invoices.businessId, businessId));
    const [customerCount] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.businessId, businessId));
    const [productCount] = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.businessId, businessId));

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [salesRow] = await db
      .select({ total: sql<number>`coalesce(sum(${invoices.totalPaisa}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.businessId, businessId),
          eq(invoices.status, "issued"),
          gte(invoices.issueDate, startOfDay),
        ),
      );

    const recent = await db
      .select({
        id: invoices.id,
        number: invoices.number,
        status: invoices.status,
        issueDate: invoices.issueDate,
        createdAt: invoices.createdAt,
        totalPaisa: invoices.totalPaisa,
        customerName: customers.name,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.businessId, businessId))
      .orderBy(desc(invoices.createdAt))
      .limit(5);

    const itemCount = async () => {
      const [row] = await db
        .select({ count: count() })
        .from(invoiceItems)
        .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
        .where(eq(invoices.businessId, businessId));
      return row.count;
    };

    const [settingsRow] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.businessId, businessId))
      .limit(1);

    const [lastFbrRow] = await db
      .select()
      .from(fbrSubmissions)
      .where(eq(fbrSubmissions.businessId, businessId))
      .orderBy(desc(fbrSubmissions.createdAt))
      .limit(1);

    const [pendingFbrRow] = await db
      .select({ count: count() })
      .from(fbrSubmissions)
      .where(
        and(
          eq(fbrSubmissions.businessId, businessId),
          sql`${fbrSubmissions.status} in ('failed', 'pending')`,
        ),
      );

    const hasToken = settingsRow
      ? settingsRow.fbrEnvironment === "production"
        ? Boolean(settingsRow.fbrProductionToken)
        : Boolean(settingsRow.fbrSandboxToken)
      : false;

    return {
      business: request.auth!.business ?? null,
      invoices: invoiceCount.count,
      customers: customerCount.count,
      products: productCount.count,
      invoiceLines: await itemCount(),
      salesToday: Number(salesRow?.total ?? 0),
      recentInvoices: recent,
      fbrConnected: hasToken,
      fbrEnvironment: settingsRow?.fbrEnvironment ?? null,
      pendingFbrSubmissions: Number(pendingFbrRow?.count ?? 0),
      lastFbrSubmission: lastFbrRow
        ? {
            invoiceNumber: lastFbrRow.invoiceNumber,
            status: lastFbrRow.status,
            fbrNumber: lastFbrRow.fbrNumber,
            errorMessage: lastFbrRow.errorMessage,
            createdAt: lastFbrRow.createdAt,
          }
        : null,
      generatedAt: new Date().toISOString(),
    };
  });
}