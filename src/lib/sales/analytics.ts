"use client";

import type { Sale, SaleChannel } from "@/lib/store/business-store";

/**
 * Client-side analytics — the pure-function mirror of `lib/sales/service.ts`.
 *
 * We deliberately keep this side fully deterministic: it takes plain `Sale[]`
 * and returns the same shapes the server returns (KPIs, time series,
 * rankings, breakdowns). The Sales Dashboard renders from these in dev and
 * swaps to the server endpoints in prod without UI changes.
 */

// ---------------------------------------------------------------------------
// Types — match the server service
// ---------------------------------------------------------------------------

export type RangePreset = "today" | "7d" | "30d" | "90d" | "ytd" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  preset?: RangePreset;
}

export interface SalesFilters {
  productId?: string;
  categoryId?: string;
  channel?: SaleChannel;
  search?: string;
}

export interface SalesKPIs {
  revenue: number;
  orders: number;
  itemsSold: number;
  averageOrderValue: number;
  grossMargin: number;
  marginRate: number;
  refundRate: number;
  revenueGrowth: number | null;
  ordersGrowth: number | null;
  topMethod: string | null;
  bestSeller: { name: string; revenue: number } | null;
}

export interface TimePoint {
  label: string;
  date: string;
  revenue: number;
  orders: number;
  itemsSold: number;
}

export type Granularity = "day" | "week" | "month";

export type RankingMode = "revenue" | "qty" | "frequency";

export interface ProductRanking {
  productId: string | null;
  name: string;
  revenue: number;
  qty: number;
  orders: number;
  share: number;
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
  byChannel: Array<{ channel: SaleChannel; count: number; revenue: number }>;
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
      return { preset: "30d", from: startOfDay(new Date(+now - 29 * 86400000)), to };
  }
}

export function previousWindow(range: DateRange): DateRange {
  const span = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - span - 1),
    to: new Date(range.from.getTime() - 1),
  };
}

/** Auto-pick the right granularity for a window's span. */
export function pickGranularity(range: DateRange): Granularity {
  const days = (range.to.getTime() - range.from.getTime()) / 86400000;
  if (days <= 14) return "day";
  if (days <= 90) return "day";
  if (days <= 200) return "week";
  return "month";
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

function inWindow(sale: Sale, range: DateRange): boolean {
  const t = +new Date(sale.date);
  return t >= +range.from && t <= +range.to;
}

function passesFilters(sale: Sale, filters?: SalesFilters): boolean {
  if (!filters) return true;
  if (filters.channel && sale.channel !== filters.channel) return false;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    const inRef = sale.ref.toLowerCase().includes(q);
    const inCustomer = sale.customer?.toLowerCase().includes(q) ?? false;
    const inItem = sale.items.some((i) => i.name.toLowerCase().includes(q));
    if (!inRef && !inCustomer && !inItem) return false;
  }
  if (filters.productId) {
    if (!sale.items.some((i) => i.productId === filters.productId)) return false;
  }
  if (filters.categoryId) {
    if (!sale.items.some((i) => i.salesCategoryId === filters.categoryId)) return false;
  }
  return true;
}

export function filterSales(
  sales: Sale[],
  range: DateRange,
  filters?: SalesFilters,
): Sale[] {
  return sales.filter(
    (s) => s.status === "COMPLETED" && inWindow(s, range) && passesFilters(s, filters),
  );
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

function growth(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

export function computeKPIs(
  sales: Sale[],
  range: DateRange,
  filters?: SalesFilters,
): SalesKPIs {
  const current = filterSales(sales, range, filters);
  const previous = filterSales(sales, previousWindow(range), filters);

  let revenue = 0;
  let cost = 0;
  let itemsSold = 0;
  const byProduct = new Map<string, number>();
  const byMethod = new Map<string, number>();
  for (const s of current) {
    revenue += s.total;
    cost += s.cost ?? 0;
    byMethod.set(s.method, (byMethod.get(s.method) ?? 0) + s.total);
    for (const it of s.items) {
      itemsSold += it.qty;
      byProduct.set(it.name, (byProduct.get(it.name) ?? 0) + it.price * it.qty);
    }
  }
  const prevRevenue = previous.reduce((sum, s) => sum + s.total, 0);

  const top = [...byProduct.entries()].sort((a, b) => b[1] - a[1])[0];
  const topMethod = [...byMethod.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const refundedInWindow = sales.filter(
    (s) => s.status === "REFUNDED" && inWindow(s, range),
  ).length;

  return {
    revenue,
    orders: current.length,
    itemsSold,
    averageOrderValue: current.length > 0 ? Math.round(revenue / current.length) : 0,
    grossMargin: revenue - cost,
    marginRate: revenue > 0 ? (revenue - cost) / revenue : 0,
    refundRate:
      current.length + refundedInWindow > 0
        ? refundedInWindow / (current.length + refundedInWindow)
        : 0,
    revenueGrowth: growth(revenue, prevRevenue),
    ordersGrowth: growth(current.length, previous.length),
    topMethod,
    bestSeller: top ? { name: top[0], revenue: top[1] } : null,
  };
}

// ---------------------------------------------------------------------------
// Time series
// ---------------------------------------------------------------------------

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

export function computeRevenueTrend(
  sales: Sale[],
  range: DateRange,
  granularity: Granularity = pickGranularity(range),
  filters?: SalesFilters,
): TimePoint[] {
  const within = filterSales(sales, range, filters);
  const buckets = buildBuckets(range, granularity);
  const index = new Map<string, TimePoint>(buckets.map((b) => [b.date, b]));
  for (const s of within) {
    const key = bucketKey(new Date(s.date), granularity);
    const bucket = index.get(key);
    if (!bucket) continue;
    bucket.revenue += s.total;
    bucket.orders += 1;
    bucket.itemsSold += s.items.reduce((sum, i) => sum + i.qty, 0);
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// Rankings & breakdowns
// ---------------------------------------------------------------------------

export function computeTopProducts(
  sales: Sale[],
  range: DateRange,
  opts?: { mode?: RankingMode; limit?: number; filters?: SalesFilters },
): ProductRanking[] {
  const mode = opts?.mode ?? "revenue";
  const limit = opts?.limit ?? 10;
  const within = filterSales(sales, range, opts?.filters);

  type Agg = { productId: string | null; name: string; revenue: number; qty: number; orderIds: Set<string> };
  const agg = new Map<string, Agg>();
  let totalRevenue = 0;
  for (const s of within) {
    for (const it of s.items) {
      const key = it.productId ?? `name:${it.name}`;
      const a = agg.get(key) ?? {
        productId: it.productId ?? null,
        name: it.name,
        revenue: 0,
        qty: 0,
        orderIds: new Set<string>(),
      };
      const lineRevenue = it.price * it.qty;
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

export function computeCategoryBreakdown(
  sales: Sale[],
  range: DateRange,
  categoryNameById: Map<string, string>,
  filters?: SalesFilters,
): CategorySlice[] {
  const within = filterSales(sales, range, filters);
  type Agg = { categoryId: string | null; name: string; revenue: number; orderIds: Set<string> };
  const agg = new Map<string, Agg>();
  let total = 0;
  for (const s of within) {
    for (const it of s.items) {
      const categoryId = it.salesCategoryId ?? null;
      const name = categoryId ? categoryNameById.get(categoryId) ?? "Uncategorised" : "Uncategorised";
      const key = categoryId ?? "__none__";
      const a = agg.get(key) ?? { categoryId, name, revenue: 0, orderIds: new Set<string>() };
      const lineRevenue = it.price * it.qty;
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

export function computeOrderPerformance(
  sales: Sale[],
  range: DateRange,
  filters?: SalesFilters,
): OrderPerformance {
  const within = filterSales(sales, range, filters);
  if (within.length === 0) {
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
  for (const s of within) {
    revenueTotal += s.total;
    const items = s.items.reduce((sum, i) => sum + i.qty, 0);
    itemTotal += items;
    if (s.total > largest) largest = s.total;
    if (s.total < smallest) smallest = s.total;
    const c = channels.get(s.channel) ?? { count: 0, revenue: 0 };
    c.count += 1;
    c.revenue += s.total;
    channels.set(s.channel, c);
    const m = methods.get(s.method) ?? { count: 0, revenue: 0 };
    m.count += 1;
    m.revenue += s.total;
    methods.set(s.method, m);
  }
  return {
    averageItemsPerOrder: itemTotal / within.length,
    averageOrderValue: Math.round(revenueTotal / within.length),
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

// ---------------------------------------------------------------------------
// CSV export (client-side, browser file download)
// ---------------------------------------------------------------------------

function csv(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildSalesCsv(
  sales: Sale[],
  range: DateRange,
  filters?: SalesFilters,
): { body: string; rowCount: number; filename: string } {
  const within = filterSales(sales, range, filters);
  const rows: string[] = [
    "Ref,Date,Channel,Method,Customer,Item,Qty,Unit price (PHP),Line total (PHP),Order total (PHP)",
  ];
  for (const s of within) {
    for (const it of s.items) {
      rows.push(
        [
          csv(s.ref),
          new Date(s.date).toISOString(),
          csv(s.channel),
          csv(s.method),
          csv(s.customer ?? ""),
          csv(it.name),
          it.qty,
          it.price.toFixed(2),
          (it.price * it.qty).toFixed(2),
          s.total.toFixed(2),
        ].join(","),
      );
    }
  }
  const filename = `solaris-sales-${range.from.toISOString().slice(0, 10)}-to-${range.to
    .toISOString()
    .slice(0, 10)}.csv`;
  return { body: "﻿" + rows.join("\r\n"), rowCount: rows.length - 1, filename };
}

export function downloadFile(filename: string, body: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
