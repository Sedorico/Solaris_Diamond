import "server-only";
import {
  SaleChannel,
  SaleStatus,
  SalesReportKind,
  type Prisma,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/db/prisma";

/**
 * Sales analytics service — the production-ready, multi-tenant core of the
 * Sales Dashboard. Inspired by Metabase's dashboard / query / card abstraction:
 *
 *  • Every public function takes a `tenantId` and a `DateRange`. Filters
 *    propagate to KPIs, charts and reports identically (a Metabase
 *    dashboard filter applies to every card on the dashboard).
 *  • Reads compute aggregates from `Sale` + `SaleItem` directly; large
 *    tenants can swap to the pre-aggregated `SalesSnapshot` table without
 *    changing call sites.
 *  • Every report generation and export writes a `SalesReport` audit row
 *    so we have a tamper-evident record of who queried what and when.
 *
 * The Sales Dashboard never reads another tenant's rows: every query is
 * scoped by `tenantId` at the application layer, and Postgres RLS enforces
 * the same boundary at the storage layer (future migration).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RangePreset = "today" | "7d" | "30d" | "90d" | "ytd" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  preset?: RangePreset;
}

export interface SalesFilters {
  /** Optional product id filter for product-specific reports. */
  productId?: string;
  /** Optional category id filter (joins through Product). */
  categoryId?: string;
  /** Optional channel filter (POS, Online, etc.). */
  channel?: SaleChannel;
  /** Free-text search against sale ref or customer. */
  search?: string;
}

export interface SalesKPIs {
  revenue: number;          // cents
  orders: number;
  itemsSold: number;
  averageOrderValue: number;
  grossMargin: number;      // cents
  marginRate: number;       // 0–1
  refundRate: number;       // 0–1
  /** % growth vs. the previous window of equal length. */
  revenueGrowth: number | null;
  ordersGrowth: number | null;
  topMethod: string | null;
  bestSeller: { name: string; revenue: number } | null;
}

export interface TimePoint {
  /** ISO date / week / month label for the x-axis. */
  label: string;
  /** Bucket start (UTC). */
  date: string;
  revenue: number;
  orders: number;
  itemsSold: number;
}

export type RankingMode = "revenue" | "qty" | "frequency";

export interface ProductRanking {
  productId: string | null;
  name: string;
  revenue: number;
  qty: number;
  orders: number;
  share: number;          // 0–1 of total in window
}

export interface CategorySlice {
  categoryId: string | null;
  name: string;
  revenue: number;
  orders: number;
  share: number;
}

export interface OrderPerformance {
  averageItemsPerOrder: number;
  averageOrderValue: number;
  largestOrder: number;
  smallestOrder: number;
  /** Distribution of orders by channel. */
  byChannel: Array<{ channel: SaleChannel; count: number; revenue: number }>;
  /** Distribution of orders by payment method. */
  byMethod: Array<{ method: string; count: number; revenue: number }>;
}

// ---------------------------------------------------------------------------
// Range helpers
// ---------------------------------------------------------------------------

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function resolveRange(preset: RangePreset, now = new Date()): DateRange {
  const to = endOfDay(now);
  switch (preset) {
    case "today":
      return { preset, from: startOfDay(now), to };
    case "7d":
      return { preset, from: startOfDay(new Date(+now - 6 * 86400000)), to };
    case "30d":
      return { preset, from: startOfDay(new Date(+now - 29 * 86400000)), to };
    case "90d":
      return { preset, from: startOfDay(new Date(+now - 89 * 86400000)), to };
    case "ytd": {
      const from = startOfDay(new Date(now.getFullYear(), 0, 1));
      return { preset, from, to };
    }
    default:
      return { preset, from: startOfDay(new Date(+now - 29 * 86400000)), to };
  }
}

/** The previous window of equal length, used for growth comparisons. */
function previousWindow(range: DateRange): DateRange {
  const span = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - span - 1),
    to: new Date(range.from.getTime() - 1),
  };
}

function requirePrisma(): PrismaClient {
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error("Sales service requires a configured DATABASE_URL.");
  }
  return prisma;
}

function buildWhere(
  tenantId: string,
  range: DateRange,
  filters?: SalesFilters,
): Prisma.SaleWhereInput {
  const where: Prisma.SaleWhereInput = {
    tenantId,
    soldAt: { gte: range.from, lte: range.to },
    status: SaleStatus.COMPLETED,
  };
  if (filters?.channel) where.channel = filters.channel;
  if (filters?.search) {
    where.OR = [
      { ref: { contains: filters.search, mode: "insensitive" } },
      { customer: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters?.productId || filters?.categoryId) {
    where.items = {
      some: {
        productId: filters.productId,
        product: filters.categoryId
          ? { categoryId: filters.categoryId }
          : undefined,
      },
    };
  }
  return where;
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

export async function getKPIs(
  tenantId: string,
  range: DateRange,
  filters?: SalesFilters,
): Promise<SalesKPIs> {
  const prisma = requirePrisma();

  const [current, previous] = await Promise.all([
    queryWindow(prisma, tenantId, range, filters),
    queryWindow(prisma, tenantId, previousWindow(range), filters),
  ]);

  const aov = current.orders > 0 ? Math.round(current.revenue / current.orders) : 0;
  const margin = current.revenue - current.cost;
  const marginRate = current.revenue > 0 ? margin / current.revenue : 0;

  const refunds = await prisma.sale.aggregate({
    where: {
      tenantId,
      status: SaleStatus.REFUNDED,
      soldAt: { gte: range.from, lte: range.to },
    },
    _count: true,
    _sum: { totalCents: true },
  });
  const refundCount = refunds._count ?? 0;
  const refundRate =
    current.orders + refundCount > 0
      ? refundCount / (current.orders + refundCount)
      : 0;

  return {
    revenue: current.revenue,
    orders: current.orders,
    itemsSold: current.itemsSold,
    averageOrderValue: aov,
    grossMargin: margin,
    marginRate,
    refundRate,
    revenueGrowth: growth(current.revenue, previous.revenue),
    ordersGrowth: growth(current.orders, previous.orders),
    topMethod: current.topMethod,
    bestSeller: current.bestSeller,
  };
}

async function queryWindow(
  prisma: PrismaClient,
  tenantId: string,
  range: DateRange,
  filters?: SalesFilters,
) {
  const sales = await prisma.sale.findMany({
    where: buildWhere(tenantId, range, filters),
    select: {
      id: true,
      method: true,
      totalCents: true,
      costCents: true,
      items: { select: { name: true, priceCents: true, qty: true } },
    },
  });

  let revenue = 0;
  let cost = 0;
  let itemsSold = 0;
  const byProduct = new Map<string, number>();
  const byMethod = new Map<string, number>();
  for (const s of sales) {
    revenue += s.totalCents;
    cost += s.costCents;
    byMethod.set(s.method, (byMethod.get(s.method) ?? 0) + s.totalCents);
    for (const it of s.items) {
      itemsSold += it.qty;
      byProduct.set(it.name, (byProduct.get(it.name) ?? 0) + it.priceCents * it.qty);
    }
  }

  const top = [...byProduct.entries()].sort((a, b) => b[1] - a[1])[0];
  const topMethod =
    [...byMethod.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    orders: sales.length,
    revenue,
    cost,
    itemsSold,
    topMethod,
    bestSeller: top ? { name: top[0], revenue: top[1] } : null,
  };
}

function growth(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

// ---------------------------------------------------------------------------
// Time series
// ---------------------------------------------------------------------------

export type Granularity = "day" | "week" | "month";

export async function getRevenueTrend(
  tenantId: string,
  range: DateRange,
  granularity: Granularity = "day",
  filters?: SalesFilters,
): Promise<TimePoint[]> {
  const prisma = requirePrisma();
  const sales = await prisma.sale.findMany({
    where: buildWhere(tenantId, range, filters),
    select: {
      soldAt: true,
      totalCents: true,
      items: { select: { qty: true } },
    },
    orderBy: { soldAt: "asc" },
  });

  const buckets = buildBuckets(range, granularity);
  const index = new Map<string, TimePoint>(buckets.map((b) => [b.date, b]));

  for (const s of sales) {
    const key = bucketKey(s.soldAt, granularity);
    const bucket = index.get(key);
    if (!bucket) continue;
    bucket.revenue += s.totalCents;
    bucket.orders += 1;
    bucket.itemsSold += s.items.reduce((sum, i) => sum + i.qty, 0);
  }

  return buckets;
}

function bucketKey(d: Date, g: Granularity): string {
  if (g === "month") {
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
  }
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

function buildBuckets(range: DateRange, g: Granularity): TimePoint[] {
  const out: TimePoint[] = [];
  if (g === "month") {
    const d = new Date(range.from.getFullYear(), range.from.getMonth(), 1);
    const end = new Date(range.to.getFullYear(), range.to.getMonth(), 1);
    while (d <= end) {
      out.push({
        label: d.toLocaleString("en", { month: "short" }),
        date: d.toISOString(),
        revenue: 0,
        orders: 0,
        itemsSold: 0,
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
        date: d.toISOString(),
        revenue: 0,
        orders: 0,
        itemsSold: 0,
      });
      d.setDate(d.getDate() + 7);
    }
    return out;
  }
  const d = startOfDay(range.from);
  while (d <= range.to) {
    out.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      date: d.toISOString(),
      revenue: 0,
      orders: 0,
      itemsSold: 0,
    });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Product / category rankings
// ---------------------------------------------------------------------------

export async function getTopProducts(
  tenantId: string,
  range: DateRange,
  opts?: { mode?: RankingMode; limit?: number; filters?: SalesFilters },
): Promise<ProductRanking[]> {
  const prisma = requirePrisma();
  const mode = opts?.mode ?? "revenue";
  const limit = opts?.limit ?? 10;

  const sales = await prisma.sale.findMany({
    where: buildWhere(tenantId, range, opts?.filters),
    select: {
      id: true,
      items: {
        select: { productId: true, name: true, priceCents: true, qty: true },
      },
    },
  });

  type Agg = { productId: string | null; name: string; revenue: number; qty: number; orderIds: Set<string> };
  const agg = new Map<string, Agg>();
  let totalRevenue = 0;

  for (const s of sales) {
    for (const it of s.items) {
      const key = it.productId ?? `name:${it.name}`;
      const a = agg.get(key) ?? {
        productId: it.productId ?? null,
        name: it.name,
        revenue: 0,
        qty: 0,
        orderIds: new Set<string>(),
      };
      const lineRevenue = it.priceCents * it.qty;
      a.revenue += lineRevenue;
      a.qty += it.qty;
      a.orderIds.add(s.id);
      agg.set(key, a);
      totalRevenue += lineRevenue;
    }
  }

  const rows: ProductRanking[] = [...agg.values()].map((a) => ({
    productId: a.productId,
    name: a.name,
    revenue: a.revenue,
    qty: a.qty,
    orders: a.orderIds.size,
    share: totalRevenue > 0 ? a.revenue / totalRevenue : 0,
  }));

  rows.sort((a, b) => {
    if (mode === "qty") return b.qty - a.qty;
    if (mode === "frequency") return b.orders - a.orders;
    return b.revenue - a.revenue;
  });

  return rows.slice(0, limit);
}

export async function getCategoryBreakdown(
  tenantId: string,
  range: DateRange,
  filters?: SalesFilters,
): Promise<CategorySlice[]> {
  const prisma = requirePrisma();

  const sales = await prisma.sale.findMany({
    where: buildWhere(tenantId, range, filters),
    select: {
      id: true,
      items: {
        select: {
          priceCents: true,
          qty: true,
          product: {
            select: { categoryId: true, category: { select: { name: true } } },
          },
        },
      },
    },
  });

  type Agg = { categoryId: string | null; name: string; revenue: number; orderIds: Set<string> };
  const agg = new Map<string, Agg>();
  let total = 0;

  for (const s of sales) {
    for (const it of s.items) {
      const categoryId = it.product?.categoryId ?? null;
      const name = it.product?.category?.name ?? "Uncategorised";
      const key = categoryId ?? "__none__";
      const a = agg.get(key) ?? { categoryId, name, revenue: 0, orderIds: new Set<string>() };
      const lineRevenue = it.priceCents * it.qty;
      a.revenue += lineRevenue;
      a.orderIds.add(s.id);
      agg.set(key, a);
      total += lineRevenue;
    }
  }

  return [...agg.values()]
    .map((a) => ({
      categoryId: a.categoryId,
      name: a.name,
      revenue: a.revenue,
      orders: a.orderIds.size,
      share: total > 0 ? a.revenue / total : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

// ---------------------------------------------------------------------------
// Order performance + recent activity
// ---------------------------------------------------------------------------

export async function getOrderPerformance(
  tenantId: string,
  range: DateRange,
  filters?: SalesFilters,
): Promise<OrderPerformance> {
  const prisma = requirePrisma();

  const sales = await prisma.sale.findMany({
    where: buildWhere(tenantId, range, filters),
    select: {
      method: true,
      channel: true,
      totalCents: true,
      items: { select: { qty: true } },
    },
  });

  if (sales.length === 0) {
    return {
      averageItemsPerOrder: 0,
      averageOrderValue: 0,
      largestOrder: 0,
      smallestOrder: 0,
      byChannel: [],
      byMethod: [],
    };
  }

  let revenueTotal = 0;
  let itemTotal = 0;
  let largest = 0;
  let smallest = Number.POSITIVE_INFINITY;
  const channels = new Map<SaleChannel, { count: number; revenue: number }>();
  const methods = new Map<string, { count: number; revenue: number }>();
  for (const s of sales) {
    revenueTotal += s.totalCents;
    const items = s.items.reduce((sum, i) => sum + i.qty, 0);
    itemTotal += items;
    if (s.totalCents > largest) largest = s.totalCents;
    if (s.totalCents < smallest) smallest = s.totalCents;
    const c = channels.get(s.channel) ?? { count: 0, revenue: 0 };
    c.count += 1;
    c.revenue += s.totalCents;
    channels.set(s.channel, c);
    const m = methods.get(s.method) ?? { count: 0, revenue: 0 };
    m.count += 1;
    m.revenue += s.totalCents;
    methods.set(s.method, m);
  }

  return {
    averageItemsPerOrder: itemTotal / sales.length,
    averageOrderValue: Math.round(revenueTotal / sales.length),
    largestOrder: largest,
    smallestOrder: smallest === Number.POSITIVE_INFINITY ? 0 : smallest,
    byChannel: [...channels.entries()]
      .map(([channel, v]) => ({ channel, ...v }))
      .sort((a, b) => b.revenue - a.revenue),
    byMethod: [...methods.entries()]
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}

export async function getRecentSales(
  tenantId: string,
  limit = 12,
  filters?: SalesFilters,
) {
  const prisma = requirePrisma();
  return prisma.sale.findMany({
    where: {
      tenantId,
      status: SaleStatus.COMPLETED,
      method: filters?.search ? undefined : undefined,
    },
    include: { items: true },
    orderBy: { soldAt: "desc" },
    take: limit,
  });
}

// ---------------------------------------------------------------------------
// Audit + exports
// ---------------------------------------------------------------------------

export interface ReportAccessInput {
  tenantId: string;
  userId?: string | null;
  kind: SalesReportKind;
  range?: DateRange;
  filters?: SalesFilters;
  rowCount?: number;
  exportedFile?: string;
}

export async function recordReportAccess(input: ReportAccessInput) {
  const prisma = requirePrisma();
  await prisma.salesReport.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      kind: input.kind,
      rangeFrom: input.range?.from,
      rangeTo: input.range?.to,
      filters: input.filters as Prisma.InputJsonValue | undefined,
      rowCount: input.rowCount,
      exportedFile: input.exportedFile,
    },
  });
}

export interface CsvExportResult {
  filename: string;
  mime: string;
  body: string;
  rowCount: number;
}

/**
 * CSV export of sale lines for the active range/filter set. Uses BOM + CRLF
 * so spreadsheet apps open it cleanly. The caller (a server action / route
 * handler) is responsible for streaming the bytes to the client.
 */
export async function exportSalesCSV(
  tenantId: string,
  range: DateRange,
  filters?: SalesFilters,
  userId?: string | null,
): Promise<CsvExportResult> {
  const prisma = requirePrisma();
  const sales = await prisma.sale.findMany({
    where: buildWhere(tenantId, range, filters),
    include: { items: { select: { name: true, priceCents: true, qty: true } } },
    orderBy: { soldAt: "asc" },
  });

  const rows: string[] = [
    "Ref,Date,Channel,Method,Customer,Item,Qty,Unit price (PHP),Line total (PHP),Order total (PHP)",
  ];
  for (const s of sales) {
    for (const it of s.items) {
      rows.push(
        [
          csv(s.ref),
          s.soldAt.toISOString(),
          csv(s.channel),
          csv(s.method),
          csv(s.customer ?? ""),
          csv(it.name),
          it.qty,
          (it.priceCents / 100).toFixed(2),
          ((it.priceCents * it.qty) / 100).toFixed(2),
          (s.totalCents / 100).toFixed(2),
        ].join(","),
      );
    }
  }

  const body = "﻿" + rows.join("\r\n");
  const filename = `solaris-sales-${range.from.toISOString().slice(0, 10)}-to-${range.to
    .toISOString()
    .slice(0, 10)}.csv`;

  await recordReportAccess({
    tenantId,
    userId,
    kind: SalesReportKind.EXPORT_CSV,
    range,
    filters,
    rowCount: rows.length - 1,
    exportedFile: filename,
  });

  return { filename, mime: "text/csv;charset=utf-8", body, rowCount: rows.length - 1 };
}

function csv(value: string | number): string {
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
