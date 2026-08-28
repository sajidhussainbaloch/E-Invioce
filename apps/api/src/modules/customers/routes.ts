import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { customerSchema } from "@invoice-bank/validation";
import { customers, invoices } from "../../db/schema.js";
import { db } from "../../db/index.js";
import { requireBusiness } from "../auth/service.js";

export async function customerRoutes(app: FastifyInstance) {
  app.get("/api/customers", { preHandler: requireBusiness }, async (request) => {
    const businessId = request.auth!.businessId!;
    const query = request.query as { q?: string };
    const q = query.q?.trim();

    const rows = await db
      .select()
      .from(customers)
      .where(
        q
          ? and(
              eq(customers.businessId, businessId),
              or(
                ilike(customers.name, `%${q}%`),
                ilike(customers.email, `%${q}%`),
                ilike(customers.phone, `%${q}%`),
                ilike(customers.ntn, `%${q}%`),
              ),
            )
          : eq(customers.businessId, businessId),
      )
      .orderBy(desc(customers.createdAt))
      .limit(200);

    return { customers: rows };
  });

  app.post("/api/customers", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const body = customerSchema.parse(request.body);

    const [customer] = await db
      .insert(customers)
      .values({
        businessId,
        name: body.name,
        ntn: body.ntn ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        address: body.address ?? null,
        notes: body.notes ?? null,
      })
      .returning();

    return { customer };
  });

  app.patch("/api/customers/:id", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const { id } = request.params as { id: string };
    const body = customerSchema.parse(request.body);

    const [customer] = await db
      .update(customers)
      .set({
        name: body.name,
        ntn: body.ntn ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        address: body.address ?? null,
        notes: body.notes ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(customers.id, id), eq(customers.businessId, businessId)))
      .returning();

    if (!customer) {
      return reply.status(404).send({ message: "Customer not found" });
    }
    return { customer };
  });

  app.delete("/api/customers/:id", { preHandler: requireBusiness }, async (request, reply) => {
    const businessId = request.auth!.businessId!;
    const { id } = request.params as { id: string };

    const [check] = await db
      .select({ count: invoices.customerId })
      .from(invoices)
      .where(and(eq(invoices.customerId, id), eq(invoices.businessId, businessId)))
      .limit(1);
    if (check) {
      return reply.status(409).send({
        message: "Customer is used by invoices and cannot be deleted",
      });
    }

    const [customer] = await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.businessId, businessId)))
      .returning({ id: customers.id });

    if (!customer) {
      return reply.status(404).send({ message: "Customer not found" });
    }
    return { ok: true };
  });
}