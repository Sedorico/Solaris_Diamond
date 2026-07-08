import {
  useBusinessStore,
  type Sale,
  type Expense,
  type AttendanceLog,
} from "@/lib/store/business-store";

/**
 * Builds a compact, privacy-safe snapshot of the *current subscriber's* own
 * business data (read client-side from the persisted Zustand store) to hand to
 * the AI as grounding context. We aggregate rather than dump raw rows — keeps
 * the prompt small/cheap and avoids leaking internal IDs. Multi-tenant safety
 * is structural: each browser only holds its own business's data.
 */

const round = (n: number) => Math.round(n);

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function daysAgo(iso: string) {
  const t = startOfDay(new Date());
  const d = startOfDay(new Date(iso));
  return Math.round((t - d) / 86_400_000);
}

function saleCost(sale: Sale) {
  if (typeof sale.cost === "number") return sale.cost;
  return sale.items.reduce((s, it) => s + (it.cost ?? 0) * it.qty, 0);
}

export type BusinessContext = ReturnType<typeof getBusinessContext>;

export function getBusinessContext(opts?: { modules?: string[] }) {
  const s = useBusinessStore.getState();
  const sales: Sale[] = s.sales.filter(
    (x) => x.status === "COMPLETED" && !x.archivedAt,
  );
  const expenses: Expense[] = s.expenses.filter((e) => !e.deletedAt);
  const attendance: AttendanceLog[] = s.attendance;
  const products = s.products;

  // ── Revenue / profit by period ──
  const revenue = { today: 0, yesterday: 0, last7: 0, prev7: 0 };
  const cogs = { today: 0, last7: 0 };
  for (const sale of sales) {
    const d = daysAgo(sale.date);
    if (d === 0) {
      revenue.today += sale.total;
      cogs.today += saleCost(sale);
    }
    if (d === 1) revenue.yesterday += sale.total;
    if (d >= 0 && d < 7) {
      revenue.last7 += sale.total;
      cogs.last7 += saleCost(sale);
    }
    if (d >= 7 && d < 14) revenue.prev7 += sale.total;
  }

  const expenseTotals = { today: 0, last7: 0 };
  const expenseByCategory: Record<string, number> = {};
  const catName = (id: string | null) =>
    id
      ? (s.expenseCategories.find((c) => c.id === id)?.name ?? "Other")
      : "Uncategorized";
  for (const e of expenses) {
    const d = daysAgo(e.date);
    if (d === 0) expenseTotals.today += e.amount;
    if (d >= 0 && d < 7) {
      expenseTotals.last7 += e.amount;
      const name = catName(e.categoryId);
      expenseByCategory[name] = (expenseByCategory[name] ?? 0) + e.amount;
    }
  }

  // ── Product performance (last 7 days) ──
  const unitsByProduct: Record<string, { name: string; units: number; revenue: number }> = {};
  for (const sale of sales) {
    if (daysAgo(sale.date) >= 7) continue;
    for (const it of sale.items) {
      const row = (unitsByProduct[it.productId] ??= {
        name: it.name,
        units: 0,
        revenue: 0,
      });
      row.units += it.qty;
      row.revenue += it.price * it.qty;
    }
  }
  const perf = Object.values(unitsByProduct);
  const topSellers = [...perf]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((p) => ({ product: p.name, units: p.units, revenue: round(p.revenue) }));
  const slowSellers = [...perf]
    .sort((a, b) => a.units - b.units)
    .slice(0, 3)
    .map((p) => ({ product: p.name, units: p.units }));

  // ── Inventory health ──
  const lowStock = products
    .filter((p) => p.onHand <= p.reorderPoint)
    .slice(0, 12)
    .map((p) => ({
      product: p.name,
      onHand: p.onHand,
      reorderPoint: p.reorderPoint,
      reorderQty: p.reorderQty,
    }));
  const inventoryRetailValue = round(
    products.reduce((sum, p) => sum + p.onHand * p.price, 0),
  );

  // ── Attendance (today) ──
  const todayAttendance = attendance.filter((a) => daysAgo(a.date) === 0);
  const late = todayAttendance
    .filter((a) => a.timeIn && a.timeIn > "09:15")
    .map((a) => ({ employee: a.employee, timeIn: a.timeIn }));

  // Scope to the modules the subscriber actually pays for. When `modules` is
  // omitted (e.g. logged-out demo) everything is included.
  const scoped = opts?.modules;
  const has = (m: string) => !scoped || scoped.includes(m);

  const ctx: Record<string, unknown> = {
    currency: "PHP (₱)",
    generatedAt: new Date().toISOString(),
  };
  if (scoped) ctx.subscribedModules = scoped;

  if (has("sales")) {
    ctx.revenue = {
      today: round(revenue.today),
      yesterday: round(revenue.yesterday),
      thisWeek: round(revenue.last7),
      lastWeek: round(revenue.prev7),
    };
    ctx.estimatedProfit = {
      today: round(revenue.today - cogs.today - expenseTotals.today),
      thisWeek: round(revenue.last7 - cogs.last7 - expenseTotals.last7),
    };
    ctx.sales = {
      countToday: sales.filter((x) => daysAgo(x.date) === 0).length,
      topSellersThisWeek: topSellers,
      slowSellersThisWeek: slowSellers,
    };
  }
  if (has("expenses")) {
    ctx.expenses = {
      today: round(expenseTotals.today),
      thisWeek: round(expenseTotals.last7),
      thisWeekByCategory: Object.fromEntries(
        Object.entries(expenseByCategory).map(([k, v]) => [k, round(v)]),
      ),
    };
  }
  if (has("inventory")) {
    ctx.products = {
      total: products.length,
      lowStockCount: products.filter((p) => p.onHand <= p.reorderPoint).length,
      lowStock,
      inventoryRetailValue,
    };
  }
  if (has("attendance")) {
    ctx.attendanceToday = {
      present: todayAttendance.length,
      late,
    };
  }
  return ctx;
}
