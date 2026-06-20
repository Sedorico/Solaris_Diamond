import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/lib/env";

/**
 * Prisma 7 client singleton using the node-postgres driver adapter.
 * DATABASE_URL is required — the app does not run without a database.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is required. Set it in your .env file.");
  }

  // Supabase's pooler presents a certificate node-postgres won't verify by
  // default, so enable SSL without strict verification (matches `sslmode=require`).
  const adapter = new PrismaPg({
    connectionString: env.databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}
