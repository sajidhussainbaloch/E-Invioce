import { count, desc, eq, inArray, and } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { businesses, fbrSubmissions, invoices, settings as settingsTable } from "../../db/schema.js";
import { db } from "../../db/index.js";
import { requireBusiness } from "../auth/service.js";
import { submitInvoiceToFbr, effectiveToken } from "./service.js";
import { buildDiPayload } from "./gateway.js";

export async function fbrRoutes(app: FastifyInstance) {
  app.get("/api/fbr/status", { preHandler: requireBusiness }, async (request) => {
    const businessId = request.auth!.businessId!;
    const [settingsRow] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.businessId, businessId))
      .limit(1);
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    const [lastTx] = await db
      .select()
      .from(fbrSubmissions)
      .where(eq(fbrSubmissions.businessId, businessId))
      .orderBy(desc(fbrSubmissions.createdAt))
      .limit(1);

    const [pendingRow] = await db
      .select({ n: count() })
      .from(fbrSubmissions)
      .where(and(eq(fbrSubmissions.businessId, businessId), inArray(fbrSubmissions.status, ["failed", "pending"])));

    return {
      status: settingsRow
        ? {
            environment: settingsRow.fbrEnvironment,
            province: settingsRow.fbrProvince ?? null,
            hasSandboxToken: Boolean(settingsRow.fbrSandboxToken),
            hasProductionToken: Boolean(settingsRow.fbrProductionToken),
          }
        : null,
      business: { name: business?.name ?? null, hasNtn: Boolean(business?.ntn), ntn: business?.ntn ?? null },
      lastSubmission: lastTx
        ? {
            id: lastTx.id,
            invoiceNumber: lastTx.invoiceNumber,
            status: lastTx.status,
            fbrNumber: lastTx.fbrNumber,
            errorMessage: lastTx.errorMessage,
            submittedAt: lastTx.submittedAt,
            createdAt: lastTx.createdAt,
          }
        : null,
      pendingCount: pendingRow?.n ?? 0,
    };
  });

  app.patch("/api/fbr/settings", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const body = request.body as {
      environment?: string;
      sandboxToken?: string;
      productionToken?: string;
      province?: string;
    };

    if (
      body.environment &&
      body.environment !== "sandbox" &&
      body.environment !== "production"
    ) {
      return reply.status(400).send({ message: "Environment must be sandbox or production" });
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.environment) patch.fbrEnvironment = body.environment;
    if (typeof body.sandboxToken === "string") patch.fbrSandboxToken = body.sandboxToken.trim() || null;
    if (typeof body.productionToken === "string") patch.fbrProductionToken = body.productionToken.trim() || null;
    if (typeof body.province === "string") patch.fbrProvince = body.province || null;

    const [settingsRow] = await db
      .update(settingsTable)
      .set(patch)
      .where(eq(settingsTable.businessId, businessId))
      .returning();

    return {
      settings: {
        environment: settingsRow.fbrEnvironment,
        province: settingsRow.fbrProvince ?? null,
        hasSandboxToken: Boolean(settingsRow.fbrSandboxToken),
        hasProductionToken: Boolean(settingsRow.fbrProductionToken),
      },
    };
  });

  app.post("/api/fbr/test", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const business = request.auth!.business!;
    const [settingsRow] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.businessId, businessId))
      .limit(1);
    if (!settingsRow) {
      return reply.status(400).send({ message: "Business settings not found" });
    }
    const { token, environment } = effectiveToken({
      fbrProvince: settingsRow.fbrProvince,
      fbrEnvironment: settingsRow.fbrEnvironment,
      fbrSandboxToken: settingsRow.fbrSandboxToken,
      fbrProductionToken: settingsRow.fbrProductionToken,
    });
    if (!token) {
      return reply.status(400).send({
        ok: false,
        message: `No ${environment} token saved yet. Paste your FBR Bearer token above and save it first.`,
      });
    }

    const settings = {
      fbrProvince: settingsRow.fbrProvince,
      fbrEnvironment: settingsRow.fbrEnvironment,
      fbrSandboxToken: settingsRow.fbrSandboxToken,
      fbrProductionToken: settingsRow.fbrProductionToken,
    };

    // Build a sample test payload reusing the business profile.
    const { payload, missing } = buildDiPayload({
      business,
      customer: { name: "Test Buyer", ntn: null, address: "Karachi", phone: null, email: null },
      invoice: {
        id: "00000000-0000-0000-0000-000000000000",
        businessId,
        customerId: "00000000-0000-0000-0000-000000000000",
        number: "FBR-TEST-001",
        issueDate: new Date(),
        status: "issued",
        discountPaisa: 0,
        subtotalPaisa: 100000,
        taxablePaisa: 100000,
        taxPaisa: 18000,
        totalPaisa: 118000,
        notes: null,
        fbrNumber: null,
        fbrStatus: null,
        fbrSubmittedAt: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      items: [
        {
          id: "00000000-0000-0000-0000-000000000000",
          invoiceId: "00000000-0000-0000-0000-000000000000",
          productId: null,
          description: "Test product",
          quantity: 1,
          unitPricePaisa: 100000,
          taxRateBp: 1800,
          amountPaisa: 100000,
          hsCode: null,
          unit: "pcs",
        },
      ],
      settings,
    });

    if (missing.length > 0) {
      return reply.status(400).send({
        ok: false,
        message: `Cannot test — missing: ${missing.join(", ")}. Set your business NTN and seller province first.`,
        payload,
      });
    }

    return { ok: true, message: "Test payload ready. Correct HS codes per item and submit.", payload };
  });

  app.get("/api/fbr/submissions", { preHandler: requireBusiness }, async (request) => {
    const businessId = request.auth!.businessId!;
    const rows = await db
      .select()
      .from(fbrSubmissions)
      .where(eq(fbrSubmissions.businessId, businessId))
      .orderBy(desc(fbrSubmissions.createdAt))
      .limit(100);
    return {
      submissions: rows.map((r) => ({
        id: r.id,
        invoiceId: r.invoiceId,
        invoiceNumber: r.invoiceNumber,
        status: r.status,
        attempts: r.attempts,
        environment: r.environment,
        fbrNumber: r.fbrNumber,
        errorMessage: r.errorMessage,
        submittedAt: r.submittedAt,
        createdAt: r.createdAt,
      })),
    };
  });

  app.post("/api/fbr/retry/:invoiceId", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const { invoiceId } = request.params as { invoiceId: string };
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, businessId)))
      .limit(1);
    if (!invoice) {
      return reply.status(404).send({ message: "Invoice not found" });
    }
    if (invoice.status !== "issued") {
      return reply.status(400).send({ message: "Only issued invoices can be submitted to FBR" });
    }
    return await submitInvoiceToFbr(businessId, invoiceId);
  });

  app.post("/api/fbr/retry-all", { preHandler: requireBusiness }, async (request) => {
    const businessId = request.auth!.businessId!;
    const failed = await db
      .select()
      .from(fbrSubmissions)
      .where(and(eq(fbrSubmissions.businessId, businessId), inArray(fbrSubmissions.status, ["failed", "pending"])));

    const results = [];
    for (const row of failed) {
      try {
        const result = await submitInvoiceToFbr(businessId, row.invoiceId);
        results.push({ invoiceId: row.invoiceId, invoiceNumber: row.invoiceNumber, ok: result.ok, message: result.message });
      } catch (err) {
        results.push({
          invoiceId: row.invoiceId,
          invoiceNumber: row.invoiceNumber,
          ok: false,
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
    return { results };
  });
}