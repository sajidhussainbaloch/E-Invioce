import type { Business, Invoice, Settings } from "../../db/schema.js";
import type { InvoiceItemRow } from "../invoices/types.js";

export type FbrEnvironment = "sandbox" | "production";

export const FBR_SANDBOX_URL = "https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata_sb";
export const FBR_PRODUCTION_URL = "https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata";

const PROVINCES = [
  "Sindh",
  "Punjab",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Islamabad Capital Territory",
  "Gilgit Baltistan",
  "Azad Jammu and Kashmir",
] as const;

export type FbrDiItem = {
  hsCode: string;
  productDescription: string;
  rate: string;
  uoM: string;
  quantity: number;
  totalValues: number;
  valueSalesExcludingST: number;
  fixedNotifiedValueOrRetailPrice: number;
  salesTaxApplicable: number;
  salesTaxWithheldAtSource: number;
  extraTax: number;
  furtherTax: number;
  sroScheduleNo: string;
  fedPayable: number;
  discount: number;
  saleType: string;
  sroItemSerialNo: string;
};

export type FbrDiPayload = {
  invoiceType: string;
  invoiceDate: string;
  sellerNTNCNIC: string;
  sellerBusinessName: string;
  sellerProvince: string;
  sellerAddress: string;
  buyerNTNCNIC: string;
  buyerBusinessName: string;
  buyerProvince: string;
  buyerAddress: string;
  buyerRegistrationType: string;
  invoiceRefNo: string;
  items: FbrDiItem[];
};

export type FbrSubmitResult = {
  ok: boolean;
  fbrNumber?: string;
  message?: string;
  responseBody?: string;
};

export type DiCustomer = {
  name: string;
  ntn: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
};

export type Supplier = {
  business: Business;
  customer: DiCustomer | null;
  invoice: Invoice;
  items: InvoiceItemRow[];
  settings: Pick<
    Settings,
    "fbrProvince" | "fbrEnvironment" | "fbrSandboxToken" | "fbrProductionToken"
  > | null;
};

export function provinceValid(province: string | null | undefined): province is string {
  return typeof province === "string" && (PROVINCES as readonly string[]).includes(province);
}

export function rateLabel(taxRateBp: number): string {
  if (taxRateBp <= 0) return "0%";
  const pct = taxRateBp / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
}

export function saleTypeFor(taxRateBp: number, hsCode: string | null): string {
  if (taxRateBp <= 0) return "Goods at zero-rate";
  if (hsCode) return "Goods at standard rate (default)";
  return "Goods at standard rate (default)";
}

/**
 * Build the FBR Digital Invoicing (DI) payload for an issued invoice following
 * the official DI API v1.12 JSON schema published by FBR/PRAL.
 */
export function buildDiPayload(supplier: Supplier): { payload: FbrDiPayload; missing: string[] } {
  const { business, customer, invoice, items, settings } = supplier;
  const missing: string[] = [];

  const sellerNtn = normalizeNtn(business.ntn);
  if (!sellerNtn) missing.push("seller NTN");
  const buyerNtn = normalizeNtn(customer?.ntn ?? null);

  if (!provinceValid(settings?.fbrProvince)) missing.push("seller province");

  const province = settings?.fbrProvince ?? "Sindh";

  const payload: FbrDiPayload = {
    invoiceType: "Sale Invoice",
    invoiceDate: (invoice.issueDate ?? new Date()).toISOString().slice(0, 10),
    sellerNTNCNIC: sellerNtn ?? "",
    sellerBusinessName: business.name.slice(0, 150),
    sellerProvince: province,
    sellerAddress: business.address ?? business.name,
    buyerNTNCNIC: buyerNtn ?? (customer ? "" : "1000000000000"),
    buyerBusinessName: customer?.name ?? "Walk-in Customer",
    buyerProvince: "Sindh",
    buyerAddress: customer?.address ?? "",
    buyerRegistrationType: buyerNtn ? "Registered" : "Unregistered",
    invoiceRefNo: invoice.number ?? "",
    items: items.map((it) => {
      const amountPaisa = Math.round(it.quantity * it.unitPricePaisa);
      const taxPaisa = Math.round((amountPaisa * it.taxRateBp) / 10000);
      return {
        hsCode: it.hsCode ?? "0000.0000",
        productDescription: it.description.slice(0, 250),
        rate: rateLabel(it.taxRateBp),
        uoM: it.unit ?? "Numbers, pieces, units",
        quantity: it.quantity,
        totalValues: (amountPaisa + taxPaisa) / 100,
        valueSalesExcludingST: amountPaisa / 100,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable: taxPaisa / 100,
        salesTaxWithheldAtSource: 0,
        extraTax: 0,
        furtherTax: 0,
        sroScheduleNo: "",
        fedPayable: 0,
        discount: 0,
        saleType: saleTypeFor(it.taxRateBp, it.hsCode ?? null),
        sroItemSerialNo: "",
      };
    }),
  };
  return { payload, missing };
}

/**
 * POST the invoice to FBR's gateway. Returns the issued FBR number on success.
 */
export async function submitToFbr(opts: {
  supplier: Supplier;
  token: string;
  environment: FbrEnvironment;
}): Promise<FbrSubmitResult> {
  const { supplier, token, environment } = opts;
  const { payload, missing } = buildDiPayload(supplier);
  if (missing.length > 0) {
    return {
      ok: false,
      message: `FBR submission skipped — missing: ${missing.join(", ")}. Complete the FBR settings first.`,
    };
  }

  const url = environment === "sandbox" ? FBR_SANDBOX_URL : FBR_PRODUCTION_URL;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "*/*",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    return {
      ok: false,
      message: `Could not reach ${url} — ${err instanceof Error ? err.message : "network error"}. Will queue and retry.`,
    };
  }

  const responseBody = await response.text().catch(() => "");
  if (!response.ok) {
    return {
      ok: false,
      message: `FBR gateway responded ${response.status}. ${responseBody.slice(0, 300)}. Will queue and retry.`,
      responseBody: responseBody.slice(0, 2000),
    };
  }

  const fbrNumber = extractFbrNumber(responseBody);
  if (!fbrNumber) {
    return {
      ok: false,
      message: `FBR accepted the request but returned no invoice number. ${responseBody.slice(0, 300)}`,
      responseBody: responseBody.slice(0, 2000),
    };
  }

  return { ok: true, fbrNumber, responseBody: responseBody.slice(0, 2000) };
}

function extractFbrNumber(body: string): string | undefined {
  try {
    const data = JSON.parse(body) as {
      result?: string | number;
      invoiceNumber?: string;
      fbrInvoiceNumber?: string;
      errorMessage?: string;
    };
    if (data.fbrInvoiceNumber) return String(data.fbrInvoiceNumber);
    if (data.invoiceNumber) return String(data.invoiceNumber);
    const result = data.result;
    if (typeof result === "string") return /^\d{22}$/.test(result) ? result : undefined;
    if (typeof result === "number") return String(result);
    return undefined;
  } catch {
    const match = body.match(/\d{22}/);
    return match ? match[0] : undefined;
  }
}

export function normalizeNtn(ntn: string | null | undefined): string | null {
  if (!ntn) return null;
  const cleaned = ntn.replace(/[-\s]/g, "");
  if (/^\d{7}$/.test(cleaned)) return cleaned;
  if (/^\d{13}$/.test(cleaned)) return cleaned;
  return cleaned.replace(/[^\d]/g, "");
}