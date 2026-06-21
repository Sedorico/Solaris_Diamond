/**
 * Database seed — creates the default super-admin tenant and user.
 * The admin's Supabase auth account must be created separately via the
 * Supabase dashboard or CLI. This seed only creates the Prisma User record
 * that mirrors it.
 *
 * Run with: pnpm db:seed   (requires DATABASE_URL)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DATABASE_URL = process.env.DATABASE_URL;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@solarisdiamond.com";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "System Administrator";
const ADMIN_AUTH_ID = process.env.ADMIN_AUTH_ID;

async function main() {
  if (!DATABASE_URL) {
    console.error("DATABASE_URL is required. Set it in your .env file.");
    process.exit(1);
  }

  const adapter = new PrismaPg({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter });

  const adminTenant = await prisma.tenant.upsert({
    where: { id: "tenant_admin" },
    update: {},
    create: {
      id: "tenant_admin",
      name: "Solaris Diamond",
      businessName: "Solaris Diamond Inc.",
    },
  });

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      role: "SUPERADMIN",
      emailVerified: true,
      status: "ACTIVE",
      ...(ADMIN_AUTH_ID ? { authId: ADMIN_AUTH_ID } : {}),
    },
    create: {
      tenantId: adminTenant.id,
      fullName: ADMIN_NAME,
      email: ADMIN_EMAIL,
      role: "SUPERADMIN",
      status: "ACTIVE",
      emailVerified: true,
      ...(ADMIN_AUTH_ID ? { authId: ADMIN_AUTH_ID } : {}),
    },
  });
  console.log(`✓ Seeded super-admin: ${ADMIN_EMAIL}`);
  if (!ADMIN_AUTH_ID) {
    console.log(
      "  ⚠ No ADMIN_AUTH_ID set. Create the admin user in Supabase Auth and set ADMIN_AUTH_ID to link them.",
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
