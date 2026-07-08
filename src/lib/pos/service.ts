import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { slugify } from "@/lib/utils";
import { hashPin, verifyPinHash, isValidPinFormat } from "@/lib/pos/admin-pin";
import type {
  PosCartItem,
  PosCatalogDTO,
  PosCategoryDTO,
  PosCheckoutPayload,
  PosPaymentMethod,
  PosProductDTO,
  PosProductInput,
  PosReceiptSnapshot,
  PosReportDTO,
  PosReportPeriod,
  PosSettingsDTO,
  PosSettingsPatch,
  PosTransactionDetailDTO,
  PosTransactionFilters,
  PosTransactionListDTO,
  PosTransactionRowDTO,
} from "@/lib/pos/types";
import { POS_PAYMENT_METHODS } from "@/lib/pos/types";

/**
 * POS service layer. Every function takes `tenantId` as its first argument and
 * scopes every query to it — this is the tenant-isolation boundary. Prices are
 * always re-read from the database at checkout; the client never dictates
 * amounts. Money is stored in centavos and exposed to DTOs in pesos.
 */

type Db = PrismaClient | Prisma.TransactionClient;

const toCents = (pesos: number) => Math.round(pesos * 100);
const toPesos = (cents: number) => cents / 100;
const pad6 = (n: number) => String(n).padStart(6, "0");

const MANILA = "Asia/Manila";

type Ok<T = object> = { ok: true } & T;
type Err = { ok: false; reason: string };

// --- Audit -------------------------------------------------------------------

type PosAuditAction =
  | "POS_PRODUCT_CREATED"
  | "POS_PRODUCT_UPDATED"
  | "POS_PRODUCT_DELETED"
  | "POS_CATEGORY_CREATED"
  | "POS_CATEGORY_UPDATED"
  | "POS_CATEGORY_DELETED"
  | "POS_TRANSACTION_CREATED"
  | "POS_TRANSACTION_VOIDED"
  | "POS_TRANSACTION_REPRINTED"
  | "POS_SETTINGS_UPDATED"
  | "POS_PIN_CHANGED"
  | "POS_PIN_VERIFIED"
  | "POS_PIN_FAILED";

async function audit(
  db: Db,
  tenantId: string,
  userId: string | null,
  action: PosAuditAction,
  entityType: string,
  entityId: string,
  entityLabel?: string,
  metadata?: Prisma.InputJsonValue,
) {
  try {
    await db.auditLog.create({
      data: { tenantId, userId, action, entityType, entityId, entityLabel, metadata },
    });
  } catch {
    // Audit writes must never break the operation they describe.
  }
}

// --- Settings ----------------------------------------------------------------

const STARTER_CATEGORIES = [
  { name: "Drinks", color: "#C98A3C" },
  { name: "Food", color: "#E8B84B" },
  { name: "Merchandise", color: "#A6A6A4" },
  { name: "Other", color: "#5C5C5E" },
];

type SettingsRow = Prisma.POSSettingsGetPayload<object>;

/**
 * Returns the tenant's settings row, creating defaults (plus starter
 * categories) on first use so a new subscriber lands on a working register.
 */
export async function ensureSettings(tenantId: string): Promise<SettingsRow> {
  const prisma = getPrisma();
  const existing = await prisma.pOSSettings.findUnique({ where: { tenantId } });
  if (existing) return existing;

  const created = await prisma.pOSSettings
    .create({ data: { tenantId } })
    .catch(() => null); // concurrent first requests — someone else created it

  if (created) {
    const count = await prisma.pOSCategory.count({ where: { tenantId } });
    if (count === 0) {
      await prisma.pOSCategory.createMany({
        data: STARTER_CATEGORIES.map((c, i) => ({
          tenantId,
          name: c.name,
          slug: slugify(c.name),
          color: c.color,
          sortOrder: i + 1,
        })),
      });
    }
    return created;
  }
  return prisma.pOSSettings.findUniqueOrThrow({ where: { tenantId } });
}

async function settingsToDTO(
  tenantId: string,
  row: SettingsRow,
): Promise<PosSettingsDTO> {
  const prisma = getPrisma();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { businessName: true, name: true },
  });
  return {
    companyName: row.companyName ?? tenant?.businessName ?? tenant?.name ?? "My Business",
    address: row.address ?? "",
    contactNumber: row.contactNumber ?? "",
    logoUrl: row.logoUrl,
    headerMessage: row.headerMessage ?? "",
    footerMessage: row.footerMessage ?? "",
    thankYouMessage: row.thankYouMessage ?? "Thank you for your purchase!",
    vatEnabled: row.vatEnabled,
    vatRate: Math.round(row.vatRate * 10000) / 100, // fraction → percent
    vatInclusive: row.vatInclusive,
    pinRequired: row.pinRequired,
    pinSet: Boolean(row.pinHash),
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    theme: row.theme === "dark" ? "dark" : "light",
    cashierName: row.cashierName ?? "",
    defaultMethod: POS_PAYMENT_METHODS.includes(row.defaultMethod as PosPaymentMethod)
      ? (row.defaultMethod as PosPaymentMethod)
      : "Cash",
  };
}

export async function getSettings(tenantId: string): Promise<PosSettingsDTO> {
  const row = await ensureSettings(tenantId);
  return settingsToDTO(tenantId, row);
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const MAX_LOGO_LENGTH = 700_000; // ~500KB image as a data URL

export async function updateSettings(
  tenantId: string,
  userId: string | null,
  patch: PosSettingsPatch,
): Promise<Ok<{ settings: PosSettingsDTO }> | Err> {
  await ensureSettings(tenantId);
  const data: Prisma.POSSettingsUpdateInput = {};

  const text = (v: unknown, max = 300) =>
    typeof v === "string" ? v.trim().slice(0, max) || null : undefined;

  if ("companyName" in patch) data.companyName = text(patch.companyName, 120);
  if ("address" in patch) data.address = text(patch.address);
  if ("contactNumber" in patch) data.contactNumber = text(patch.contactNumber, 60);
  if ("headerMessage" in patch) data.headerMessage = text(patch.headerMessage);
  if ("footerMessage" in patch) data.footerMessage = text(patch.footerMessage);
  if ("thankYouMessage" in patch) data.thankYouMessage = text(patch.thankYouMessage);
  if ("cashierName" in patch) data.cashierName = text(patch.cashierName, 80);

  if ("logoUrl" in patch) {
    const logo = patch.logoUrl;
    if (logo != null && typeof logo !== "string") return { ok: false, reason: "Invalid logo" };
    if (logo && logo.length > MAX_LOGO_LENGTH)
      return { ok: false, reason: "Logo image is too large (max ~500KB)" };
    data.logoUrl = logo || null;
  }

  if (patch.vatEnabled !== undefined) data.vatEnabled = Boolean(patch.vatEnabled);
  if (patch.vatInclusive !== undefined) data.vatInclusive = Boolean(patch.vatInclusive);
  if (patch.vatRate !== undefined) {
    const rate = Number(patch.vatRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100)
      return { ok: false, reason: "VAT rate must be between 0 and 100" };
    data.vatRate = rate / 100;
  }

  if (patch.pinRequired !== undefined) data.pinRequired = Boolean(patch.pinRequired);

  if (patch.primaryColor !== undefined) {
    if (!HEX_COLOR.test(patch.primaryColor ?? "")) return { ok: false, reason: "Invalid primary color" };
    data.primaryColor = patch.primaryColor;
  }
  if (patch.secondaryColor !== undefined) {
    if (!HEX_COLOR.test(patch.secondaryColor ?? "")) return { ok: false, reason: "Invalid secondary color" };
    data.secondaryColor = patch.secondaryColor;
  }
  if (patch.theme !== undefined) {
    if (patch.theme !== "light" && patch.theme !== "dark")
      return { ok: false, reason: "Theme must be light or dark" };
    data.theme = patch.theme;
  }
  if (patch.defaultMethod !== undefined) {
    if (!POS_PAYMENT_METHODS.includes(patch.defaultMethod))
      return { ok: false, reason: "Invalid payment method" };
    data.defaultMethod = patch.defaultMethod;
  }

  const prisma = getPrisma();
  const row = await prisma.pOSSettings.update({ where: { tenantId }, data });
  await audit(prisma, tenantId, userId, "POS_SETTINGS_UPDATED", "pos-settings", row.id, "POS settings", {
    fields: Object.keys(data),
  });
  return { ok: true, settings: await settingsToDTO(tenantId, row) };
}

// --- Admin PIN ---------------------------------------------------------------

export async function verifyPin(
  tenantId: string,
  userId: string | null,
  pin: string,
): Promise<boolean> {
  const prisma = getPrisma();
  const settings = await ensureSettings(tenantId);
  const ok = Boolean(settings.pinHash) && verifyPinHash(pin, settings.pinHash!);
  await audit(
    prisma,
    tenantId,
    userId,
    ok ? "POS_PIN_VERIFIED" : "POS_PIN_FAILED",
    "pos-settings",
    settings.id,
    "Admin PIN",
  );
  return ok;
}

export async function changePin(
  tenantId: string,
  userId: string | null,
  opts: { currentPin?: string; newPin: string | null },
): Promise<Ok | Err> {
  const prisma = getPrisma();
  const settings = await ensureSettings(tenantId);

  if (settings.pinHash) {
    if (!opts.currentPin || !verifyPinHash(opts.currentPin, settings.pinHash)) {
      await audit(prisma, tenantId, userId, "POS_PIN_FAILED", "pos-settings", settings.id, "Admin PIN");
      return { ok: false, reason: "Current PIN is incorrect" };
    }
  }

  if (opts.newPin === null) {
    await prisma.pOSSettings.update({
      where: { tenantId },
      data: { pinHash: null, pinRequired: false },
    });
  } else {
    if (!isValidPinFormat(opts.newPin))
      return { ok: false, reason: "PIN must be 4–8 digits" };
    await prisma.pOSSettings.update({
      where: { tenantId },
      data: { pinHash: hashPin(opts.newPin), pinRequired: true },
    });
  }
  await audit(prisma, tenantId, userId, "POS_PIN_CHANGED", "pos-settings", settings.id, "Admin PIN", {
    removed: opts.newPin === null,
  });
  return { ok: true };
}

// --- Catalog -----------------------------------------------------------------

type ProductRow = Prisma.POSProductGetPayload<object>;

function productToDTO(p: ProductRow): PosProductDTO {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: toPesos(p.priceCents),
    imageUrl: p.imageUrl,
    categoryId: p.categoryId,
    available: p.available,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function listCatalog(tenantId: string): Promise<PosCatalogDTO> {
  const prisma = getPrisma();
  const [categories, products] = await Promise.all([
    prisma.pOSCategory.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { products: true } } },
    }),
    prisma.pOSProduct.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
  ]);
  return {
    categories: categories.map(
      (c): PosCategoryDTO => ({
        id: c.id,
        name: c.name,
        color: c.color,
        sortOrder: c.sortOrder,
        productCount: c._count.products,
      }),
    ),
    products: products.map(productToDTO),
  };
}

const MAX_IMAGE_LENGTH = 2_800_000; // ~2MB image as a data URL

function validateProductInput(input: PosProductInput): Err | null {
  if (!input.name?.trim()) return { ok: false, reason: "Product name is required" };
  const price = Number(input.price);
  if (!Number.isFinite(price) || price <= 0)
    return { ok: false, reason: "Price must be greater than zero" };
  if (input.imageUrl && input.imageUrl.length > MAX_IMAGE_LENGTH)
    return { ok: false, reason: "Product image is too large (max 2MB)" };
  return null;
}

export async function createProduct(
  tenantId: string,
  userId: string | null,
  input: PosProductInput,
): Promise<Ok<{ product: PosProductDTO }> | Err> {
  const invalid = validateProductInput(input);
  if (invalid) return invalid;
  const prisma = getPrisma();

  if (input.categoryId) {
    const cat = await prisma.pOSCategory.findFirst({
      where: { id: input.categoryId, tenantId },
    });
    if (!cat) return { ok: false, reason: "Category not found" };
  }

  const product = await prisma.pOSProduct.create({
    data: {
      tenantId,
      name: input.name.trim().slice(0, 160),
      sku: input.sku?.trim().slice(0, 60) || null,
      priceCents: toCents(Number(input.price)),
      imageUrl: input.imageUrl || null,
      categoryId: input.categoryId || null,
      available: input.available ?? true,
    },
  });
  await audit(prisma, tenantId, userId, "POS_PRODUCT_CREATED", "pos-product", product.id, product.name);
  return { ok: true, product: productToDTO(product) };
}

export async function updateProduct(
  tenantId: string,
  userId: string | null,
  id: string,
  input: Partial<PosProductInput>,
): Promise<Ok<{ product: PosProductDTO }> | Err> {
  const prisma = getPrisma();
  const existing = await prisma.pOSProduct.findFirst({ where: { id, tenantId } });
  if (!existing) return { ok: false, reason: "Product not found" };

  const data: Prisma.POSProductUpdateInput = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) return { ok: false, reason: "Product name is required" };
    data.name = input.name.trim().slice(0, 160);
  }
  if (input.sku !== undefined) data.sku = input.sku?.trim().slice(0, 60) || null;
  if (input.price !== undefined) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price <= 0)
      return { ok: false, reason: "Price must be greater than zero" };
    data.priceCents = toCents(price);
  }
  if (input.imageUrl !== undefined) {
    if (input.imageUrl && input.imageUrl.length > MAX_IMAGE_LENGTH)
      return { ok: false, reason: "Product image is too large (max 2MB)" };
    data.imageUrl = input.imageUrl || null;
  }
  if (input.categoryId !== undefined) {
    if (input.categoryId) {
      const cat = await prisma.pOSCategory.findFirst({
        where: { id: input.categoryId, tenantId },
      });
      if (!cat) return { ok: false, reason: "Category not found" };
      data.category = { connect: { id: input.categoryId } };
    } else {
      data.category = { disconnect: true };
    }
  }
  if (input.available !== undefined) data.available = Boolean(input.available);

  const product = await prisma.pOSProduct.update({ where: { id }, data });
  await audit(prisma, tenantId, userId, "POS_PRODUCT_UPDATED", "pos-product", product.id, product.name);
  return { ok: true, product: productToDTO(product) };
}

export async function deleteProduct(
  tenantId: string,
  userId: string | null,
  id: string,
): Promise<Ok | Err> {
  const prisma = getPrisma();
  const existing = await prisma.pOSProduct.findFirst({ where: { id, tenantId } });
  if (!existing) return { ok: false, reason: "Product not found" };
  // Historical transaction items keep their name/price snapshot; the FK just
  // nulls out.
  await prisma.pOSProduct.delete({ where: { id } });
  await audit(prisma, tenantId, userId, "POS_PRODUCT_DELETED", "pos-product", id, existing.name);
  return { ok: true };
}

export async function createCategory(
  tenantId: string,
  userId: string | null,
  input: { name: string; color?: string | null },
): Promise<Ok<{ category: PosCategoryDTO }> | Err> {
  const name = input.name?.trim().slice(0, 80);
  if (!name) return { ok: false, reason: "Category name is required" };
  const prisma = getPrisma();

  const base = slugify(name) || "category";
  let slug = base;
  for (let i = 2; i <= 20; i++) {
    const clash = await prisma.pOSCategory.findFirst({ where: { tenantId, slug } });
    if (!clash) break;
    slug = `${base}-${i}`;
  }

  const max = await prisma.pOSCategory.aggregate({
    where: { tenantId },
    _max: { sortOrder: true },
  });
  const category = await prisma.pOSCategory.create({
    data: {
      tenantId,
      name,
      slug,
      color: input.color && HEX_COLOR.test(input.color) ? input.color : "#C98A3C",
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
    include: { _count: { select: { products: true } } },
  });
  await audit(prisma, tenantId, userId, "POS_CATEGORY_CREATED", "pos-category", category.id, category.name);
  return {
    ok: true,
    category: {
      id: category.id,
      name: category.name,
      color: category.color,
      sortOrder: category.sortOrder,
      productCount: category._count.products,
    },
  };
}

export async function updateCategory(
  tenantId: string,
  userId: string | null,
  id: string,
  input: { name?: string; color?: string | null },
): Promise<Ok | Err> {
  const prisma = getPrisma();
  const existing = await prisma.pOSCategory.findFirst({ where: { id, tenantId } });
  if (!existing) return { ok: false, reason: "Category not found" };
  const data: Prisma.POSCategoryUpdateInput = {};
  if (input.name !== undefined) {
    const name = input.name.trim().slice(0, 80);
    if (!name) return { ok: false, reason: "Category name is required" };
    data.name = name;
  }
  if (input.color !== undefined)
    data.color = input.color && HEX_COLOR.test(input.color) ? input.color : existing.color;
  const category = await prisma.pOSCategory.update({ where: { id }, data });
  await audit(prisma, tenantId, userId, "POS_CATEGORY_UPDATED", "pos-category", id, category.name);
  return { ok: true };
}

export async function deleteCategory(
  tenantId: string,
  userId: string | null,
  id: string,
): Promise<Ok | Err> {
  const prisma = getPrisma();
  const existing = await prisma.pOSCategory.findFirst({ where: { id, tenantId } });
  if (!existing) return { ok: false, reason: "Category not found" };
  // Products in this category simply become uncategorised.
  await prisma.pOSProduct.updateMany({
    where: { tenantId, categoryId: id },
    data: { categoryId: null },
  });
  await prisma.pOSCategory.delete({ where: { id } });
  await audit(prisma, tenantId, userId, "POS_CATEGORY_DELETED", "pos-category", id, existing.name);
  return { ok: true };
}

// --- Cart --------------------------------------------------------------------

export async function getCart(tenantId: string): Promise<PosCartItem[]> {
  const prisma = getPrisma();
  const cart = await prisma.pOSCart.findUnique({ where: { tenantId } });
  const items = (cart?.items ?? []) as unknown;
  return Array.isArray(items) ? (items as PosCartItem[]) : [];
}

export async function saveCart(
  tenantId: string,
  items: PosCartItem[],
): Promise<Ok | Err> {
  if (!Array.isArray(items) || items.length > 100)
    return { ok: false, reason: "Invalid cart" };
  const clean: PosCartItem[] = items
    .filter((i) => i && typeof i.productId === "string")
    .map((i) => ({
      productId: i.productId,
      name: String(i.name ?? "").slice(0, 160),
      price: Number(i.price) || 0,
      qty: Math.max(1, Math.min(999, Math.round(Number(i.qty) || 1))),
      imageUrl: typeof i.imageUrl === "string" ? i.imageUrl : null,
    }));
  const prisma = getPrisma();
  await prisma.pOSCart.upsert({
    where: { tenantId },
    create: { tenantId, items: clean as unknown as Prisma.InputJsonValue },
    update: { items: clean as unknown as Prisma.InputJsonValue },
  });
  return { ok: true };
}

// --- Checkout ----------------------------------------------------------------

export interface CheckoutResult {
  transaction: PosTransactionDetailDTO;
  receipt: PosReceiptSnapshot;
}

export async function checkout(
  tenantId: string,
  userId: string | null,
  fallbackCashier: string,
  payload: PosCheckoutPayload,
): Promise<Ok<CheckoutResult> | Err> {
  if (!payload?.items?.length) return { ok: false, reason: "Cart is empty" };
  if (payload.items.length > 100) return { ok: false, reason: "Too many items" };
  if (!POS_PAYMENT_METHODS.includes(payload.method))
    return { ok: false, reason: "Invalid payment method" };

  const qtyById = new Map<string, number>();
  for (const item of payload.items) {
    const qty = Math.round(Number(item.qty));
    if (!item.productId || !Number.isFinite(qty) || qty < 1 || qty > 999)
      return { ok: false, reason: "Invalid item quantity" };
    qtyById.set(item.productId, (qtyById.get(item.productId) ?? 0) + qty);
  }

  const prisma = getPrisma();
  const settings = await ensureSettings(tenantId);

  // Server-side prices — the client only ever sends product ids + quantities.
  const products = await prisma.pOSProduct.findMany({
    where: { tenantId, id: { in: [...qtyById.keys()] }, available: true },
  });
  if (products.length !== qtyById.size)
    return { ok: false, reason: "Some products are no longer available. Refresh and try again." };

  const lines = products.map((p) => {
    const qty = qtyById.get(p.id)!;
    return {
      productId: p.id,
      name: p.name,
      priceCents: p.priceCents,
      qty,
      lineTotalCents: p.priceCents * qty,
    };
  });
  const subtotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);

  // Discount
  let discountCents = 0;
  if (payload.discountValue != null && payload.discountValue > 0) {
    const value = Number(payload.discountValue);
    if (!Number.isFinite(value) || value < 0)
      return { ok: false, reason: "Invalid discount" };
    if (payload.discountType === "percent") {
      if (value > 100) return { ok: false, reason: "Discount cannot exceed 100%" };
      discountCents = Math.round((subtotalCents * value) / 100);
    } else {
      discountCents = Math.min(subtotalCents, toCents(value));
    }
  }
  const netCents = subtotalCents - discountCents;

  // VAT — inclusive extracts the tax share from the price, exclusive adds it.
  const rate = settings.vatEnabled ? settings.vatRate : 0;
  const taxCents =
    rate <= 0
      ? 0
      : settings.vatInclusive
        ? Math.round((netCents * rate) / (1 + rate))
        : Math.round(netCents * rate);
  const totalCents = settings.vatInclusive ? netCents : netCents + taxCents;

  // Cash handling
  let cashCents: number | null = null;
  let changeCents: number | null = null;
  if (payload.method === "Cash") {
    cashCents = toCents(Number(payload.cashReceived ?? 0));
    if (!Number.isFinite(cashCents) || cashCents < totalCents)
      return { ok: false, reason: "Cash received is less than the total" };
    changeCents = cashCents - totalCents;
  }

  const cashier =
    (settings.cashierName?.trim() || fallbackCashier || "Cashier").slice(0, 80);
  const customer = payload.customer?.trim().slice(0, 120) || null;
  const notes = payload.notes?.trim().slice(0, 500) || null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { businessName: true, name: true },
  });
  const businessName =
    settings.companyName ?? tenant?.businessName ?? tenant?.name ?? "My Business";

  const result = await prisma.$transaction(async (tx) => {
    // Atomic per-tenant counter → collision-free receipt + transaction numbers.
    const bumped = await tx.pOSSettings.update({
      where: { tenantId },
      data: { receiptCounter: { increment: 1 } },
      select: { receiptCounter: true },
    });
    const n = bumped.receiptCounter;
    const ref = `TXN-${pad6(n)}`;
    const receiptNo = `OR-${pad6(n)}`;
    const completedAt = new Date();

    const txn = await tx.pOSTransaction.create({
      data: {
        tenantId,
        ref,
        subtotalCents,
        discountCents,
        taxCents,
        totalCents,
        cashCents,
        changeCents,
        method: payload.method,
        status: "COMPLETED",
        customer,
        notes,
        cashier,
        completedAt,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            name: l.name,
            priceCents: l.priceCents,
            qty: l.qty,
          })),
        },
      },
    });

    const snapshot: PosReceiptSnapshot = {
      receiptNo,
      ref,
      business: {
        name: businessName,
        address: settings.address,
        contactNumber: settings.contactNumber,
        logoUrl: settings.logoUrl,
      },
      headerMessage: settings.headerMessage,
      footerMessage: settings.footerMessage,
      thankYouMessage: settings.thankYouMessage ?? "Thank you for your purchase!",
      cashier,
      customer,
      completedAt: completedAt.toISOString(),
      lines: lines.map((l) => ({
        name: l.name,
        qty: l.qty,
        price: toPesos(l.priceCents),
        lineTotal: toPesos(l.lineTotalCents),
      })),
      subtotal: toPesos(subtotalCents),
      discount: toPesos(discountCents),
      tax:
        rate > 0
          ? {
              label: `VAT (${Math.round(rate * 10000) / 100}%)`,
              amount: toPesos(taxCents),
              included: settings.vatInclusive,
            }
          : null,
      total: toPesos(totalCents),
      method: payload.method,
      cashReceived: cashCents != null ? toPesos(cashCents) : null,
      change: changeCents != null ? toPesos(changeCents) : null,
    };

    await tx.pOSReceipt.create({
      data: {
        tenantId,
        transactionId: txn.id,
        receiptNo,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });

    // A completed checkout consumes the live cart.
    await tx.pOSCart.deleteMany({ where: { tenantId } });

    await audit(tx, tenantId, userId, "POS_TRANSACTION_CREATED", "pos-transaction", txn.id, ref, {
      total: toPesos(totalCents),
      method: payload.method,
      items: lines.length,
    });

    return { txn, snapshot };
  });

  const detail = await getTransaction(tenantId, result.txn.id);
  if (!detail) return { ok: false, reason: "Transaction not found after checkout" };
  return { ok: true, transaction: detail, receipt: result.snapshot };
}

// --- Transactions ------------------------------------------------------------

type TxnWithMeta = Prisma.POSTransactionGetPayload<{
  include: {
    items: true;
    receipt: { select: { receiptNo: true; snapshot: true } };
  };
}>;

function txnToRow(t: TxnWithMeta): PosTransactionRowDTO {
  return {
    id: t.id,
    ref: t.ref,
    receiptNo: t.receipt?.receiptNo ?? null,
    completedAt: t.completedAt.toISOString(),
    cashier: t.cashier,
    customer: t.customer,
    method: t.method as PosPaymentMethod,
    status: t.status,
    total: toPesos(t.totalCents),
    change: t.changeCents != null ? toPesos(t.changeCents) : null,
    itemCount: t.items.reduce((s, i) => s + i.qty, 0),
  };
}

function txnToDetail(t: TxnWithMeta): PosTransactionDetailDTO {
  return {
    ...txnToRow(t),
    subtotal: toPesos(t.subtotalCents),
    discount: toPesos(t.discountCents),
    tax: toPesos(t.taxCents),
    cashReceived: t.cashCents != null ? toPesos(t.cashCents) : null,
    notes: t.notes,
    voidedAt: t.voidedAt?.toISOString() ?? null,
    voidReason: t.voidReason,
    items: t.items.map((i) => ({
      name: i.name,
      qty: i.qty,
      price: toPesos(i.priceCents),
      lineTotal: toPesos(i.priceCents * i.qty),
    })),
    receipt: (t.receipt?.snapshot as unknown as PosReceiptSnapshot) ?? null,
  };
}

export async function listTransactions(
  tenantId: string,
  filters: PosTransactionFilters,
): Promise<PosTransactionListDTO> {
  const prisma = getPrisma();
  const where: Prisma.POSTransactionWhereInput = { tenantId };

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { ref: { contains: q, mode: "insensitive" } },
      { customer: { contains: q, mode: "insensitive" } },
      { cashier: { contains: q, mode: "insensitive" } },
      { items: { some: { name: { contains: q, mode: "insensitive" } } } },
      { receipt: { is: { receiptNo: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (filters.status && filters.status !== "all") where.status = filters.status;
  if (filters.method && filters.method !== "all") where.method = filters.method;
  if (filters.from || filters.to) {
    where.completedAt = {};
    if (filters.from) where.completedAt.gte = new Date(filters.from);
    if (filters.to) where.completedAt.lte = new Date(filters.to);
  }
  if (filters.minTotal != null || filters.maxTotal != null) {
    where.totalCents = {};
    if (filters.minTotal != null) where.totalCents.gte = toCents(filters.minTotal);
    if (filters.maxTotal != null) where.totalCents.lte = toCents(filters.maxTotal);
  }

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const offset = Math.max(filters.offset ?? 0, 0);
  const orderBy: Prisma.POSTransactionOrderByWithRelationInput =
    filters.sort === "oldest"
      ? { completedAt: "asc" }
      : filters.sort === "highest"
        ? { totalCents: "desc" }
        : filters.sort === "lowest"
          ? { totalCents: "asc" }
          : { completedAt: "desc" };

  const [rows, total, sum] = await Promise.all([
    prisma.pOSTransaction.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: {
        items: true,
        receipt: { select: { receiptNo: true, snapshot: true } },
      },
    }),
    prisma.pOSTransaction.count({ where }),
    prisma.pOSTransaction.aggregate({
      where: { ...where, status: "COMPLETED" },
      _sum: { totalCents: true },
    }),
  ]);

  return {
    rows: rows.map(txnToRow),
    total,
    revenue: toPesos(sum._sum.totalCents ?? 0),
  };
}

export async function getTransaction(
  tenantId: string,
  id: string,
): Promise<PosTransactionDetailDTO | null> {
  const prisma = getPrisma();
  const txn = await prisma.pOSTransaction.findFirst({
    where: { id, tenantId },
    include: {
      items: true,
      receipt: { select: { receiptNo: true, snapshot: true } },
    },
  });
  return txn ? txnToDetail(txn) : null;
}

export async function voidTransaction(
  tenantId: string,
  userId: string | null,
  id: string,
  reason?: string,
): Promise<Ok | Err> {
  const prisma = getPrisma();
  const txn = await prisma.pOSTransaction.findFirst({ where: { id, tenantId } });
  if (!txn) return { ok: false, reason: "Transaction not found" };
  if (txn.status !== "COMPLETED")
    return { ok: false, reason: `Transaction is already ${txn.status.toLowerCase()}` };
  await prisma.pOSTransaction.update({
    where: { id },
    data: {
      status: "VOIDED",
      voidedAt: new Date(),
      voidReason: reason?.trim().slice(0, 300) || null,
    },
  });
  await audit(prisma, tenantId, userId, "POS_TRANSACTION_VOIDED", "pos-transaction", id, txn.ref, {
    reason: reason ?? null,
  });
  return { ok: true };
}

export async function reprintReceipt(
  tenantId: string,
  userId: string | null,
  transactionId: string,
): Promise<Ok<{ receipt: PosReceiptSnapshot }> | Err> {
  const prisma = getPrisma();
  const receipt = await prisma.pOSReceipt.findFirst({
    where: { transactionId, tenantId },
  });
  if (!receipt) return { ok: false, reason: "Receipt not found" };
  await prisma.pOSReceipt.update({
    where: { id: receipt.id },
    data: { printCount: { increment: 1 }, lastPrintedAt: new Date() },
  });
  await audit(
    prisma,
    tenantId,
    userId,
    "POS_TRANSACTION_REPRINTED",
    "pos-receipt",
    receipt.id,
    receipt.receiptNo,
  );
  return { ok: true, receipt: receipt.snapshot as unknown as PosReceiptSnapshot };
}

// --- Reports -----------------------------------------------------------------

const manilaDay = (d: Date) =>
  d.toLocaleDateString("en-CA", { timeZone: MANILA }); // YYYY-MM-DD

const manilaHour = (d: Date) =>
  Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: MANILA,
      hour: "numeric",
      hourCycle: "h23",
    }).format(d),
  );

export async function buildReport(
  tenantId: string,
  userId: string | null,
  period: PosReportPeriod,
  from: Date,
  to: Date,
): Promise<PosReportDTO> {
  const prisma = getPrisma();
  const [txns, voidedCount, categories] = await Promise.all([
    prisma.pOSTransaction.findMany({
      where: {
        tenantId,
        status: "COMPLETED",
        completedAt: { gte: from, lte: to },
      },
      include: {
        items: { include: { product: { select: { categoryId: true } } } },
      },
      orderBy: { completedAt: "asc" },
    }),
    prisma.pOSTransaction.count({
      where: { tenantId, status: "VOIDED", completedAt: { gte: from, lte: to } },
    }),
    prisma.pOSCategory.findMany({ where: { tenantId } }),
  ]);

  const catById = new Map(categories.map((c) => [c.id, c]));

  let revenueCents = 0;
  let itemsSold = 0;
  const byProduct = new Map<string, { qty: number; revenueCents: number }>();
  const byCategory = new Map<string, { qty: number; revenueCents: number }>();
  const byHour = new Map<number, { count: number; revenueCents: number }>();
  const byMethod = new Map<string, { count: number; revenueCents: number }>();
  const byDay = new Map<string, { revenueCents: number; count: number }>();

  for (const t of txns) {
    revenueCents += t.totalCents;

    const hour = manilaHour(t.completedAt);
    const h = byHour.get(hour) ?? { count: 0, revenueCents: 0 };
    h.count += 1;
    h.revenueCents += t.totalCents;
    byHour.set(hour, h);

    const m = byMethod.get(t.method) ?? { count: 0, revenueCents: 0 };
    m.count += 1;
    m.revenueCents += t.totalCents;
    byMethod.set(t.method, m);

    const day = manilaDay(t.completedAt);
    const d = byDay.get(day) ?? { revenueCents: 0, count: 0 };
    d.revenueCents += t.totalCents;
    d.count += 1;
    byDay.set(day, d);

    for (const item of t.items) {
      itemsSold += item.qty;
      const lineCents = item.priceCents * item.qty;

      const p = byProduct.get(item.name) ?? { qty: 0, revenueCents: 0 };
      p.qty += item.qty;
      p.revenueCents += lineCents;
      byProduct.set(item.name, p);

      const categoryId = item.product?.categoryId ?? null;
      const key = categoryId ?? "__uncategorised__";
      const c = byCategory.get(key) ?? { qty: 0, revenueCents: 0 };
      c.qty += item.qty;
      c.revenueCents += lineCents;
      byCategory.set(key, c);
    }
  }

  const report: PosReportDTO = {
    period,
    rangeFrom: from.toISOString(),
    rangeTo: to.toISOString(),
    revenue: toPesos(revenueCents),
    transactionCount: txns.length,
    averageSale: txns.length ? toPesos(Math.round(revenueCents / txns.length)) : 0,
    itemsSold,
    voidedCount,
    bestSellers: [...byProduct.entries()]
      .map(([name, v]) => ({ name, qty: v.qty, revenue: toPesos(v.revenueCents) }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8),
    topCategories: [...byCategory.entries()]
      .map(([key, v]) => {
        const cat = catById.get(key);
        return {
          name: cat?.name ?? "Uncategorised",
          color: cat?.color ?? null,
          qty: v.qty,
          revenue: toPesos(v.revenueCents),
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6),
    peakHours: [...byHour.entries()]
      .map(([hour, v]) => ({ hour, count: v.count, revenue: toPesos(v.revenueCents) }))
      .sort((a, b) => a.hour - b.hour),
    methodBreakdown: [...byMethod.entries()]
      .map(([method, v]) => ({ method, count: v.count, revenue: toPesos(v.revenueCents) }))
      .sort((a, b) => b.revenue - a.revenue),
    dailyTrend: [...byDay.entries()]
      .map(([day, v]) => ({ day, revenue: toPesos(v.revenueCents), count: v.count }))
      .sort((a, b) => a.day.localeCompare(b.day)),
  };

  await prisma.pOSReport
    .create({
      data: {
        tenantId,
        userId,
        kind: "DAILY_SALES",
        rangeFrom: from,
        rangeTo: to,
        filters: { period },
        rowCount: txns.length,
        totalCents: revenueCents,
      },
    })
    .catch(() => null);

  return report;
}

/** Audit row for a report download (CSV / XLS / PDF). */
export async function logReportExport(
  tenantId: string,
  userId: string | null,
  format: string,
  from: Date,
  to: Date,
  filename: string,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.pOSReport
    .create({
      data: {
        tenantId,
        userId,
        kind: "EXPORT_CSV",
        rangeFrom: from,
        rangeTo: to,
        filters: { format },
        exportedFile: filename,
      },
    })
    .catch(() => null);
}
