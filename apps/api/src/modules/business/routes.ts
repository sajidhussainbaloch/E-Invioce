import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { businessSchema } from "@invoice-bank/validation";
import { businessUsers, businesses, settings as settingsTable } from "../../db/schema.js";
import { sanitizeSettings } from "./sanitize.js";
import { db } from "../../db/index.js";
import { requireAuth, requireBusiness } from "../auth/service.js";

export const uploadsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "..",
  "uploads",
);

const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

async function ensureUploads(): Promise<void> {
  await fs.mkdir(uploadsDir, { recursive: true });
}

export async function businessRoutes(app: FastifyInstance) {
  await ensureUploads();

  app.post("/api/business", { preHandler: requireAuth }, async (request, reply) => {
    const body = businessSchema.parse(request.body);
    const userId = request.auth!.user.id;

    const existing = await db
      .select({ id: businessUsers.id })
      .from(businessUsers)
      .where(eq(businessUsers.userId, userId))
      .limit(1);
    if (existing.length > 0) {
      return reply.status(409).send({ message: "Business already setup for this user" });
    }

    const [business] = await db
      .insert(businesses)
      .values({
        name: body.name,
        ntn: body.ntn || null,
        taxRegistration: body.taxRegistration || null,
        address: body.address || null,
        phone: body.phone || null,
        email: body.email || null,
      })
      .returning();
    await db.insert(businessUsers).values({ businessId: business.id, userId, role: "owner" });
    await db.insert(settingsTable).values({ businessId: business.id });

    return { business };
  });

  app.get("/api/business", { preHandler: requireBusiness }, async (request) => {
    const businessId = request.auth!.businessId!;
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);
    const [settingsRow] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.businessId, businessId))
      .limit(1);
    return { business, settings: sanitizeSettings(settingsRow) };
  });

  app.patch("/api/business", { preHandler: requireBusiness }, async (request, reply) => {
    const body = businessSchema.parse(request.body);
    const businessId = request.auth!.businessId!;
    const [business] = await db
      .update(businesses)
      .set({
        name: body.name,
        ntn: body.ntn || null,
        taxRegistration: body.taxRegistration || null,
        address: body.address || null,
        phone: body.phone || null,
        email: body.email || null,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, businessId))
      .returning();
    if (!business) {
      return reply.status(404).send({ message: "Business not found" });
    }
    return { business };
  });

  app.get("/api/business/settings", { preHandler: requireBusiness }, async (request) => {
    const businessId = request.auth!.businessId!;
    const [settingsRow] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.businessId, businessId))
      .limit(1);
    return { settings: sanitizeSettings(settingsRow) };
  });

  app.patch("/api/business/settings", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const body = request.body as {
      watermarkEnabled?: boolean;
      watermarkMode?: unknown;
      watermarkText?: unknown;
      invoicePrefix?: string;
      fbrEnvironment?: string;
    };
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.watermarkEnabled === "boolean") patch.watermarkEnabled = body.watermarkEnabled;
    if (body.watermarkMode === "text" || body.watermarkMode === "logo") {
      patch.watermarkMode = body.watermarkMode;
    }
    if (typeof body.watermarkText === "string") {
      const text = body.watermarkText.trim().slice(0, 40);
      patch.watermarkText = text || "DRAFT";
    }
    if (typeof body.invoicePrefix === "string") patch.invoicePrefix = body.invoicePrefix;
    if (typeof body.fbrEnvironment === "string") patch.fbrEnvironment = body.fbrEnvironment;
    const [settingsRow] = await db
      .update(settingsTable)
      .set(patch)
      .where(eq(settingsTable.businessId, businessId))
      .returning();
    return { settings: sanitizeSettings(settingsRow) };
  });

  app.post("/api/business/logo", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const data = await request.file({ limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
    if (!data) {
      return reply.status(400).send({ message: "No file uploaded" });
    }
    if (!ALLOWED_LOGO_TYPES.has(data.mimetype)) {
      return reply.status(400).send({ message: "Logo must be PNG, JPEG or WebP" });
    }

    const ext = extensionFor(data.mimetype);
    const dir = path.join(uploadsDir, businessId);
    await fs.mkdir(dir, { recursive: true });
    const filename = `${Date.now()}-${randomUUID()}.${ext}`;
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, await data.toBuffer());

    const logoUrl = `/uploads/${businessId}/${filename}`;
    const [business] = await db
      .update(businesses)
      .set({ logoPath: logoUrl, updatedAt: new Date() })
      .where(eq(businesses.id, businessId))
      .returning();
    return { business };
  });

  app.register(import("@fastify/static"), {
    root: uploadsDir,
    prefix: "/uploads/",
    decorateReply: false,
  });
}

function extensionFor(mimetype: string): string {
  switch (mimetype) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    default:
      return "webp";
  }
}