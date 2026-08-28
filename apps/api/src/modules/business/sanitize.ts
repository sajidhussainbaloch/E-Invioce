import type { Settings } from "../../db/schema.js";

export type PublicSettings = {
  id: string;
  businessId: string;
  watermarkEnabled: boolean;
  watermarkMode: "text" | "logo";
  watermarkText: string;
  invoicePrefix: string;
  fbrEnvironment: "sandbox" | "production";
  fbrProvince: string | null;
  hasFbrSandboxToken: boolean;
  hasFbrProductionToken: boolean;
  updatedAt: Date;
};

export function sanitizeSettings(row: Settings | null): PublicSettings | null {
  if (!row) return null;
  return {
    id: row.id,
    businessId: row.businessId,
    watermarkEnabled: row.watermarkEnabled,
    watermarkMode: row.watermarkMode === "logo" ? "logo" : "text",
    watermarkText: row.watermarkText,
    invoicePrefix: row.invoicePrefix,
    fbrEnvironment: row.fbrEnvironment === "production" ? "production" : "sandbox",
    fbrProvince: row.fbrProvince ?? null,
    hasFbrSandboxToken: Boolean(row.fbrSandboxToken),
    hasFbrProductionToken: Boolean(row.fbrProductionToken),
    updatedAt: row.updatedAt,
  };
}