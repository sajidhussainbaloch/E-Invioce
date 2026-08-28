import { and, desc, eq, ilike, ne, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { productSchema } from "@invoice-bank/validation";
import { invoiceItems, products } from "../../db/schema.js";
import { db } from "../../db/index.js";
import { rupeesToPaisa } from "../../utils/money.js";
import { requireBusiness } from "../auth/service.js";

export async function productRoutes(app: FastifyInstance) {
  app.get("/api/products", { preHandler: requireBusiness }, async (request) => {
    const businessId = request.auth!.businessId!;
    const query = request.query as { q?: string; barcode?: string };
    const q = query.q?.trim();
    const barcode = query.barcode?.trim();

    const rows = await db
      .select()
      .from(products)
      .where(
        barcode
          ? and(eq(products.businessId, businessId), eq(products.barcode, barcode))
          : q
            ? and(
                eq(products.businessId, businessId),
                or(
                  ilike(products.name, `%${q}%`),
                  ilike(products.sku, `%${q}%`),
                  ilike(products.hsCode, `%${q}%`),
                  ilike(products.barcode, `%${q}%`),
                ),
              )
            : eq(products.businessId, businessId),
      )
      .orderBy(desc(products.createdAt))
      .limit(200);

    return { products: rows };
  });

  app.get("/api/products/by-barcode/:barcode", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const { barcode } = request.params as { barcode: string };

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.businessId, businessId), eq(products.barcode, barcode)))
      .limit(1);

    if (!product) {
      return reply.status(404).send({ message: "No product found with that barcode" });
    }
    return { product };
  });

  app.post("/api/products", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const body = productSchema.parse(request.body);

    if (body.barcode) {
      const [dup] = await db
        .select({ id: products.id, name: products.name })
        .from(products)
        .where(and(eq(products.businessId, businessId), eq(products.barcode, body.barcode)))
        .limit(1);
      if (dup) {
        return reply.status(409).send({
          message: `A product with barcode "${body.barcode}" already exists: ${dup.name}`,
        });
      }
    }

    const [product] = await db
      .insert(products)
      .values({
        businessId,
        name: body.name,
        sku: body.sku,
        barcode: body.barcode ?? null,
        unit: body.unit,
        pricePaisa: rupeesToPaisa(body.price),
        hsCode: body.hsCode ?? null,
        taxRateBp: body.taxRateBp ?? 1800,
      })
      .returning();

    return { product };
  });

  app.patch("/api/products/:id", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const { id } = request.params as { id: string };
    const body = productSchema.parse(request.body);

    if (body.barcode) {
      const [dup] = await db
        .select({ id: products.id, name: products.name })
        .from(products)
        .where(
          and(
            eq(products.businessId, businessId),
            eq(products.barcode, body.barcode),
            ne(products.id, id),
          ),
        )
        .limit(1);
      if (dup) {
        return reply.status(409).send({
          message: `A product with barcode "${body.barcode}" already exists: ${dup.name}`,
        });
      }
    }

    const [product] = await db
      .update(products)
      .set({
        name: body.name,
        sku: body.sku,
        barcode: body.barcode ?? null,
        unit: body.unit,
        pricePaisa: rupeesToPaisa(body.price),
        hsCode: body.hsCode ?? null,
        taxRateBp: body.taxRateBp ?? 1800,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, id), eq(products.businessId, businessId)))
      .returning();

    if (!product) {
      return reply.status(404).send({ message: "Product not found" });
    }
    return { product };
  });

  app.delete("/api/products/:id", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const { id } = request.params as { id: string };

    const [check] = await db
      .select({ count: invoiceItems.id })
      .from(invoiceItems)
      .where(and(eq(invoiceItems.productId, id)))
      .limit(1);
    if (check) {
      return reply.status(409).send({
        message: "Product is used by invoices and cannot be deleted",
      });
    }

    const [product] = await db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.businessId, businessId)))
      .returning({ id: products.id });

    if (!product) {
      return reply.status(404).send({ message: "Product not found" });
    }
    return { ok: true };
  });
}