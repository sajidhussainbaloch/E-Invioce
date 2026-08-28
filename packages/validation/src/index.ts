import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  email: z.string().trim().email().toLowerCase().max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase().max(255),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const businessSchema = z.object({
  name: z.string().trim().min(2, "Business name is too short").max(150),
  ntn: z.string().trim().max(20).optional(),
  taxRegistration: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(255).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type BusinessInput = z.infer<typeof businessSchema>;

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => v ?? undefined);

const rupees = () =>
  z
    .number()
    .finite()
    .min(0)
    .max(1_000_000_000)
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Maximum 2 decimal places");

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  ntn: optionalTrimmed(20),
  phone: optionalTrimmed(30),
  email: z.string().trim().email().max(255).optional().nullable().transform((v) => v ?? undefined),
  address: optionalTrimmed(300),
  notes: optionalTrimmed(4000),
});

export const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  sku: z.string().trim().min(1, "SKU is required").max(50),
  barcode: optionalTrimmed(64),
  unit: z.string().trim().min(1).max(20).default("pcs"),
  price: rupees(),
  hsCode: optionalTrimmed(20),
  taxRateBp: z.number().int().min(0).max(10000).optional(),
});

const invoiceLineSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().trim().min(1, "Item description is required").max(250),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(1_000_000),
  unitPrice: rupees(),
  taxRateBp: z.number().int().min(0).max(10000),
});

export const invoiceInputSchema = z.object({
  customerId: z.string().uuid(),
  discount: rupees().default(0),
  notes: optionalTrimmed(4000),
  items: z.array(invoiceLineSchema).min(1, "Add at least one item"),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;
export type InvoiceInput = z.infer<typeof invoiceInputSchema>;