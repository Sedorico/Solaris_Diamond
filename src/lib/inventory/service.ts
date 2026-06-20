import "server-only";
import {
  AuditAction,
  type Prisma,
  ProductStatus,
  TransactionType,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/db/prisma";

/**
 * Inventory service — the production-ready, multi-tenant, ERPNext-inspired
 * core of the Inventory module.
 *
 * Two invariants every caller relies on:
 *
 *  1. **Tenant isolation.** Every public function takes a `tenantId` and the
 *     read/write paths filter by it. The application is the first line of
 *     defence; database Row-Level Security policies enforce it at the
 *     storage layer too (see future migration).
 *
 *  2. **Atomic, auditable stock movements.** A stock change is *one* logical
 *     operation that always writes four rows together inside a single Prisma
 *     transaction:
 *
 *         InventoryTransaction → why/who/what (mutable metadata)
 *         StockLedgerEntry     → immutable signed qty + balanceAfter
 *         Product.onHand       → cached aggregate (kept in sync)
 *         AuditLog             → tamper-evident timeline
 *
 *     If any of those four fail, the whole change is rolled back. This is the
 *     same invariant ERPNext enforces via its Stock Ledger.
 */

type Tx = Prisma.TransactionClient;

interface BaseContext {
  tenantId: string;
  userId?: string | null;
}

/** Thrown when an operation can't proceed (insufficient stock, archived product, etc.). */
export class InventoryError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "InventoryError";
  }
}

function requirePrisma(): PrismaClient {
  const prisma = getPrisma();
  if (!prisma) {
    throw new InventoryError(
      "NO_DATABASE",
      "Inventory service requires a configured DATABASE_URL.",
    );
  }
  return prisma;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export interface CategoryInput {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  parentId?: string | null;
}

const slugify = (input: string) =>
  input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
  "category";

export async function createCategory(ctx: BaseContext, input: CategoryInput) {
  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    const slug = input.slug ?? slugify(input.name);
    const category = await tx.productCategory.create({
      data: {
        tenantId: ctx.tenantId,
        name: input.name,
        slug,
        description: input.description,
        color: input.color,
        parentId: input.parentId ?? null,
      },
    });
    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? null,
      action: AuditAction.CATEGORY_CREATED,
      entityType: "category",
      entityId: category.id,
      entityLabel: category.name,
    });
    return category;
  });
}

export async function updateCategory(
  ctx: BaseContext,
  id: string,
  patch: Partial<CategoryInput>,
) {
  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    const before = await tx.productCategory.findFirstOrThrow({
      where: { id, tenantId: ctx.tenantId },
    });
    const after = await tx.productCategory.update({
      where: { id },
      data: {
        name: patch.name ?? before.name,
        slug: patch.slug ?? (patch.name ? slugify(patch.name) : before.slug),
        description: patch.description ?? before.description,
        color: patch.color ?? before.color,
        parentId: patch.parentId === undefined ? before.parentId : patch.parentId,
      },
    });
    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? null,
      action: AuditAction.CATEGORY_UPDATED,
      entityType: "category",
      entityId: id,
      entityLabel: after.name,
      diff: { before, after },
    });
    return after;
  });
}

export async function deleteCategory(ctx: BaseContext, id: string) {
  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    const cat = await tx.productCategory.findFirstOrThrow({
      where: { id, tenantId: ctx.tenantId },
      include: { _count: { select: { products: true } } },
    });
    if (cat._count.products > 0) {
      throw new InventoryError(
        "CATEGORY_IN_USE",
        `Category "${cat.name}" still has ${cat._count.products} product(s). Move or archive them first.`,
      );
    }
    await tx.productCategory.delete({ where: { id } });
    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? null,
      action: AuditAction.CATEGORY_DELETED,
      entityType: "category",
      entityId: id,
      entityLabel: cat.name,
    });
  });
}

export async function listCategories(tenantId: string) {
  const prisma = requirePrisma();
  return prisma.productCategory.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface ProductInput {
  sku: string;
  name: string;
  description?: string;
  imageUrl?: string;
  unitOfMeasure?: string;
  categoryId?: string | null;
  reorderPoint?: number;
  reorderQty?: number;
  costCents?: number;
  priceCents?: number;
  /** Opening stock — written via a STOCK_IN ledger entry if > 0. */
  openingStock?: number;
}

export async function createProduct(ctx: BaseContext, input: ProductInput) {
  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        tenantId: ctx.tenantId,
        sku: input.sku,
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
        unitOfMeasure: input.unitOfMeasure ?? "pc",
        categoryId: input.categoryId ?? null,
        reorderPoint: input.reorderPoint ?? 10,
        reorderQty: input.reorderQty ?? 20,
        costCents: input.costCents ?? 0,
        priceCents: input.priceCents ?? 0,
        onHand: 0,
      },
    });
    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? null,
      action: AuditAction.PRODUCT_CREATED,
      entityType: "product",
      entityId: product.id,
      entityLabel: product.name,
    });

    // Opening stock as a ledger-backed STOCK_IN so on-hand stays auditable.
    if (input.openingStock && input.openingStock > 0) {
      await postStockChange(tx, ctx, {
        productId: product.id,
        type: TransactionType.STOCK_IN,
        quantity: input.openingStock,
        unitCostCents: product.costCents,
        reason: "Opening stock",
        reference: "OPENING",
      });
    }

    return tx.product.findUniqueOrThrow({ where: { id: product.id } });
  });
}

export async function updateProduct(
  ctx: BaseContext,
  id: string,
  patch: Partial<ProductInput>,
) {
  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    const before = await tx.product.findFirstOrThrow({
      where: { id, tenantId: ctx.tenantId },
    });
    if (before.status === ProductStatus.ARCHIVED) {
      throw new InventoryError(
        "ARCHIVED",
        "Restore this product before editing.",
      );
    }
    const after = await tx.product.update({
      where: { id },
      data: {
        sku: patch.sku ?? before.sku,
        name: patch.name ?? before.name,
        description: patch.description ?? before.description,
        imageUrl: patch.imageUrl ?? before.imageUrl,
        unitOfMeasure: patch.unitOfMeasure ?? before.unitOfMeasure,
        categoryId:
          patch.categoryId === undefined ? before.categoryId : patch.categoryId,
        reorderPoint: patch.reorderPoint ?? before.reorderPoint,
        reorderQty: patch.reorderQty ?? before.reorderQty,
        costCents: patch.costCents ?? before.costCents,
        priceCents: patch.priceCents ?? before.priceCents,
      },
    });
    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? null,
      action: AuditAction.PRODUCT_UPDATED,
      entityType: "product",
      entityId: id,
      entityLabel: after.name,
      diff: pickDiff(before, after, [
        "sku", "name", "description", "imageUrl", "unitOfMeasure",
        "categoryId", "reorderPoint", "reorderQty", "costCents", "priceCents",
      ]),
    });
    return after;
  });
}

/** Archive is the soft-delete: product stays in history & reports. */
export async function archiveProduct(ctx: BaseContext, id: string) {
  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirstOrThrow({
      where: { id, tenantId: ctx.tenantId },
    });
    if (product.status === ProductStatus.ARCHIVED) return product;
    const updated = await tx.product.update({
      where: { id },
      data: { status: ProductStatus.ARCHIVED, archivedAt: new Date() },
    });
    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? null,
      action: AuditAction.PRODUCT_ARCHIVED,
      entityType: "product",
      entityId: id,
      entityLabel: product.name,
    });
    return updated;
  });
}

export async function restoreProduct(ctx: BaseContext, id: string) {
  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirstOrThrow({
      where: { id, tenantId: ctx.tenantId },
    });
    const updated = await tx.product.update({
      where: { id },
      data: { status: ProductStatus.ACTIVE, archivedAt: null },
    });
    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? null,
      action: AuditAction.PRODUCT_RESTORED,
      entityType: "product",
      entityId: id,
      entityLabel: product.name,
    });
    return updated;
  });
}

/**
 * Hard delete is only safe if the product has zero history; otherwise we
 * archive instead to preserve the audit trail. ERPNext takes the same line.
 */
export async function deleteProduct(ctx: BaseContext, id: string) {
  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirstOrThrow({
      where: { id, tenantId: ctx.tenantId },
      include: { _count: { select: { transactions: true, saleItems: true } } },
    });
    if (product._count.transactions > 0 || product._count.saleItems > 0) {
      throw new InventoryError(
        "HAS_HISTORY",
        "This product has stock or sales history. Archive it instead of deleting.",
      );
    }
    await tx.product.delete({ where: { id } });
    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? null,
      action: AuditAction.PRODUCT_DELETED,
      entityType: "product",
      entityId: id,
      entityLabel: product.name,
    });
  });
}

// ---------------------------------------------------------------------------
// Stock movements — the heart of the module
// ---------------------------------------------------------------------------

export interface StockMovementInput {
  productId: string;
  /**
   * For IN/OUT, `quantity` is the (positive) magnitude. For ADJUSTMENT it's
   * the signed delta (negative is allowed) so cycle counts read naturally.
   */
  quantity: number;
  type: TransactionType;
  reason?: string;
  reference?: string;
  notes?: string;
  /** Per-unit cost for this movement. Defaults to the product's costCents. */
  unitCostCents?: number;
  /** Optional explicit timestamp; defaults to now. */
  occurredAt?: Date;
}

export async function recordStockMovement(
  ctx: BaseContext,
  input: StockMovementInput,
) {
  const prisma = requirePrisma();
  return prisma.$transaction((tx) => postStockChange(tx, ctx, input));
}

/** Convenience wrappers — mirror the dashboard's mental model. */
export const stockIn = (ctx: BaseContext, productId: string, quantity: number, opts?: Partial<StockMovementInput>) =>
  recordStockMovement(ctx, { ...opts, productId, quantity, type: TransactionType.STOCK_IN });

export const stockOut = (ctx: BaseContext, productId: string, quantity: number, opts?: Partial<StockMovementInput>) =>
  recordStockMovement(ctx, { ...opts, productId, quantity, type: TransactionType.STOCK_OUT });

export const adjustStock = (ctx: BaseContext, productId: string, signedDelta: number, opts?: Partial<StockMovementInput>) =>
  recordStockMovement(ctx, { ...opts, productId, quantity: signedDelta, type: TransactionType.ADJUSTMENT });

/**
 * Internal: the single source of truth for posting a stock change. Always
 * called from within an existing Prisma transaction. Writes the txn, the
 * ledger entry, updates the cached on-hand, and emits an audit row.
 */
async function postStockChange(
  tx: Tx,
  ctx: BaseContext,
  input: StockMovementInput,
) {
  const product = await tx.product.findFirstOrThrow({
    where: { id: input.productId, tenantId: ctx.tenantId },
  });

  if (product.status === ProductStatus.ARCHIVED) {
    throw new InventoryError(
      "ARCHIVED",
      `Cannot move stock for archived product "${product.name}".`,
    );
  }

  let signed: number;
  let magnitude: number;
  let auditAction: AuditAction;
  switch (input.type) {
    case TransactionType.STOCK_IN:
      magnitude = Math.abs(input.quantity);
      signed = magnitude;
      auditAction = AuditAction.STOCK_IN;
      break;
    case TransactionType.STOCK_OUT:
      magnitude = Math.abs(input.quantity);
      signed = -magnitude;
      auditAction = AuditAction.STOCK_OUT;
      break;
    case TransactionType.ADJUSTMENT:
      signed = input.quantity;
      magnitude = Math.abs(input.quantity);
      auditAction = AuditAction.STOCK_ADJUSTMENT;
      break;
  }

  if (magnitude <= 0) {
    throw new InventoryError("INVALID_QTY", "Quantity must be non-zero.");
  }
  const newBalance = product.onHand + signed;
  if (newBalance < 0) {
    throw new InventoryError(
      "INSUFFICIENT_STOCK",
      `Only ${product.onHand} on hand for "${product.name}".`,
    );
  }

  const unitCost = input.unitCostCents ?? product.costCents;
  const totalCost = unitCost * magnitude;

  const txn = await tx.inventoryTransaction.create({
    data: {
      tenantId: ctx.tenantId,
      productId: product.id,
      userId: ctx.userId ?? null,
      type: input.type,
      quantity: magnitude,
      signedQty: signed,
      reason: input.reason,
      reference: input.reference,
      notes: input.notes,
      unitCostCents: unitCost,
      totalCostCents: totalCost,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });

  await tx.stockLedgerEntry.create({
    data: {
      tenantId: ctx.tenantId,
      productId: product.id,
      transactionId: txn.id,
      qtyChange: signed,
      balanceAfter: newBalance,
      valueChangeCents: signed * unitCost,
      postedAt: txn.occurredAt,
    },
  });

  await tx.product.update({
    where: { id: product.id },
    data: { onHand: newBalance },
  });

  await writeAudit(tx, {
    tenantId: ctx.tenantId,
    userId: ctx.userId ?? null,
    action: auditAction,
    entityType: "product",
    entityId: product.id,
    entityLabel: product.name,
    metadata: {
      transactionId: txn.id,
      qtyChange: signed,
      balanceAfter: newBalance,
      reason: input.reason,
      reference: input.reference,
    },
  });

  return { transaction: txn, balanceAfter: newBalance };
}

// ---------------------------------------------------------------------------
// Read-side / reports
// ---------------------------------------------------------------------------

export async function listProducts(
  tenantId: string,
  opts?: { status?: ProductStatus; categoryId?: string; search?: string },
) {
  const prisma = requirePrisma();
  return prisma.product.findMany({
    where: {
      tenantId,
      status: opts?.status ?? ProductStatus.ACTIVE,
      categoryId: opts?.categoryId,
      OR: opts?.search
        ? [
            { name: { contains: opts.search, mode: "insensitive" } },
            { sku: { contains: opts.search, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: { category: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getLowStock(tenantId: string) {
  const prisma = requirePrisma();
  const products = await prisma.product.findMany({
    where: { tenantId, status: ProductStatus.ACTIVE },
    include: { category: true },
  });
  return products.filter((p) => p.onHand <= p.reorderPoint);
}

export async function getInventoryValue(tenantId: string) {
  const prisma = requirePrisma();
  const products = await prisma.product.findMany({
    where: { tenantId, status: ProductStatus.ACTIVE },
    select: { onHand: true, costCents: true, priceCents: true },
  });
  return products.reduce(
    (acc, p) => ({
      units: acc.units + p.onHand,
      costCents: acc.costCents + p.onHand * p.costCents,
      retailCents: acc.retailCents + p.onHand * p.priceCents,
    }),
    { units: 0, costCents: 0, retailCents: 0 },
  );
}

export async function listMovements(
  tenantId: string,
  opts?: { productId?: string; type?: TransactionType; from?: Date; to?: Date; limit?: number },
) {
  const prisma = requirePrisma();
  return prisma.inventoryTransaction.findMany({
    where: {
      tenantId,
      productId: opts?.productId,
      type: opts?.type,
      occurredAt: {
        gte: opts?.from,
        lte: opts?.to,
      },
    },
    include: { product: true, user: true },
    orderBy: { occurredAt: "desc" },
    take: opts?.limit ?? 200,
  });
}

export async function listAuditLog(
  tenantId: string,
  opts?: { entityType?: string; entityId?: string; limit?: number },
) {
  const prisma = requirePrisma();
  return prisma.auditLog.findMany({
    where: {
      tenantId,
      entityType: opts?.entityType,
      entityId: opts?.entityId,
    },
    include: { user: { select: { id: true, fullName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 200,
  });
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

interface AuditInput {
  tenantId: string;
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  diff?: unknown;
  metadata?: unknown;
}

async function writeAudit(tx: Tx, input: AuditInput) {
  await tx.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      diff: input.diff as Prisma.InputJsonValue | undefined,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

function pickDiff<T extends Record<string, unknown>>(
  before: T,
  after: T,
  keys: (keyof T)[],
): { before: Partial<T>; after: Partial<T> } | null {
  const b: Partial<T> = {};
  const a: Partial<T> = {};
  let changed = false;
  for (const k of keys) {
    if (before[k] !== after[k]) {
      b[k] = before[k];
      a[k] = after[k];
      changed = true;
    }
  }
  return changed ? { before: b, after: a } : null;
}
