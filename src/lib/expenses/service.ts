import "server-only";
import {
  AuditAction,
  ExpenseReportKind,
  type Prisma,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/db/prisma";

/**
 * Expense Tracking service — the production-ready, multi-tenant core of the
 * Expense module.
 *
 * **Fully STANDALONE.** This service has zero dependencies on Inventory,
 * Sales, or POS. A tenant can subscribe to Expense Tracking alone and still
 * get full functionality (CRUD, tenant-owned categories, dashboards, audit
 * trail, exports). The design intentionally mirrors Firefly III's
 * withdrawal/category split:
 *
 *   • Expense           — the transaction document.
 *   • ExpenseCategory   — tenant-owned taxonomy with defaults + custom.
 *   • ExpenseReport     — audit row for report generation / exports.
 *
 * Soft-delete is enforced: deleting an expense flips `deletedAt` rather than
 * dropping the row, so reports remain reproducible. A separate `purge` action
 * exists for hard removal when the tenant explicitly requests it.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RangePreset = "today" | "7d" | "30d" | "90d" | "ytd" | "month" | "year" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  preset?: RangePreset;
}

export interface ExpenseFilters {
  categoryId?: string;
  search?: string;
  minAmountCents?: number;
  maxAmountCents?: number;
}

export interface ExpenseKPIs {
  totalToday: number;
  totalWeek: number;
  totalMonth: number;
  totalYear: number;
  largestExpenseThisMonth: number;
  highestCategoryThisMonth: { name: string; total: number } | null;
  averageMonthlySpending: number;
  monthOverMonthGrowth: number | null;
}

export interface CategorySlice {
  categoryId: string | null;
  name: string;
  total: number;
  count: number;
  share: number;
}

export interface ExpenseTimePoint {
  label: string;
  date: string;
  total: number;
  count: number;
}

export type Granularity = "day" | "week" | "month";

interface BaseContext {
  tenantId: string;
  userId?: string | null;
}

export class ExpenseError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ExpenseError";
  }
}

const slugify = (input: string) =>
  input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "category";

function requirePrisma(): PrismaClient {
  const prisma = getPrisma();
  if (!prisma) {
    throw new ExpenseError(
      "NO_DATABASE",
      "Expense service requires a configured DATABASE_URL.",
    );
  }
  return prisma;
}

// ---------------------------------------------------------------------------
// Default categories — seeded for new tenants
// ---------------------------------------------------------------------------

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Utilities", color: "#5E81AC" },
  { name: "Rent", color: "#BF616A" },
  { name: "Payroll", color: "#A3BE8C" },
  { name: "Supplies", color: "#D08770" },
  { name: "Transportation", color: "#88C0D0" },
  { name: "Marketing", color: "#EBCB8B" },
  { name: "Other", color: "#9ca3af" },
] as const;

export async function ensureDefaultCategories(tenantId: string) {
  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    const existing = new Set(
      (await tx.expenseCategory.findMany({
        where: { tenantId },
        select: { slug: true },
      })).map((c) => c.slug),
    );
    for (const def of DEFAULT_EXPENSE_CATEGORIES) {
      const slug = slugify(def.name);
      if (!existing.has(slug)) {
        await tx.expenseCategory.create({
          data: {
            tenantId,
            name: def.name,
            slug,
            color: def.color,
            isDefault: true,
          },
        });
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Categories — CRUD
// ---------------------------------------------------------------------------

export interface ExpenseCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
}

export async function createExpenseCategory(
  ctx: BaseContext,
  input: ExpenseCategoryInput,
) {
  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    const slug = input.slug ?? slugify(input.name);
    const exists = await tx.expenseCategory.findUnique({
      where: { tenantId_slug: { tenantId: ctx.tenantId, slug } },
    });
    if (exists) {
      throw new ExpenseError(
        "DUPLICATE_CATEGORY",
        `A category named "${input.name}" already exists.`,
      );
    }
    const cat = await tx.expenseCategory.create({
      data: {
        tenantId: ctx.tenantId,
        name: input.name,
        slug,
        description: input.description,
        color: input.color,
        isDefault: false,
      },
    });
    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? null,
      action: AuditAction.EXPENSE_CATEGORY_CREATED,
      entityType: "expenseCategory",
      entityId: cat.id,
      entityLabel: cat.name,
    });
    return cat;
  });
}

export async function updateExpenseCategory(
  ctx: BaseContext,
  id: string,
  patch: Partial<ExpenseCategoryInput>,
) {
  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    const before = await tx.expenseCategory.findFirstOrThrow({
      where: { id, tenantId: ctx.tenantId },
    });
    const after = await tx.expenseCategory.update({
      where: { id },
      data: {
        name: patch.name ?? before.name,
        slug: patch.slug ?? (patch.name ? slugify(patch.name) : before.slug),
        description: patch.description ?? before.description,
        color: patch.color ?? before.color,
      },
    });
    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? null,
      action: AuditAction.EXPENSE_CATEGORY_UPDATED,
      entityType: "expenseCategory",
      entityId: id,
      entityLabel: after.name,
      diff: pickDiff(before, after, ["name", "slug", "description", "color"]),
    });
    return after;
  });
}

export async function deleteExpenseCategory(ctx: BaseContext, id: string) {
  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    const cat = await tx.expenseCategory.findFirstOrThrow({
      where: { id, tenantId: ctx.tenantId },
      include: { _count: { select: { expenses: { where: { deletedAt: null } } } } },
    });
    if (cat._count.expenses > 0) {
      throw new ExpenseError(
        "CATEGORY_IN_USE",
        `Category "${cat.name}" still has ${cat._count.expenses} expense(s). Reassign or delete them first.`,
      );
    }
    await tx.expenseCategory.delete({ where: { id } });
    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? null,
      action: AuditAction.EXPENSE_CATEGORY_DELETED,
      entityType: "expenseCategory",
      entityId: id,
      entityLabel: cat.name,
    });
  });
}

export async function listExpenseCategories(tenantId: string) {
  const prisma = requirePrisma();
  return prisma.expenseCategory.findMany({
    where: { tenantId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { expenses: { where: { deletedAt: null } } } },
    },
  });
}

// ---------------------------------------------------------------------------
// Expenses — CRUD
// ---------------------------------------------------------------------------

export interface ExpenseInput {
  title: string;
  amountCents: number;
  categoryId?: string | null;
  vendor?: string;
  description?: string;
  notes?: string;
  spentAt?: Date;
}

export async function createExpense(ctx: BaseContext, input: ExpenseInput) {
  if (!input.title.trim()) {
    throw new ExpenseError("INVALID_TITLE", "Expense title is required.");
  }
  if (input.amountCents <= 0) {
    throw new ExpenseError("INVALID_AMOUNT", "Amount must be greater than zero.");
  }
  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        tenantId: ctx.tenantId,
        title: input.title.trim(),
        amountCents: Math.round(input.amountCents),
        categoryId: input.categoryId ?? null,
        vendor: input.vendor,
        description: input.description,
        notes: input.notes,
        spentAt: input.spentAt ?? new Date(),
        createdById: ctx.userId ?? null,
        updatedById: ctx.userId ?? null,
      },
      include: { category: true },
    });
    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? null,
      action: AuditAction.EXPENSE_CREATED,
      entityType: "expense",
      entityId: expense.id,
      entityLabel: expense.title,
      metadata: { amountCents: expense.amountCents, categoryId: expense.categoryId },
    });
    return expense;
  });
}

export async function updateExpense(
  ctx: BaseContext,
  id: string,
  patch: Partial<ExpenseInput>,
) {
  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    const before = await tx.expense.findFirstOrThrow({
      where: { id, tenantId: ctx.tenantId, deletedAt: null },
    });
    const after = await tx.expense.update({
      where: { id },
      data: {
        title: patch.title?.trim() ?? before.title,
        amountCents: patch.amountCents != null ? Math.round(patch.amountCents) : before.amountCents,
        categoryId: patch.categoryId === undefined ? before.categoryId : patch.categoryId,
        vendor: patch.vendor ?? before.vendor,
        description: patch.description ?? before.description,
        notes: patch.notes ?? before.notes,
        spentAt: patch.spentAt ?? before.spentAt,
        updatedById: ctx.userId ?? null,
      },
      include: { category: true },
    });
    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? null,
      action: AuditAction.EXPENSE_UPDATED,
      entityType: "expense",
      entityId: id,
      entityLabel: after.title,
      diff: pickDiff(before, after, [
        "title", "amountCents", "categoryId", "vendor", "description", "notes", "spentAt",
      ]),
    });
    return after;
  });
}

/** Soft-delete: keeps the row for audit/report integrity. */
export async function deleteExpense(ctx: BaseContext, id: string) {
  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findFirstOrThrow({
      where: { id, tenantId: ctx.tenantId, deletedAt: null },
    });
    await tx.expense.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: ctx.userId ?? null },
    });
    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? null,
      action: AuditAction.EXPENSE_DELETED,
      entityType: "expense",
      entityId: id,
      entityLabel: expense.title,
      metadata: { amountCents: expense.amountCents },
    });
  });
}

export async function restoreExpense(ctx: BaseContext, id: string) {
  const prisma = requirePrisma();
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findFirstOrThrow({
      where: { id, tenantId: ctx.tenantId, deletedAt: { not: null } },
    });
    await tx.expense.update({
      where: { id },
      data: { deletedAt: null, updatedById: ctx.userId ?? null },
    });
    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? null,
      action: AuditAction.EXPENSE_RESTORED,
      entityType: "expense",
      entityId: id,
      entityLabel: expense.title,
    });
  });
}

// ---------------------------------------------------------------------------
// Read side — list + analytics
// ---------------------------------------------------------------------------

function buildExpenseWhere(
  tenantId: string,
  range?: DateRange,
  filters?: ExpenseFilters,
): Prisma.ExpenseWhereInput {
  const where: Prisma.ExpenseWhereInput = {
    tenantId,
    deletedAt: null,
  };
  if (range) where.spentAt = { gte: range.from, lte: range.to };
  if (filters?.categoryId) where.categoryId = filters.categoryId;
  if (filters?.minAmountCents != null || filters?.maxAmountCents != null) {
    where.amountCents = {
      gte: filters.minAmountCents ?? undefined,
      lte: filters.maxAmountCents ?? undefined,
    };
  }
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { vendor: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listExpenses(
  tenantId: string,
  opts?: {
    range?: DateRange;
    filters?: ExpenseFilters;
    sort?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
    limit?: number;
    skip?: number;
  },
) {
  const prisma = requirePrisma();
  const orderBy: Prisma.ExpenseOrderByWithRelationInput =
    opts?.sort === "date_asc" ? { spentAt: "asc" } :
    opts?.sort === "amount_desc" ? { amountCents: "desc" } :
    opts?.sort === "amount_asc" ? { amountCents: "asc" } :
    { spentAt: "desc" };
  return prisma.expense.findMany({
    where: buildExpenseWhere(tenantId, opts?.range, opts?.filters),
    include: { category: true },
    orderBy,
    take: opts?.limit ?? 100,
    skip: opts?.skip,
  });
}

// ---------- Range helpers ----------

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function startOfWeek(d: Date) { const x = startOfDay(d); x.setDate(d.getDate() - d.getDay()); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfYear(d: Date) { return new Date(d.getFullYear(), 0, 1); }

export function resolveRange(preset: RangePreset, now = new Date()): DateRange {
  const to = endOfDay(now);
  switch (preset) {
    case "today": return { preset, from: startOfDay(now), to };
    case "7d": return { preset, from: startOfDay(new Date(+now - 6 * 86400000)), to };
    case "30d": return { preset, from: startOfDay(new Date(+now - 29 * 86400000)), to };
    case "90d": return { preset, from: startOfDay(new Date(+now - 89 * 86400000)), to };
    case "month": return { preset, from: startOfMonth(now), to };
    case "year":
    case "ytd": return { preset: "ytd", from: startOfYear(now), to };
    default: return { preset, from: startOfDay(new Date(+now - 29 * 86400000)), to };
  }
}

// ---------- KPIs ----------

export async function getKPIs(tenantId: string): Promise<ExpenseKPIs> {
  const prisma = requirePrisma();
  const now = new Date();

  const ranges = {
    today: { gte: startOfDay(now), lte: endOfDay(now) },
    week: { gte: startOfWeek(now), lte: endOfDay(now) },
    month: { gte: startOfMonth(now), lte: endOfDay(now) },
    year: { gte: startOfYear(now), lte: endOfDay(now) },
  };

  const [t, w, m, y, monthBreakdown, largest, history] = await Promise.all([
    prisma.expense.aggregate({
      where: { tenantId, deletedAt: null, spentAt: ranges.today },
      _sum: { amountCents: true },
    }),
    prisma.expense.aggregate({
      where: { tenantId, deletedAt: null, spentAt: ranges.week },
      _sum: { amountCents: true },
    }),
    prisma.expense.aggregate({
      where: { tenantId, deletedAt: null, spentAt: ranges.month },
      _sum: { amountCents: true },
    }),
    prisma.expense.aggregate({
      where: { tenantId, deletedAt: null, spentAt: ranges.year },
      _sum: { amountCents: true },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { tenantId, deletedAt: null, spentAt: ranges.month },
      _sum: { amountCents: true },
      orderBy: { _sum: { amountCents: "desc" } },
      take: 1,
    }),
    prisma.expense.findFirst({
      where: { tenantId, deletedAt: null, spentAt: ranges.month },
      orderBy: { amountCents: "desc" },
      select: { amountCents: true },
    }),
    prisma.expense.findMany({
      where: { tenantId, deletedAt: null },
      select: { amountCents: true, spentAt: true },
      orderBy: { spentAt: "asc" },
    }),
  ]);

  // Highest category this month
  let highestCategoryThisMonth: ExpenseKPIs["highestCategoryThisMonth"] = null;
  if (monthBreakdown[0]) {
    const top = monthBreakdown[0];
    const cat = top.categoryId
      ? await prisma.expenseCategory.findUnique({ where: { id: top.categoryId } })
      : null;
    highestCategoryThisMonth = {
      name: cat?.name ?? "Uncategorised",
      total: top._sum.amountCents ?? 0,
    };
  }

  // Average monthly + month-over-month growth
  const monthlyTotals = new Map<string, number>();
  for (const row of history) {
    const key = `${row.spentAt.getFullYear()}-${row.spentAt.getMonth()}`;
    monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + row.amountCents);
  }
  const avgMonthly =
    monthlyTotals.size === 0
      ? 0
      : [...monthlyTotals.values()].reduce((a, b) => a + b, 0) / monthlyTotals.size;

  const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${lastMonthDate.getMonth()}`;
  const thisMonth = monthlyTotals.get(thisMonthKey) ?? 0;
  const lastMonth = monthlyTotals.get(lastMonthKey) ?? 0;
  const momGrowth = lastMonth > 0 ? (thisMonth - lastMonth) / lastMonth : thisMonth > 0 ? null : 0;

  return {
    totalToday: t._sum.amountCents ?? 0,
    totalWeek: w._sum.amountCents ?? 0,
    totalMonth: m._sum.amountCents ?? 0,
    totalYear: y._sum.amountCents ?? 0,
    largestExpenseThisMonth: largest?.amountCents ?? 0,
    highestCategoryThisMonth,
    averageMonthlySpending: Math.round(avgMonthly),
    monthOverMonthGrowth: momGrowth,
  };
}

// ---------- Trend ----------

function bucketKey(d: Date, g: Granularity): string {
  if (g === "month") return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
  if (g === "week") {
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return day.toISOString();
}

function buildBuckets(range: DateRange, g: Granularity): ExpenseTimePoint[] {
  const out: ExpenseTimePoint[] = [];
  if (g === "month") {
    const d = new Date(range.from.getFullYear(), range.from.getMonth(), 1);
    const end = new Date(range.to.getFullYear(), range.to.getMonth(), 1);
    while (d <= end) {
      out.push({
        label: d.toLocaleString("en", { month: "short" }),
        date: d.toISOString(), total: 0, count: 0,
      });
      d.setMonth(d.getMonth() + 1);
    }
    return out;
  }
  if (g === "week") {
    const d = new Date(range.from);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    while (d <= range.to) {
      out.push({
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        date: d.toISOString(), total: 0, count: 0,
      });
      d.setDate(d.getDate() + 7);
    }
    return out;
  }
  const d = startOfDay(range.from);
  while (d <= range.to) {
    out.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      date: d.toISOString(), total: 0, count: 0,
    });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export async function getExpenseTrend(
  tenantId: string,
  range: DateRange,
  granularity: Granularity = "day",
  filters?: ExpenseFilters,
): Promise<ExpenseTimePoint[]> {
  const prisma = requirePrisma();
  const rows = await prisma.expense.findMany({
    where: buildExpenseWhere(tenantId, range, filters),
    select: { spentAt: true, amountCents: true },
  });
  const buckets = buildBuckets(range, granularity);
  const index = new Map<string, ExpenseTimePoint>(buckets.map((b) => [b.date, b]));
  for (const r of rows) {
    const key = bucketKey(r.spentAt, granularity);
    const bucket = index.get(key);
    if (!bucket) continue;
    bucket.total += r.amountCents;
    bucket.count += 1;
  }
  return buckets;
}

// ---------- Category breakdown ----------

export async function getCategoryBreakdown(
  tenantId: string,
  range: DateRange,
  filters?: ExpenseFilters,
): Promise<CategorySlice[]> {
  const prisma = requirePrisma();
  const rows = await prisma.expense.findMany({
    where: buildExpenseWhere(tenantId, range, filters),
    select: {
      amountCents: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  });
  type Agg = { categoryId: string | null; name: string; total: number; count: number };
  const agg = new Map<string, Agg>();
  let total = 0;
  for (const r of rows) {
    const key = r.categoryId ?? "__none__";
    const a = agg.get(key) ?? {
      categoryId: r.categoryId,
      name: r.category?.name ?? "Uncategorised",
      total: 0,
      count: 0,
    };
    a.total += r.amountCents;
    a.count += 1;
    agg.set(key, a);
    total += r.amountCents;
  }
  return [...agg.values()]
    .map((a) => ({
      categoryId: a.categoryId,
      name: a.name,
      total: a.total,
      count: a.count,
      share: total > 0 ? a.total / total : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

// ---------------------------------------------------------------------------
// Reports / audit
// ---------------------------------------------------------------------------

export async function recordReportAccess(input: {
  tenantId: string;
  userId?: string | null;
  kind: ExpenseReportKind;
  range?: DateRange;
  filters?: ExpenseFilters;
  rowCount?: number;
  totalCents?: number;
  exportedFile?: string;
}) {
  const prisma = requirePrisma();
  await prisma.expenseReport.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      kind: input.kind,
      rangeFrom: input.range?.from,
      rangeTo: input.range?.to,
      filters: input.filters as Prisma.InputJsonValue | undefined,
      rowCount: input.rowCount,
      totalCents: input.totalCents,
      exportedFile: input.exportedFile,
    },
  });
}

// CSV export — BOM + CRLF so it opens cleanly in Excel.
export async function exportExpensesCSV(
  tenantId: string,
  range: DateRange,
  filters?: ExpenseFilters,
  userId?: string | null,
) {
  const expenses = await listExpenses(tenantId, {
    range,
    filters,
    sort: "date_asc",
    limit: 50_000,
  });
  const rows: string[] = [
    "Date,Title,Category,Vendor,Amount (PHP),Description",
  ];
  let total = 0;
  for (const e of expenses) {
    total += e.amountCents;
    rows.push(
      [
        e.spentAt.toISOString().slice(0, 10),
        csv(e.title),
        csv(e.category?.name ?? "Uncategorised"),
        csv(e.vendor ?? ""),
        (e.amountCents / 100).toFixed(2),
        csv(e.description ?? ""),
      ].join(","),
    );
  }
  rows.push("");
  rows.push(`Total,,,${expenses.length} expenses,,${(total / 100).toFixed(2)}`);
  const body = "﻿" + rows.join("\r\n");
  const filename = `solaris-expenses-${range.from.toISOString().slice(0, 10)}-to-${range.to.toISOString().slice(0, 10)}.csv`;

  await recordReportAccess({
    tenantId,
    userId,
    kind: ExpenseReportKind.EXPORT_CSV,
    range,
    filters,
    rowCount: expenses.length,
    totalCents: total,
    exportedFile: filename,
  });

  return { body, filename, mime: "text/csv;charset=utf-8", rowCount: expenses.length, totalCents: total };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

type Tx = Prisma.TransactionClient;
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

function csv(value: string | number): string {
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
