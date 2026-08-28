import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const businesses = pgTable("businesses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  ntn: varchar("ntn", { length: 20 }),
  taxRegistration: varchar("tax_registration", { length: 30 }),
  address: varchar("address", { length: 300 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  logoPath: text("logo_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const businessUsers = pgTable("business_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 30 }).notNull().default("owner"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").references(() => businesses.id, {
    onDelete: "set null",
  }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  objectType: varchar("object_type", { length: 50 }),
  objectId: varchar("object_id", { length: 100 }),
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .unique()
    .references(() => businesses.id, { onDelete: "cascade" }),
  watermarkEnabled: boolean("watermark_enabled").notNull().default(true),
  watermarkMode: varchar("watermark_mode", { length: 10 })
    .notNull()
    .default("text"),
  watermarkText: varchar("watermark_text", { length: 40 }).notNull().default("DRAFT"),
  invoicePrefix: varchar("invoice_prefix", { length: 20 }).notNull().default("INV"),
  fbrEnvironment: varchar("fbr_environment", { length: 20 })
    .notNull()
    .default("sandbox"),
  fbrSandboxToken: text("fbr_sandbox_token"),
  fbrProductionToken: text("fbr_production_token"),
  fbrProvince: varchar("fbr_province", { length: 30 }),
  fbrBuyerDefaults: varchar("fbr_buyer_defaults", { length: 60 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Business = typeof businesses.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type FbrSubmission = typeof fbrSubmissions.$inferSelect;
export type Customer = typeof customers.$inferSelect;

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }).notNull(),
  ntn: varchar("ntn", { length: 20 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  address: varchar("address", { length: 300 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }).notNull(),
  sku: varchar("sku", { length: 50 }).notNull(),
  barcode: varchar("barcode", { length: 64 }),
  unit: varchar("unit", { length: 20 }).notNull().default("pcs"),
  pricePaisa: integer("price_paisa").notNull(),
  hsCode: varchar("hs_code", { length: 20 }),
  taxRateBp: integer("tax_rate_bp").notNull().default(1800),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("products_business_barcode_unique").on(table.businessId, table.barcode),
]);

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  number: varchar("number", { length: 50 }),
  issueDate: timestamp("issue_date", { withTimezone: true }),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  discountPaisa: integer("discount_paisa").notNull().default(0),
  subtotalPaisa: integer("subtotal_paisa").notNull(),
  taxablePaisa: integer("taxable_paisa").notNull(),
  taxPaisa: integer("tax_paisa").notNull(),
  totalPaisa: integer("total_paisa").notNull(),
  notes: text("notes"),
  fbrNumber: varchar("fbr_number", { length: 40 }),
  fbrStatus: varchar("fbr_status", { length: 20 }),
  fbrSubmittedAt: timestamp("fbr_submitted_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  description: varchar("description", { length: 250 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPricePaisa: integer("unit_price_paisa").notNull(),
  taxRateBp: integer("tax_rate_bp").notNull().default(1800),
  amountPaisa: integer("amount_paisa").notNull(),
});

export const invoiceNumbers = pgTable("invoice_numbers", {
  businessId: uuid("business_id")
    .primaryKey()
    .references(() => businesses.id, { onDelete: "cascade" }),
  prefix: varchar("prefix", { length: 20 }).notNull().default("INV"),
  lastNumber: integer("last_number").notNull().default(0),
});

export const fbrSubmissions = pgTable("fbr_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  environment: varchar("environment", { length: 20 }).notNull().default("sandbox"),
  requestBody: text("request_body"),
  fbrNumber: varchar("fbr_number", { length: 40 }),
  errorMessage: text("error_message"),
  responseBody: text("response_body"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});