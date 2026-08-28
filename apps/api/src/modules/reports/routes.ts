import { and, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { customers, invoiceItems, invoices } from "../../db/schema.js";
import { db } from "../../db/index.js";
import { requireBusiness } from "../auth/service.js";

export async function reportsRoutes(app: FastifyInstance) {
  app.get("/api/reports/sales", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const query = request.query as { from?: string; to?: string };
    const from = query.from ? new Date(query.from) : null;
    const to = query.to ? new Date(query.to) : null;

    if (from && Number.isNaN(from.getTime())) return reply.status(400).send({ message: "Invalid from date" });
    if (to && Number.isNaN(to.getTime())) return reply.status(400).send({ message: "Invalid to date" });

    const filters = [eq(invoices.businessId, businessId), eq(invoices.status, "issued")];
    if (from) filters.push(gte(invoices.issueDate, from));
    if (to) filters.push(lte(invoices.issueDate, to));

    const [summaryRow] = await db
      .select({
        count: count(),
        revenue: sql<number>`coalesce(sum(${invoices.totalPaisa}), 0)`,
        tax: sql<number>`coalesce(sum(${invoices.taxPaisa}), 0)`,
        discount: sql<number>`coalesce(sum(${invoices.discountPaisa}), 0)`,
      })
      .from(invoices)
      .where(and(...filters));

    const invoicesForItems = await db
      .select({ id: invoices.id, businessId: invoices.businessId, issueDate: invoices.issueDate })
      .from(invoices)
      .where(and(...filters));

    const ids = invoicesForItems.map((i) => i.id);

    const itemTotals = new Map<
      string,
      { description: string; quantity: number; amountPaisa: number; taxRateBp: number }
    >();
    if (ids.length > 0) {
      const rows = await db
        .select({
          description: invoiceItems.description,
          quantity: invoiceItems.quantity,
          amountPaisa: invoiceItems.amountPaisa,
          taxRateBp: invoiceItems.taxRateBp,
        })
        .from(invoiceItems)
        .where(inArray(invoiceItems.invoiceId, ids));
      for (const row of rows) {
        const key = row.description;
        const prev = itemTotals.get(key);
        if (prev) {
          prev.quantity += row.quantity;
          prev.amountPaisa += row.amountPaisa;
        } else {
          itemTotals.set(key, { ...row });
        }
      }
    }

    const invoiceList = await db
      .select({
        id: invoices.id,
        number: invoices.number,
        issueDate: invoices.issueDate,
        totalPaisa: invoices.totalPaisa,
        taxPaisa: invoices.taxPaisa,
        fbrNumber: invoices.fbrNumber,
        fbrStatus: invoices.fbrStatus,
        customerName: customers.name,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(...filters))
      .orderBy(desc(invoices.issueDate), desc(invoices.createdAt))
      .limit(1000);

    return {
      summary: {
        count: summaryRow?.count ?? 0,
        revenuePaisa: Number(summaryRow?.revenue ?? 0),
        taxPaisa: Number(summaryRow?.tax ?? 0),
        discountPaisa: Number(summaryRow?.discount ?? 0),
      },
      byItem: [...itemTotals.values()].map((t) => ({
        description: t.description,
        quantity: t.quantity,
        amountPaisa: t.amountPaisa,
        taxRateBp: t.taxRateBp,
      })),
      rows: invoiceList,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
    };
  });
}