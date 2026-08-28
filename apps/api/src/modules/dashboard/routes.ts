import { count, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { businesses } from "../../db/schema.js";
import { db } from "../../db/index.js";
import { requireBusiness } from "../auth/service.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", { preHandler: requireBusiness }, async (request) => {
    const businessId = request.auth!.businessId!;
    const [businessCount] = await db
      .select({ count: count() })
      .from(businesses)
      .where(eq(businesses.id, businessId));

    return {
      business: businessCount.count > 0 ? request.auth!.business : null,
      invoices: 0,
      customers: 0,
      products: 0,
      salesToday: 0,
      fbrConnected: false,
      lastFbrSubmission: null,
      generatedAt: new Date().toISOString(),
    };
  });
}