"use client";

import type { Expense, ExpenseCategory } from "@/lib/store/business-store";

/**
 * Client-side expense analytics — pure functions that mirror
 * `lib/expenses/service.ts`. The Expense Dashboard renders from these in dev
 * and swaps to the server endpoints in prod without UI changes.
 *
 * Fully STANDALONE — no dependencies on Sales / Inventory / POS.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RangePreset =
  | "today"
  | "7d"
  | "30d"
  | "90d"
  | "month"
  | "ytd"
  | "year"
  | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  preset?: RangePreset;
}

export interface ExpenseFilters {
  categoryId?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
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
  countToday: number;
  countWeek: number;
  countMonth: number;
}

export interface CategorySlice {
  categoryId: string | null;
  name: string;
  color?: string;
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
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(d.getDate() - d.getDay());
  return x;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
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
    case "month":
      return { preset, from: startOfMonth(now), to };
    case "year":
    case "ytd":
      return { preset: "ytd", from: startOfYear(now), to };
    default:
      return { preset: "30d", from: startOfDay(new Date(+now - 29 * 86400000)), to };
  }
}

export function pickGranularity(range: DateRange): Granularity {
  const days = (range.to.getTime() - range.from.getTime()) / 86400000;
  if (days <= 60) return "day";
  if (days <= 180) return "week";
  return "month";
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

function inWindow(expense: Expense, range: DateRange): boolean {
  const t = +new Date(expense.date);
  return t >= +range.from && t <= +range.to;
}

function passesFilters(e: Expense, filters?: ExpenseFilters): boolean {
  if (!filters) return true;
  if (filters.categoryId && e.categoryId !== filters.categoryId) return false;
  if (filters.minAmount != null && e.amount < filters.minAmount) return false;
  if (filters.maxAmount != null && e.amount > filters.maxAmount) return false;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    const hay = [e.title, e.vendor ?? "", e.description ?? ""]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function filterExpenses(
  expenses: Expense[],
  range?: DateRange,
  filters?: ExpenseFilters,
): Expense[] {
  return expenses.filter(
    (e) =>
      !e.deletedAt &&
      (!range || inWindow(e, range)) &&
      passesFilters(e, filters),
  );
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

export function computeKPIs(
  expenses: Expense[],
  categoryNameById: Map<string, string>,
  now = new Date(),
): ExpenseKPIs {
  const ranges = {
    today: { from: startOfDay(now), to: endOfDay(now) },
    week: { from: startOfWeek(now), to: endOfDay(now) },
    month: { from: startOfMonth(now), to: endOfDay(now) },
    year: { from: startOfYear(now), to: endOfDay(now) },
  };

  const alive = expenses.filter((e) => !e.deletedAt);
  const sum = (range: { from: Date; to: Date }) =>
    alive
      .filter((e) => {
        const t = +new Date(e.date);
        return t >= +range.from && t <= +range.to;
      })
      .reduce((s, e) => s + e.amount, 0);
  const count = (range: { from: Date; to: Date }) =>
    alive.filter((e) => {
      const t = +new Date(e.date);
      return t >= +range.from && t <= +range.to;
    }).length;

  const monthList = alive.filter((e) => {
    const t = +new Date(e.date);
    return t >= +ranges.month.from && t <= +ranges.month.to;
  });
  const largest = monthList.reduce((m, e) => Math.max(m, e.amount), 0);

  // Highest category this month
  const catTotals = new Map<string | null, number>();
  for (const e of monthList) {
    const key = e.categoryId ?? null;
    catTotals.set(key, (catTotals.get(key) ?? 0) + e.amount);
  }
  let highestCat: ExpenseKPIs["highestCategoryThisMonth"] = null;
  let highestTotal = -1;
  for (const [k, v] of catTotals) {
    if (v > highestTotal) {
      highestTotal = v;
      highestCat = {
        name: k ? categoryNameById.get(k) ?? "Uncategorised" : "Uncategorised",
        total: v,
      };
    }
  }

  // Average monthly + month-over-month growth
  const monthlyTotals = new Map<string, number>();
  for (const e of alive) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + e.amount);
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
  const mom = lastMonth > 0 ? (thisMonth - lastMonth) / lastMonth : thisMonth > 0 ? null : 0;

  return {
    totalToday: sum(ranges.today),
    totalWeek: sum(ranges.week),
    totalMonth: sum(ranges.month),
    totalYear: sum(ranges.year),
    largestExpenseThisMonth: largest,
    highestCategoryThisMonth: highestCat,
    averageMonthlySpending: Math.round(avgMonthly),
    monthOverMonthGrowth: mom,
    countToday: count(ranges.today),
    countWeek: count(ranges.week),
    countMonth: count(ranges.month),
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

function buildBuckets(range: DateRange, g: Granularity): ExpenseTimePoint[] {
  const out: ExpenseTimePoint[] = [];
  if (g === "month") {
    const d = new Date(range.from.getFullYear(), range.from.getMonth(), 1);
    const end = new Date(range.to.getFullYear(), range.to.getMonth(), 1);
    while (d <= end) {
      out.push({
        label: d.toLocaleString("en", { month: "short" }),
        date: d.toISOString(),
        total: 0,
        count: 0,
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
        total: 0,
        count: 0,
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
      total: 0,
      count: 0,
    });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function computeExpenseTrend(
  expenses: Expense[],
  range: DateRange,
  granularity: Granularity = pickGranularity(range),
  filters?: ExpenseFilters,
): ExpenseTimePoint[] {
  const within = filterExpenses(expenses, range, filters);
  const buckets = buildBuckets(range, granularity);
  const index = new Map<string, ExpenseTimePoint>(buckets.map((b) => [b.date, b]));
  for (const e of within) {
    const key = bucketKey(new Date(e.date), granularity);
    const bucket = index.get(key);
    if (!bucket) continue;
    bucket.total += e.amount;
    bucket.count += 1;
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// Category breakdown
// ---------------------------------------------------------------------------

export function computeCategoryBreakdown(
  expenses: Expense[],
  range: DateRange | undefined,
  categories: ExpenseCategory[],
  filters?: ExpenseFilters,
): CategorySlice[] {
  const within = filterExpenses(expenses, range, filters);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  type Agg = { categoryId: string | null; name: string; color?: string; total: number; count: number };
  const agg = new Map<string, Agg>();
  let total = 0;
  for (const e of within) {
    const key = e.categoryId ?? "__none__";
    const cat = e.categoryId ? categoryById.get(e.categoryId) : null;
    const a = agg.get(key) ?? {
      categoryId: e.categoryId,
      name: cat?.name ?? "Uncategorised",
      color: cat?.color,
      total: 0,
      count: 0,
    };
    a.total += e.amount;
    a.count += 1;
    agg.set(key, a);
    total += e.amount;
  }
  return [...agg.values()]
    .map((a) => ({
      categoryId: a.categoryId,
      name: a.name,
      color: a.color,
      total: a.total,
      count: a.count,
      share: total > 0 ? a.total / total : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function csv(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildExpensesCsv(
  expenses: Expense[],
  categories: ExpenseCategory[],
  range: DateRange,
  filters?: ExpenseFilters,
): { body: string; rowCount: number; total: number; filename: string } {
  const within = filterExpenses(expenses, range, filters)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const catNames = new Map(categories.map((c) => [c.id, c.name]));
  const rows: string[] = [
    "Date,Title,Category,Vendor,Amount (PHP),Description",
  ];
  let total = 0;
  for (const e of within) {
    total += e.amount;
    rows.push(
      [
        new Date(e.date).toISOString().slice(0, 10),
        csv(e.title),
        csv(e.categoryId ? catNames.get(e.categoryId) ?? "Uncategorised" : "Uncategorised"),
        csv(e.vendor ?? ""),
        e.amount.toFixed(2),
        csv(e.description ?? ""),
      ].join(","),
    );
  }
  rows.push("");
  rows.push(`Total,,,${within.length} expenses,,${total.toFixed(2)}`);
  const filename = `solaris-expenses-${range.from.toISOString().slice(0, 10)}-to-${range.to.toISOString().slice(0, 10)}.csv`;
  return { body: "﻿" + rows.join("\r\n"), rowCount: within.length, total, filename };
}

/**
 * Build a printable HTML report. Browsers can save it as PDF via Print → Save
 * as PDF. This gives us a real PDF export without bundling a heavy lib.
 */
export function buildExpensesPrintHtml(opts: {
  businessName: string;
  expenses: Expense[];
  categories: ExpenseCategory[];
  range: DateRange;
  filters?: ExpenseFilters;
  generatedAt?: Date;
}): string {
  const { businessName, expenses, categories, range, filters } = opts;
  const generatedAt = opts.generatedAt ?? new Date();
  const within = filterExpenses(expenses, range, filters)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const catNames = new Map(categories.map((c) => [c.id, c.name]));
  const breakdown = computeCategoryBreakdown(expenses, range, categories, filters);
  const total = within.reduce((s, e) => s + e.amount, 0);
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Expense Report — ${businessName}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Inter',system-ui,sans-serif;color:#1a1a1a;margin:0;padding:48px;background:#fff;line-height:1.5}
  h1{font-family:Georgia,serif;font-size:34px;margin:0 0 4px;letter-spacing:-0.02em}
  h2{font-size:14px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#666;margin:32px 0 12px}
  .header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #ddd;padding-bottom:18px}
  .meta{font-size:12px;color:#666;text-align:right}
  .sun{font-size:13px;letter-spacing:0.4em;color:#888}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:28px}
  .card{border:1px solid #eee;border-radius:8px;padding:16px}
  .card .label{font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#888}
  .card .val{font-family:Georgia,serif;font-size:22px;margin-top:6px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
  th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #eee}
  th{font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#777;font-weight:500}
  .amount{text-align:right;font-variant-numeric:tabular-nums}
  .footer{margin-top:32px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:14px}
  @media print { body{padding:32px} }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="sun">SOLARIS — DIAMOND</div>
    <h1>Expense Report</h1>
    <p style="margin:2px 0;color:#444">${businessName}</p>
  </div>
  <div class="meta">
    <div>${range.from.toDateString()} — ${range.to.toDateString()}</div>
    <div>Generated ${generatedAt.toLocaleString()}</div>
  </div>
</div>

<h2>Summary</h2>
<div class="summary">
  <div class="card"><div class="label">Total Expenses</div><div class="val">${fmt(total)}</div></div>
  <div class="card"><div class="label">Count</div><div class="val">${within.length}</div></div>
  <div class="card"><div class="label">Average / Expense</div><div class="val">${fmt(within.length ? total / within.length : 0)}</div></div>
  <div class="card"><div class="label">Categories</div><div class="val">${breakdown.length}</div></div>
</div>

<h2>Category Breakdown</h2>
<table>
  <thead><tr><th>Category</th><th>Count</th><th class="amount">Total</th><th class="amount">Share</th></tr></thead>
  <tbody>
    ${breakdown
      .map(
        (b) =>
          `<tr><td>${escapeHtml(b.name)}</td><td>${b.count}</td><td class="amount">${fmt(b.total)}</td><td class="amount">${(b.share * 100).toFixed(1)}%</td></tr>`,
      )
      .join("")}
  </tbody>
</table>

<h2>Expense List</h2>
<table>
  <thead><tr><th>Date</th><th>Title</th><th>Category</th><th>Vendor</th><th class="amount">Amount</th></tr></thead>
  <tbody>
    ${within
      .map(
        (e) => `<tr>
          <td>${new Date(e.date).toLocaleDateString()}</td>
          <td>${escapeHtml(e.title)}</td>
          <td>${escapeHtml(e.categoryId ? catNames.get(e.categoryId) ?? "Uncategorised" : "Uncategorised")}</td>
          <td>${escapeHtml(e.vendor ?? "")}</td>
          <td class="amount">${fmt(e.amount)}</td>
        </tr>`,
      )
      .join("")}
  </tbody>
</table>

<div class="footer">
  This report was generated by Solaris Diamond — Expense Tracking. Records are scoped to ${escapeHtml(businessName)} and never include data from other tenants.
</div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

export function openPrintWindow(html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  // Small delay so styles render before the print dialog
  setTimeout(() => {
    try {
      w.print();
    } catch {
      /* user cancelled */
    }
  }, 250);
}

/**
 * Minimal SpreadsheetML (.xls) export — a hand-rolled XML format Excel opens
 * natively. No SheetJS dependency, ~5KB of code, opens in Excel/Numbers/LibreOffice.
 */
export function buildExpensesXls(
  expenses: Expense[],
  categories: ExpenseCategory[],
  range: DateRange,
  filters?: ExpenseFilters,
  businessName = "Solaris Diamond",
): { body: string; rowCount: number; filename: string } {
  const within = filterExpenses(expenses, range, filters).sort(
    (a, b) => +new Date(a.date) - +new Date(b.date),
  );
  const catNames = new Map(categories.map((c) => [c.id, c.name]));

  const cell = (v: string | number, type: "String" | "Number" = "String") =>
    type === "Number"
      ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>`
      : `<Cell><Data ss:Type="String">${escapeXml(String(v))}</Data></Cell>`;

  const rowsXml = within
    .map((e) => {
      const cat = e.categoryId ? catNames.get(e.categoryId) ?? "Uncategorised" : "Uncategorised";
      return `<Row>
        ${cell(new Date(e.date).toISOString().slice(0, 10))}
        ${cell(e.title)}
        ${cell(cat)}
        ${cell(e.vendor ?? "")}
        ${cell(e.amount, "Number")}
        ${cell(e.description ?? "")}
      </Row>`;
    })
    .join("");

  const total = within.reduce((s, e) => s + e.amount, 0);

  const body = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Expenses">
  <Table>
   <Row><Cell><Data ss:Type="String">${escapeXml(businessName)} — Expense Report</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">${range.from.toDateString()} — ${range.to.toDateString()}</Data></Cell></Row>
   <Row/>
   <Row>
    ${cell("Date")}${cell("Title")}${cell("Category")}${cell("Vendor")}${cell("Amount (PHP)")}${cell("Description")}
   </Row>
   ${rowsXml}
   <Row/>
   <Row>${cell("Total")}<Cell/><Cell/>${cell(`${within.length} expenses`)}${cell(total, "Number")}<Cell/></Row>
  </Table>
 </Worksheet>
</Workbook>`;
  const filename = `solaris-expenses-${range.from.toISOString().slice(0, 10)}-to-${range.to.toISOString().slice(0, 10)}.xls`;
  return { body, rowCount: within.length, filename };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
