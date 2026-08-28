import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const rootEnvPath = fileURLToPath(new URL("../../../../.env", import.meta.url));
dotenv.config({ path: rootEnvPath, quiet: true });
dotenv.config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;