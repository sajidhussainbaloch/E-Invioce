import type { FastifyInstance } from "fastify";
import { client } from "../db/index.js";

export default async function testDbRoutes(app: FastifyInstance) {
  app.get("/api/test-db", async (_request, reply) => {
    try {
      await client`select 1`;
      return { database: "connected" };
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({
        database: "error",
        detail: err instanceof Error ? err.message : "unknown error",
      });
    }
  });
}