import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 configuration. The connection URL lives here (and in the runtime
 * driver adapter) rather than in schema.prisma.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations / CLI use the direct (session-pooler) connection. The
    // transaction pooler used at runtime can't run DDL or advisory locks.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
