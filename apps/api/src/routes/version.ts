import type { FastifyInstance } from "fastify";

export default async function versionRoutes(app: FastifyInstance) {
  app.get("/api/version", async () => ({ version: "0.1.0" }));
}