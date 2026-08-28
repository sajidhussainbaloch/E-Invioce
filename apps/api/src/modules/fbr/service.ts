import { desc, eq, inArray } from "drizzle-orm";
import { businesses, customers, fbrSubmissions, invoices, invoiceItems, products, settings as settingsTable } from "../../db/schema.js";
import { db } from "../../db/index.js";
import { buildDiPayload, submitToFbr, type Supplier } from "./gateway.js";
import type { FbrEnvironment } from "./gateway.js";
import type { InvoiceItemRow } from "../invoices/types.js";

export async function loadSupplier(businessId: string, invoiceId: string): Promise<Supplier | null> {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  if (!invoice || invoice.businessId !== businessId) return null;

  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, invoice.customerId))
    .limit(1);
  const [settingsRow] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.businessId, businessId))
    .limit(1);

  const rawItems = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));

  const productIds = rawItems
    .map((it) => it.productId)
    .filter((id): id is string => id !== null);
  const productMap = new Map<string, { hsCode: string | null; unit: string }>();
  if (productIds.length > 0) {
    const rows = await db
      .select({ id: products.id, hsCode: products.hsCode, unit: products.unit })
      .from(products)
      .where(inArray(products.id, productIds));
    for (const row of rows) {
      productMap.set(row.id, { hsCode: row.hsCode, unit: row.unit });
    }
  }

  const items: InvoiceItemRow[] = rawItems.map((it) => {
    const p = it.productId ? productMap.get(it.productId) : undefined;
    return {
      id: it.id,
      invoiceId: it.invoiceId,
      productId: it.productId,
      description: it.description,
      quantity: it.quantity,
      unitPricePaisa: it.unitPricePaisa,
      taxRateBp: it.taxRateBp,
      amountPaisa: it.amountPaisa,
      hsCode: p?.hsCode ?? null,
      unit: p?.unit ?? null,
    };
  });

  return {
    business,
    customer: customer ?? null,
    invoice,
    items,
    settings: settingsRow
      ? {
          fbrProvince: settingsRow.fbrProvince,
          fbrEnvironment: settingsRow.fbrEnvironment,
          fbrSandboxToken: settingsRow.fbrSandboxToken,
          fbrProductionToken: settingsRow.fbrProductionToken,
        }
      : null,
  };
}

export function effectiveToken(
  settings: Supplier["settings"],
): { token: string | null; environment: FbrEnvironment } {
  const environment: FbrEnvironment =
    settings?.fbrEnvironment === "production" ? "production" : "sandbox";
  const token =
    environment === "production"
      ? settings?.fbrProductionToken
      : settings?.fbrSandboxToken;
  return { token: token && token.trim() ? token : null, environment };
}

export async function submitInvoiceToFbr(businessId: string, invoiceId: string): Promise<{ ok: boolean; status: string; message: string; fbrNumber: string | null }> {
  const supplier = await loadSupplier(businessId, invoiceId);
  if (!supplier) return { ok: false, status: "error", message: "Invoice not found", fbrNumber: null };

  const { token, environment } = effectiveToken(supplier.settings);
  if (!token) {
    return {
      ok: false,
      status: "not_configured",
      message: `No ${environment} FBR token saved. Add it in the FBR tab to enable submissions.`,
      fbrNumber: null,
    };
  }

  const [existing] = await db
    .select()
    .from(fbrSubmissions)
    .where(eq(fbrSubmissions.invoiceId, invoiceId))
    .orderBy(desc(fbrSubmissions.createdAt))
    .limit(1);

  const attempts = (existing?.attempts ?? 0) + 1;

  const result = await submitToFbr({ supplier, token, environment });
  const status = result.ok ? "submitted" : "failed";

  if (existing) {
    await db
      .update(fbrSubmissions)
      .set({
        status,
        attempts,
        environment,
        fbrNumber: result.fbrNumber ?? null,
        errorMessage: result.ok ? null : result.message ?? null,
        responseBody: result.responseBody ?? null,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(fbrSubmissions.id, existing.id));
  } else {
    await db.insert(fbrSubmissions).values({
      businessId,
      invoiceId,
      invoiceNumber: supplier.invoice.number,
      status,
      attempts,
      environment,
      requestBody: JSON.stringify(buildDiPayload(supplier).payload),
      fbrNumber: result.fbrNumber ?? null,
      errorMessage: result.ok ? null : result.message ?? null,
      responseBody: result.responseBody ?? null,
      submittedAt: result.ok ? new Date() : null,
    });
  }

  await db
    .update(invoices)
    .set({
      fbrNumber: result.fbrNumber ?? null,
      fbrStatus: status,
      fbrSubmittedAt: result.ok ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  return {
    ok: result.ok,
    status,
    message: result.ok ? `Submitted — FBR number ${result.fbrNumber}` : (result.message ?? "Submission failed"),
    fbrNumber: result.fbrNumber ?? null,
  };
}