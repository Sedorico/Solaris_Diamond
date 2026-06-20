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

  const demo = await prisma.tenant.upsert({
    where: { id: "tenant_demo" },
    update: {},
    create: {
      id: "tenant_demo",
      name: "Aurora Retail",
      businessName: "Aurora Retail",
    },
  });

  await prisma.user.upsert({
    where: { email: "maria@aurora.ph" },
    update: {},
    create: {
      tenantId: demo.id,
      fullName: "Maria Santos",
      email: "maria@aurora.ph",
      role: "OWNER",
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  const beverages = await prisma.productCategory.upsert({
    where: { tenantId_slug: { tenantId: demo.id, slug: "beverages" } },
    update: {},
    create: {
      tenantId: demo.id,
      name: "Beverages",
      slug: "beverages",
      color: "#C98A3C",
    },
  });
  const coffee = await prisma.productCategory.upsert({
    where: { tenantId_slug: { tenantId: demo.id, slug: "coffee" } },
    update: {},
    create: {
      tenantId: demo.id,
      name: "Coffee",
      slug: "coffee",
      color: "#7A4422",
    },
  });

  const products = [
    {
      name: "Artisan Cold Brew 1L",
      sku: "BEV-CB-1L",
      categoryId: beverages.id,
      priceCents: 22000,
      costCents: 9500,
      onHand: 48,
    },
    {
      name: "Single-Origin Beans 250g",
      sku: "COF-SO-250",
      categoryId: coffee.id,
      priceCents: 48000,
      costCents: 24000,
      onHand: 12,
    },
  ];
  for (const p of products) {
    await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: demo.id, sku: p.sku } },
      update: {},
      create: { ...p, tenantId: demo.id, reorderPoint: 15, reorderQty: 30 },
    });
  }
  console.log(`✓ Seeded demo tenant with ${products.length} products`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
