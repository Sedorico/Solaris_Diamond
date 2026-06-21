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
  //
  // Supabase's session pooler caps TOTAL connections (pool_size 15). node-postgres
  // defaults to 10 per pool, so local dev + each serverless instance can exhaust
  // it. Keep each client's pool small and release idle connections quickly so the
  // shared limit isn't hit.
  const adapter = new PrismaPg({
    connectionString: env.databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}
