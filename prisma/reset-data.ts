/**
 * DANGER: wipes ALL tenant/customer data, leaving only the super-admin account.
 * Use to return the database to a fresh state (no demo data, no test subscribers).
 *
 * Keeps: the admin tenant (`tenant_admin`), the admin user, and ServicePricing
 * (platform config). Removes: every other tenant + user and all their data
 * (products, sales, expenses, POS, attendance, subscriptions, payments, logs…).
 *
 * Run with: pnpm exec tsx prisma/reset-data.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DATABASE_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const ADMIN_TENANT_ID = "tenant_admin";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@solarisdiamond.com";

// All customer/tenant data tables. CASCADE handles inter-table FKs (e.g.
// InventoryTransaction → Product RESTRICT) by truncating together.
const DATA_TABLES = [
  "StockLedgerEntry",
  "InventoryTransaction",
  "Product",
  "ProductCategory",
  "SaleItem",
  "Sale",
  "SalesSnapshot",
  "SalesReport",
  "POSTransactionItem",
  "POSTransaction",
  "POSReport",
  "POSProduct",
  "POSCategory",
  "POSSettings",
  "Expense",
  "ExpenseReport",
  "ExpenseCategory",
  "AttendanceLog",
  "LoginEvent",
  "Device",
  "Payment",
  "Invoice",
  "Subscription",
  "Notification",
  "AuditLog",
  "SystemLog",
];

async function main() {
  if (!DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const adapter = new PrismaPg({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter });

  const [tenantsBefore, usersBefore, subsBefore] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.subscription.count(),
  ]);
  console.log(
    `Before — tenants: ${tenantsBefore}, users: ${usersBefore}, subscriptions: ${subsBefore}`,
  );

  // Wipe every data table.
  const list = DATA_TABLES.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`,
  );
  console.log(`✓ Truncated ${DATA_TABLES.length} data tables`);

  // Remove every tenant except the admin (cascades to their users).
  const delTenants = await prisma.tenant.deleteMany({
    where: { id: { not: ADMIN_TENANT_ID } },
  });
  // Safety net: any user that isn't the admin.
  const delUsers = await prisma.user.deleteMany({
    where: { email: { not: ADMIN_EMAIL } },
  });
  console.log(
    `✓ Removed ${delTenants.count} tenant(s) and ${delUsers.count} stray user(s)`,
  );

  const [tenantsAfter, usersAfter] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
  ]);
  console.log(
    `After — tenants: ${tenantsAfter}, users: ${usersAfter} (admin only) ✓`,
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
