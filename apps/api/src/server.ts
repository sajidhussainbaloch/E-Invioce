import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const app = await buildApp();

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}