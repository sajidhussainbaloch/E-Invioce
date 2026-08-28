import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
dotenv.config({ path: `${repoRoot}.env`, quiet: true });
dotenv.config({ path: "../../.env", quiet: true });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});