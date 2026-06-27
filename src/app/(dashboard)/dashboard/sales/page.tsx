"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Wallet,
  ShoppingBag,
  Receipt,
  Crown,
  ArrowDownToLine,
  Search,
  Filter,
  Plus,
  Trash2,
  Archive,
  RotateCcw,
  X,
  Tag,
  SlidersHorizontal,
} from "lucide-react";
import { ModuleGate } from "@/components/dashboard/module-gate";
import { StatCard } from "@/components/dashboard/ui";
import { ActivityHistoryPanel } from "@/components/dashboard/activity-history";
import { CategoryManagerDialog } from "@/components/dashboard/category-manager-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AreaChart, HBarChart, PieChart } from "@/components/dashboard/charts";
import {
  useBusinessStore,
  type SaleChannel,
  type SaleItem,
  type SaleMethod,
} from "@/lib/store/business-store";
import {
  buildSalesCsv,
  computeCategoryBreakdown,
  computeKPIs,
  computeOrderPerformance,
  computeRevenueTrend,
  computeTopProducts,
  downloadFile,
  filterSales,
  pickGranularity,
  previousWindow,
  resolveRange,
  type Granularity,
  type RangePreset,
  type RankingMode,
} from "@/lib/sales/analytics";
import { cn, formatCurrency, formatDate, relativeTime } from "@/lib/utils";

export default function SalesPage() {
  return (
    <ModuleGate serviceId="sales">
      <SalesModule />
    </ModuleGate>
  );
}

const RANGE_OPTIONS: { value: RangePreset; label: string; short: string }[] = [
  { value: "today", label: "Today", short: "Today" },
  { value: "month", label: "This month", short: "Month" },
  { value: "7d", label: "Last 7 days", short: "7d" },
  { value: "30d", label: "Last 30 days", short: "30d" },
  { value: "90d", label: "Last 90 days", short: "90d" },
  { value: "ytd", label: "Year to date", short: "YTD" },
];

const INITIAL_CHANNELS: SaleChannel[] = ["POS", "ONLINE", "MANUAL", "OTHER"];
const METHODS: SaleMethod[] = ["Cash", "GCash", "Maya", "Card", "Bank"];

interface EntryRow {
  id: string;
  itemName: string;
  qty: string;
  price: string;
  categoryId: string;
}

function emptyRow(): EntryRow {
  return { id: Math.random().toString(36).slice(2), itemName: "", qty: "1", price: "", categoryId: "none" };
}

function SalesModule() {
  const sales = useBusinessStore((s) => s.sales);
  const categories = useBusinessStore((s) => s.salesCategories);
  const recordSale = useBusinessStore((s) => s.recordSale);
  const logSalesReport = useBusinessStore((s) => s.logSalesReport);
  const recentReports = useBusinessStore((s) => s.salesReports);
  const addCategory = useBusinessStore((s) => s.addSalesCategory);
  const updateCategory = useBusinessStore((s) => s.updateSalesCategory);
  const deleteCategory = useBusinessStore((s) => s.deleteSalesCategory);
  const archiveSale = useBusinessStore((s) => s.archiveSale);
  const restoreSale = useBusinessStore((s) => s.restoreSale);
  const deleteSale = useBusinessStore((s) => s.deleteSale);
  const salesAuditLogs = useBusinessStore((s) => s.salesAuditLogs);

  const [preset, setPreset] = useState<RangePreset>("month");
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<SaleChannel | "all">("all");
  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [granularity, setGranularity] = useState<Granularity | "auto">("auto");
  const [rankingMode, setRankingMode] = useState<RankingMode>("revenue");

  const [recordOpen, setRecordOpen] = useState(false);
  const [entryRows, setEntryRows] = useState<EntryRow[]>([emptyRow()]);
  const [entryMethod, setEntryMethod] = useState<SaleMethod>("Cash");
  const [entryChannel, setEntryChannel] = useState<SaleChannel>("MANUAL");
  const [entryCustomer, setEntryCustomer] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [channels, setChannels] = useState<SaleChannel[]>(() => {
    if (typeof window === "undefined") return INITIAL_CHANNELS;
    try {
      const saved = localStorage.getItem("solaris-sales-channels");
      return saved ? JSON.parse(saved) : INITIAL_CHANNELS;
    } catch {
      return INITIAL_CHANNELS;
    }
  });
  const [newChannel, setNewChannel] = useState("");
  const [channelMgrOpen, setChannelMgrOpen] = useState(false);

  const [catMgrOpen, setCatMgrOpen] = useState(false);

  const range = useMemo(() => resolveRange(preset), [preset]);
  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      channel: channel === "all" ? undefined : channel,
      categoryId: categoryId === "all" ? undefined : categoryId,
    }),
    [search, channel, categoryId],
  );

  const categoryNames = useMemo(
    () => new Map<string, string>(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  // Archived sales are set aside from the active dashboard + analytics.
  const activeSales = useMemo(() => sales.filter((s) => !s.archivedAt), [sales]);
  const archivedSales = useMemo(() => sales.filter((s) => !!s.archivedAt), [sales]);

  const kpis = useMemo(() => computeKPIs(activeSales, range, filters), [activeSales, range, filters]);
  const effectiveGranularity: Granularity = granularity === "auto" ? pickGranularity(range) : granularity;
  const trend = useMemo(() => computeRevenueTrend(activeSales, range, effectiveGranularity, filters), [activeSales, range, effectiveGranularity, filters]);
  const topProducts = useMemo(() => computeTopProducts(activeSales, range, { mode: rankingMode, limit: 8, filters }), [activeSales, range, rankingMode, filters]);
  const categoryBreakdown = useMemo(() => computeCategoryBreakdown(activeSales, range, categoryNames, filters), [activeSales, range, categoryNames, filters]);
  const orderPerf = useMemo(() => computeOrderPerformance(activeSales, range, filters), [activeSales, range, filters]);
  const ordersInWindow = useMemo(() => filterSales(activeSales, range, filters).slice(0, 12), [activeSales, range, filters]);
  const prevRange = useMemo(() => previousWindow(range), [range]);
  const trendData = trend.map((p) => ({ label: p.label, value: p.revenue }));
  const ordersData = trend.map((p) => ({ label: p.label, value: p.orders }));

  function updateRow(id: string, field: keyof EntryRow, value: string) {
    setEntryRows((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }
  function addRow() { setEntryRows((rows) => [...rows, emptyRow()]); }
  function removeRow(id: string) {
    setEntryRows((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
  }

  const entryTotal = entryRows.reduce((sum, r) => {
    return sum + (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0);
  }, 0);

  function handleRecordSale() {
    const validRows = entryRows.filter(
      (r) => r.itemName.trim() && parseFloat(r.qty) > 0 && parseFloat(r.price) > 0,
    );
    if (validRows.length === 0) {
      toast.error("Add at least one valid item with name, qty, and price.");
      return;
    }
    setIsSubmitting(true);
    const items: SaleItem[] = validRows.map((r) => ({
      productId: `manual_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: r.itemName.trim(),
      qty: Math.max(1, Math.floor(parseFloat(r.qty))),
      price: parseFloat(r.price),
      salesCategoryId: r.categoryId === "none" ? null : r.categoryId,
    }));
    recordSale(items, entryMethod, {
      channel: entryChannel,
      customer: entryCustomer.trim() || undefined,
      notes: entryNotes.trim() || undefined,
    });
    toast.success("Sale recorded", {
      description: `${items.length} item${items.length > 1 ? "s" : ""} · ${formatCurrency(entryTotal)}`,
    });
    setEntryRows([emptyRow()]);
    setEntryCustomer("");
    setEntryNotes("");
    setIsSubmitting(false);
    setRecordOpen(false);
  }

  function handleExport() {
    const csv = buildSalesCsv(activeSales, range, filters);
    downloadFile(csv.filename, csv.body);
    logSalesReport({
      kind: "EXPORT_CSV",
      rangeFrom: range.from.toISOString(),
      rangeTo: range.to.toISOString(),
      filters,
      rowCount: csv.rowCount,
      exportedFile: csv.filename,
    });
    toast.success("CSV exported", {
      description: `${csv.rowCount} line${csv.rowCount === 1 ? "" : "s"} saved to ${csv.filename}`,
    });
  }

  function handleAddChannel() {
    const val = newChannel.trim().toUpperCase() as SaleChannel;
    if (!val || channels.includes(val)) return;
    const updated = [...channels, val];
    setChannels(updated);
    localStorage.setItem("solaris-sales-channels", JSON.stringify(updated));
    setNewChannel("");
  }

  function handleRemoveChannel(c: SaleChannel) {
    const updated = channels.filter((x) => x !== c);
    setChannels(updated);
    localStorage.setItem("solaris-sales-channels", JSON.stringify(updated));
    if (channel === c) setChannel("all");
    if (entryChannel === c) setEntryChannel(updated[0] ?? "MANUAL" as SaleChannel);
  }

  function handleDeleteCategory(id: string) {
    const res = deleteCategory(id);
    if (!res.ok) toast.error(res.reason);
    else if (categoryId === id) setCategoryId("all");
  }

  return (
    <div className="mx-auto max-w-6xl font-display">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">
              <span className="h-px w-8 bg-accent/50" />
              <span>Module</span>
            </div>
            <h2 className="font-display mt-3 text-3xl font-normal tracking-tight sm:text-4xl">
              Sales
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Revenue, orders and product performance —{" "}
              {RANGE_OPTIONS.find((o) => o.value === preset)?.label.toLowerCase()}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setChannelMgrOpen(true)}>
              <SlidersHorizontal className="size-4" />
              Manage Channels
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCatMgrOpen(true)}>
              <Tag className="size-4" />
              Manage Categories
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm">
              <ArrowDownToLine className="size-4" />
              Export CSV
            </Button>
            <Button variant="accent" size="sm" onClick={() => setRecordOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Record Sale
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="glass inline-flex rounded-full p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPreset(opt.value)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  preset === opt.value
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.short}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs flex-1 min-w-[180px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ref, customer, item…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>

          <Select value={channel} onValueChange={(v) => setChannel(v as SaleChannel | "all")}>
            <SelectTrigger className="h-9 w-36 text-xs">
              <Filter className="size-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              {channels.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-9 w-40 text-xs">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatCurrency(kpis.revenue)} icon={Wallet} delta={kpis.revenueGrowth != null ? Math.round(kpis.revenueGrowth * 1000) / 10 : undefined} hint={`vs prev ${RANGE_OPTIONS.find((o) => o.value === preset)?.short.toLowerCase() ?? ""}`} index={0} />
        <StatCard label="Orders" value={String(kpis.orders)} icon={ShoppingBag} delta={kpis.ordersGrowth != null ? Math.round(kpis.ordersGrowth * 1000) / 10 : undefined} index={1} />
        <StatCard label="Avg. order value" value={formatCurrency(kpis.averageOrderValue)} icon={Receipt} index={2} />
        <StatCard label="Best seller" value={kpis.bestSeller?.name ?? "—"} icon={Crown} hint={kpis.bestSeller ? formatCurrency(kpis.bestSeller.revenue) : undefined} index={3} />
      </div>

      {/* Secondary KPI strip */}
      <div className="mt-3 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
        <KpiCell label="Items sold" value={kpis.itemsSold.toLocaleString()} />
        <KpiCell label="Gross margin" value={formatCurrency(kpis.grossMargin)} hint={`${(kpis.marginRate * 100).toFixed(1)}% rate`} />
        <KpiCell label="Refund rate" value={`${(kpis.refundRate * 100).toFixed(1)}%`} />
        <KpiCell label="Top method" value={kpis.topMethod ?? "—"} />
      </div>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="mt-6 flex flex-col gap-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card>
              <CardHead
                title="Revenue trend"
                subtitle={`${formatDate(range.from)} – ${formatDate(range.to)}`}
                right={
                  <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity | "auto")}>
                    <TabsList className="h-9">
                      <TabsTrigger value="auto" className="text-xs">Auto</TabsTrigger>
                      <TabsTrigger value="day" className="text-xs">Day</TabsTrigger>
                      <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
                      <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
                    </TabsList>
                  </Tabs>
                }
              />
              <AreaChart data={trendData} />
              <p className="mt-2 text-xs text-muted-foreground">
                Compared with {formatDate(prevRange.from)} – {formatDate(prevRange.to)}
              </p>
            </Card>
            <Card>
              <CardHead
                title="Top products"
                subtitle={`Ranked by ${rankingLabel(rankingMode)}`}
                right={
                  <Tabs value={rankingMode} onValueChange={(v) => setRankingMode(v as RankingMode)}>
                    <TabsList className="h-9">
                      <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
                      <TabsTrigger value="qty" className="text-xs">Qty</TabsTrigger>
                      <TabsTrigger value="frequency" className="text-xs">Freq</TabsTrigger>
                    </TabsList>
                  </Tabs>
                }
              />
              <TopProductList products={topProducts} mode={rankingMode} />
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHead title="Orders over time" />
              <AreaChart data={ordersData} />
            </Card>
            <Card>
              <CardHead title="Category breakdown" />
              <CategoryBreakdownList rows={categoryBreakdown} />
            </Card>
          </div>
        </TabsContent>

        {/* ── TRENDS ── */}
        <TabsContent value="trends" className="mt-6 flex flex-col gap-6">
          <Card>
            <CardHead
              title="Revenue trend"
              subtitle="Revenue per bucket in the active window"
              right={
                <Tabs value={effectiveGranularity} onValueChange={(v) => setGranularity(v as Granularity | "auto")}>
                  <TabsList className="h-9">
                    <TabsTrigger value="day" className="text-xs">Daily</TabsTrigger>
                    <TabsTrigger value="week" className="text-xs">Weekly</TabsTrigger>
                    <TabsTrigger value="month" className="text-xs">Monthly</TabsTrigger>
                  </TabsList>
                </Tabs>
              }
            />
            <AreaChart data={trendData} />
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHead title="Items sold" />
              <AreaChart data={trend.map((p) => ({ label: p.label, value: p.itemsSold }))} />
            </Card>
            <Card>
              <CardHead title="Orders" />
              <AreaChart data={ordersData} />
            </Card>
          </div>
        </TabsContent>

        {/* ── PRODUCTS ── */}
        <TabsContent value="products" className="mt-6 flex flex-col gap-6">
          <Card>
            <CardHead
              title="Product performance"
              subtitle="Top 8 by ranking mode"
              right={
                <Tabs value={rankingMode} onValueChange={(v) => setRankingMode(v as RankingMode)}>
                  <TabsList className="h-9">
                    <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
                    <TabsTrigger value="qty" className="text-xs">Qty</TabsTrigger>
                    <TabsTrigger value="frequency" className="text-xs">Frequency</TabsTrigger>
                  </TabsList>
                </Tabs>
              }
            />
            <ProductPerfBars products={topProducts} mode={rankingMode} />
          </Card>
          <Card>
            <CardHead title="Detailed product table" />
            <ProductTable products={topProducts} mode={rankingMode} />
          </Card>
        </TabsContent>

        {/* ── ORDERS ── */}
        <TabsContent value="orders" className="mt-6 flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Avg. items / order" value={orderPerf.averageItemsPerOrder.toFixed(2)} index={0} />
            <StatCard label="Avg. order value" value={formatCurrency(orderPerf.averageOrderValue)} index={1} />
            <StatCard label="Largest order" value={formatCurrency(orderPerf.largestOrder)} index={2} />
            <StatCard label="Smallest order" value={formatCurrency(orderPerf.smallestOrder)} index={3} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHead title="By channel" />
              <DistributionList rows={orderPerf.byChannel.map((r) => ({ label: r.channel, count: r.count, revenue: r.revenue }))} />
            </Card>
            <Card>
              <CardHead title="By payment method" />
              <DistributionList rows={orderPerf.byMethod.map((r) => ({ label: r.method, count: r.count, revenue: r.revenue }))} />
            </Card>
          </div>
          <Card>
            <CardHead title="Recent orders" subtitle={`${ordersInWindow.length} of ${filterSales(activeSales, range, filters).length} in window`} />
            <OrdersList
              orders={ordersInWindow}
              onArchive={(id) => { archiveSale(id); toast.success("Order archived"); }}
            />
          </Card>

          {archivedSales.length > 0 && (
            <Card>
              <CardHead title="Archived" subtitle={`${archivedSales.length} archived — restore, or delete permanently`} />
              <OrdersList
                orders={archivedSales}
                onRestore={(id) => { restoreSale(id); toast.success("Order restored"); }}
                onDelete={(id) => { deleteSale(id); toast.success("Order deleted"); }}
              />
            </Card>
          )}

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <ActivityHistoryPanel
              title="Sales activity"
              entries={salesAuditLogs.map((l) => ({
                id: l.id,
                action: l.action,
                label: l.entityLabel,
                user: l.user,
                createdAt: l.createdAt,
              }))}
            />
          </div>
        </TabsContent>

        {/* ── REPORTS ── */}
        <TabsContent value="reports" className="mt-6 flex flex-col gap-6">
          <Card>
            <CardHead title="Generate report" subtitle="Download the active window as CSV — every export is logged in the audit trail below." />
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button variant="accent" onClick={handleExport}>
                <ArrowDownToLine className="size-4" />
                Export CSV ({formatDate(range.from)} – {formatDate(range.to)})
              </Button>
              <Button variant="outline" onClick={() => {
                logSalesReport({ kind: "DASHBOARD_VIEW", rangeFrom: range.from.toISOString(), rangeTo: range.to.toISOString(), filters });
                toast.success("Snapshot logged to audit trail");
              }}>
                <Receipt className="size-4" />
                Log dashboard snapshot
              </Button>
            </div>
          </Card>
          <Card>
            <CardHead title="Audit trail" subtitle="Report generations and exports for this tenant" />
            <ReportsAudit reports={recentReports} />
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── RECORD SALE MODAL ── */}
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Record a sale</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Manually enter items sold. Stock levels are not affected.
            </p>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Items
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                {entryRows.length} line{entryRows.length === 1 ? "" : "s"}
              </span>
            </div>

            {entryRows.map((row, idx) => {
              const lineTotal = (parseFloat(row.qty) || 0) * (parseFloat(row.price) || 0);
              return (
                <div key={row.id} className="rounded-xl border border-border bg-background/40 p-4 transition-colors hover:border-border/80">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Item {idx + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="tabular text-sm font-semibold">
                        {lineTotal > 0 ? formatCurrency(lineTotal) : "—"}
                      </span>
                      <button
                        onClick={() => removeRow(row.id)}
                        disabled={entryRows.length === 1}
                        title="Remove item"
                        className="text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-muted-foreground"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-12">
                    <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-12">
                      <Label className="text-xs">Item name</Label>
                      <Input placeholder="e.g. Artisan Cold Brew 1L" value={row.itemName} onChange={(e) => updateRow(row.id, "itemName", e.target.value)} className="h-9" />
                    </div>
                    <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-6">
                      <Label className="text-xs">Category</Label>
                      <Select value={row.categoryId} onValueChange={(v) => updateRow(row.id, "categoryId", v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Uncategorised" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Uncategorised</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5 sm:col-span-3">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" min="1" value={row.qty} onChange={(e) => updateRow(row.id, "qty", e.target.value)} className="h-9" />
                    </div>
                    <div className="flex flex-col gap-1.5 sm:col-span-3">
                      <Label className="text-xs">Unit price (₱)</Label>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" value={row.price} onChange={(e) => updateRow(row.id, "price", e.target.value)} className="h-9" />
                    </div>
                  </div>
                </div>
              );
            })}

            <Button variant="outline" size="sm" onClick={addRow} className="w-full border-dashed">
              <Plus className="size-4" /> Add item
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Payment &amp; details
            </span>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label>Payment method</Label>
                <Select value={entryMethod} onValueChange={(v) => setEntryMethod(v as SaleMethod)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Channel</Label>
                <Select value={entryChannel} onValueChange={(v) => setEntryChannel(v as SaleChannel)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {channels.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Customer <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input placeholder="Customer name" value={entryCustomer} onChange={(e) => setEntryCustomer(e.target.value)} className="h-9" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input placeholder="Any remarks" value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} className="h-9" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Order total</p>
              <p className="text-2xl font-semibold tabular">{formatCurrency(entryTotal)}</p>
            </div>
            <Button variant="accent" size="lg" onClick={handleRecordSale} disabled={isSubmitting || entryTotal === 0}>
              <Receipt className="size-4" /> Record sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── CHANNEL MANAGER MODAL ── */}
      <Dialog open={channelMgrOpen} onOpenChange={setChannelMgrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Manage channels</DialogTitle>
            <p className="text-sm text-muted-foreground">Add or remove sales channels.</p>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            {channels.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No channels yet.</p>
            )}
            {channels.map((c) => (
              <div key={c} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-sm font-medium">{c}</span>
                <button onClick={() => handleRemoveChannel(c)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="e.g. SHOPEE"
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddChannel()}
                className="h-9"
              />
              <Button variant="accent" size="sm" onClick={handleAddChannel}>
                <Plus className="size-4" /> Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── CATEGORY MANAGER MODAL ── */}
      <CategoryManagerDialog
        open={catMgrOpen}
        onOpenChange={setCatMgrOpen}
        categories={categories}
        onAdd={(name, color) => {
          addCategory({ name, color });
          toast.success(`Category "${name}" added`);
        }}
        onUpdate={(id, name, color) => {
          updateCategory(id, { name, color });
          toast.success("Category updated");
        }}
        onDelete={handleDeleteCategory}
        usageCount={(cat) =>
          sales.filter((s) => s.items.some((i) => i.salesCategoryId === cat.id)).length
        }
        usageNoun="sale"
        placeholder="e.g. Beverages"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-border bg-card p-6", className)}>{children}</div>;
}

function CardHead({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function KpiCell({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-background px-5 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1.5 truncate text-lg font-semibold tabular">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function rankingLabel(mode: RankingMode): string {
  switch (mode) {
    case "qty": return "units sold";
    case "frequency": return "order frequency";
    default: return "revenue";
  }
}

function rankingValue(p: { revenue: number; qty: number; orders: number }, mode: RankingMode) {
  if (mode === "qty") return `${p.qty.toLocaleString()} units`;
  if (mode === "frequency") return `${p.orders} orders`;
  return formatCurrency(p.revenue);
}

function TopProductList({ products, mode }: { products: ReturnType<typeof computeTopProducts>; mode: RankingMode }) {
  if (products.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No sales in this window.</p>;
  const max = mode === "qty" ? Math.max(...products.map((p) => p.qty)) : mode === "frequency" ? Math.max(...products.map((p) => p.orders)) : Math.max(...products.map((p) => p.revenue));
  return (
    <div className="flex flex-col gap-3.5">
      {products.map((p, i) => {
        const v = mode === "qty" ? p.qty : mode === "frequency" ? p.orders : p.revenue;
        return (
          <div key={(p.productId ?? p.name) + i} className="flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-muted-foreground">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-sm font-medium tabular">{rankingValue(p, mode)}</p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-accent" style={{ width: `${max > 0 ? (v / max) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProductPerfBars({ products, mode }: { products: ReturnType<typeof computeTopProducts>; mode: RankingMode }) {
  if (products.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>;
  const data = products.map((p) => ({ label: p.name, value: mode === "qty" ? p.qty : mode === "frequency" ? p.orders : p.revenue }));
  const format = (v: number) => (mode === "revenue" ? formatCurrency(v) : `${v}`);
  return (
    <div className="flex flex-col items-center gap-8 lg:flex-row lg:gap-10">
      <PieChart data={data} showLegend={false} className="shrink-0" />
      <HBarChart data={data} colored format={format} className="flex-1" />
    </div>
  );
}

function ProductTable({ products, mode }: { products: ReturnType<typeof computeTopProducts>; mode: RankingMode }) {
  if (products.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No sales in this window.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left">
          <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-3 pr-3 font-medium">#</th>
            <th className="py-3 pr-3 font-medium">Product</th>
            <th className="py-3 pr-3 text-right font-medium">Units</th>
            <th className="py-3 pr-3 text-right font-medium">Orders</th>
            <th className="py-3 pr-3 text-right font-medium">Revenue</th>
            <th className="py-3 pr-3 text-right font-medium">Share</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={(p.productId ?? p.name) + i} className={cn("border-b border-border/60 last:border-0", mode === "revenue" && i === 0 && "bg-accent/[0.04]")}>
              <td className="py-3 pr-3 text-muted-foreground tabular">{i + 1}</td>
              <td className="py-3 pr-3 font-medium">{p.name}</td>
              <td className="py-3 pr-3 text-right tabular">{p.qty.toLocaleString()}</td>
              <td className="py-3 pr-3 text-right tabular">{p.orders}</td>
              <td className="py-3 pr-3 text-right font-medium tabular">{formatCurrency(p.revenue)}</td>
              <td className="py-3 pr-3 text-right tabular text-muted-foreground">{(p.share * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoryBreakdownList({ rows }: { rows: ReturnType<typeof computeCategoryBreakdown> }) {
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No category data.</p>;
  const max = Math.max(...rows.map((r) => r.revenue));
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.categoryId ?? r.name} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{r.name}</span>
            <span className="tabular text-muted-foreground">{formatCurrency(r.revenue)} · {(r.share * 100).toFixed(1)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-foreground/70" style={{ width: `${max > 0 ? (r.revenue / max) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DistributionList({ rows }: { rows: Array<{ label: string; count: number; revenue: number }> }) {
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No data.</p>;
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{r.label}</Badge>
            <span className="text-muted-foreground">{r.count} orders</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="tabular font-medium">{formatCurrency(r.revenue)}</span>
            <span className="text-xs text-muted-foreground">{totalRevenue > 0 ? `${((r.revenue / totalRevenue) * 100).toFixed(0)}%` : "—"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function OrdersList({
  orders,
  onArchive,
  onRestore,
  onDelete,
}: {
  orders: ReturnType<typeof filterSales>;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  if (orders.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No orders in this window.</p>;
  const hasActions = !!(onArchive || onRestore || onDelete);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left">
          <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-3 pr-3 font-medium">Ref</th>
            <th className="py-3 pr-3 font-medium">Date</th>
            <th className="py-3 pr-3 font-medium">Channel</th>
            <th className="py-3 pr-3 font-medium">Method</th>
            <th className="py-3 pr-3 text-right font-medium">Items</th>
            <th className="py-3 pr-3 text-right font-medium">Total</th>
            {hasActions && <th className="py-3 text-right font-medium" />}
          </tr>
        </thead>
        <tbody>
          {orders.map((s) => {
            const itemCount = s.items.reduce((sum, i) => sum + i.qty, 0);
            return (
              <tr key={s.id} className="border-b border-border/60 last:border-0">
                <td className="py-3 pr-3 font-mono text-xs">{s.ref}</td>
                <td className="py-3 pr-3 text-muted-foreground">{formatDate(s.date)} · {new Date(s.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</td>
                <td className="py-3 pr-3"><Badge variant="secondary">{s.channel}</Badge></td>
                <td className="py-3 pr-3">{s.method}</td>
                <td className="py-3 pr-3 text-right tabular">{itemCount}</td>
                <td className="py-3 pr-3 text-right font-medium tabular">{formatCurrency(s.total)}</td>
                {hasActions && (
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onArchive && (
                        <Button variant="ghost" size="icon-sm" onClick={() => onArchive(s.id)} title="Archive">
                          <Archive className="size-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                      )}
                      {onRestore && (
                        <Button variant="ghost" size="icon-sm" onClick={() => onRestore(s.id)} title="Restore">
                          <RotateCcw className="size-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button variant="ghost" size="icon-sm" onClick={() => onDelete(s.id)} title="Delete permanently">
                          <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReportsAudit({ reports }: { reports: ReturnType<typeof useBusinessStore.getState>["salesReports"] }) {
  if (reports.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No reports generated yet.</p>;
  const kindBadgeVariant = (kind: string): "secondary" | "outline" | "accent" => {
    if (kind.startsWith("EXPORT")) return "accent";
    if (kind === "DASHBOARD_VIEW") return "outline";
    return "secondary";
  };
  return (
    <div className="flex flex-col">
      {reports.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0">
          <div className="flex items-center gap-3">
            <Badge variant={kindBadgeVariant(r.kind)} className="font-mono text-[10px]">{r.kind}</Badge>
            <span className="text-sm">{formatDate(r.rangeFrom)} – {formatDate(r.rangeTo)}</span>
            {r.exportedFile && <span className="font-mono text-xs text-muted-foreground">{r.exportedFile}</span>}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {r.rowCount != null && <span className="tabular">{r.rowCount} rows</span>}
            <span>{r.user}</span>
            <span>{relativeTime(r.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}