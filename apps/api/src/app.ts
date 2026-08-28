import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import healthRoutes from "./routes/health.js";
import versionRoutes from "./routes/version.js";
import testDbRoutes from "./routes/test-db.js";
import { authRoutes } from "./modules/auth/routes.js";
import { businessRoutes } from "./modules/business/routes.js";
import { pdfRoutes } from "./modules/pdf/routes.js";
import { dashboardRoutes } from "./modules/dashboard/routes.js";
import { customerRoutes } from "./modules/customers/routes.js";
import { productRoutes } from "./modules/products/routes.js";
import { invoiceRoutes } from "./modules/invoices/routes.js";
import { fbrRoutes } from "./modules/fbr/routes.js";
import { reportsRoutes } from "./modules/reports/routes.js";
import { resolveSession } from "./modules/auth/service.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);
  await app.register(multipart);

  app.addHook("onRequest", async (request) => {
    await resolveSession(request);
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: "Validation failed",
        issues: error.flatten().fieldErrors,
      });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return reply.status(401).send({ message: "Unauthorized" });
    }
    if (error instanceof Error && error.message === "Business not setup") {
      return reply.status(403).send({ message: "Business not setup" });
    }
    request.log.error(error);
    return reply.status(500).send({ message: "Internal server error" });
  });

  await app.register(healthRoutes);
  await app.register(versionRoutes);
  await app.register(testDbRoutes);
  await app.register(authRoutes);
  await app.register(businessRoutes);
  await app.register(pdfRoutes);
  await app.register(dashboardRoutes);
  await app.register(customerRoutes);
  await app.register(productRoutes);
  await app.register(invoiceRoutes);
  await app.register(fbrRoutes);
  await app.register(reportsRoutes);

  return app;
}