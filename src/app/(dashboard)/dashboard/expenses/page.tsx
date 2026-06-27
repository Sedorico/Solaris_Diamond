"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Wallet,
  Layers,
  Receipt,
  Trash2,
  Archive,
  ArrowDownToLine,
  Search,
  Filter,
  Pencil,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  Tags,
  TrendingUp,
} from "lucide-react";
import { ModuleGate } from "@/components/dashboard/module-gate";
import { StatCard } from "@/components/dashboard/ui";
import { ActivityHistoryPanel } from "@/components/dashboard/activity-history";
import { AreaChart } from "@/components/dashboard/charts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useBusinessStore,
  type Expense,
  type ExpenseDraft,
  type ExpenseCategory,
} from "@/lib/store/business-store";
import {
  buildExpensesCsv,
  buildExpensesPrintHtml,
  buildExpensesXls,
  computeCategoryBreakdown,
  computeExpenseTrend,
  computeKPIs,
  downloadFile,
  filterExpenses,
  openPrintWindow,
  pickGranularity,
  resolveRange,
  type ExpenseFilters,
  type Granularity,
  type RangePreset,
} from "@/lib/expenses/analytics";
import { useSession } from "@/lib/auth/hooks";
import { cn, formatCurrency, formatDate, relativeTime } from "@/lib/utils";

export default function ExpensesPage() {
  return (
    <ModuleGate serviceId="expenses">
      <ExpensesModule />
    </ModuleGate>
  );
}

const RANGE_OPTIONS: { value: RangePreset; label: string; short: string }[] = [
  { value: "today", label: "Today", short: "Today" },
  { value: "7d", label: "Last 7 days", short: "7d" },
  { value: "30d", label: "Last 30 days", short: "30d" },
  { value: "90d", label: "Last 90 days", short: "90d" },
  { value: "month", label: "This month", short: "Month" },
  { value: "ytd", label: "Year to date", short: "YTD" },
];

const PALETTE = [
  "#5E81AC", "#BF616A", "#A3BE8C", "#D08770",
  "#88C0D0", "#EBCB8B", "#B48EAD", "#9ca3af",
];

function ExpensesModule() {
  const expenses = useBusinessStore((s) => s.expenses);
  const expenseCategories = useBusinessStore((s) => s.expenseCategories);
  const expenseAuditLogs = useBusinessStore((s) => s.expenseAuditLogs);
  const expenseReports = useBusinessStore((s) => s.expenseReports);

  const addExpense = useBusinessStore((s) => s.addExpense);
  const updateExpense = useBusinessStore((s) => s.updateExpense);
  const deleteExpense = useBusinessStore((s) => s.deleteExpense);
  const restoreExpense = useBusinessStore((s) => s.restoreExpense);
  const purgeExpense = useBusinessStore((s) => s.purgeExpense);
  const addCategory = useBusinessStore((s) => s.addExpenseCategory);
  const updateCategory = useBusinessStore((s) => s.updateExpenseCategory);
  const deleteCategory = useBusinessStore((s) => s.deleteExpenseCategory);
  const logReport = useBusinessStore((s) => s.logExpenseReport);

  const { user } = useSession();
  const businessName = user?.businessName ?? user?.fullName ?? "Solaris Diamond";

  // Filters / range
  const [preset, setPreset] = useState<RangePreset>("month");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [sort, setSort] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");

  // Dialog state — add / edit
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [draft, setDraft] = useState<ExpenseDraft>({
    title: "",
    amount: 0,
    categoryId: null,
  });
  const [draftDate, setDraftDate] = useState<string>("");

  // Category mgr dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PALETTE[0]);

  const range = useMemo(() => resolveRange(preset), [preset]);
  const filters: ExpenseFilters = useMemo(
    () => ({
      categoryId: categoryFilter === "all" ? undefined : categoryFilter,
      search: search.trim() || undefined,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
    }),
    [categoryFilter, search, minAmount, maxAmount],
  );

  const categoryById = useMemo(
    () => new Map(expenseCategories.map((c) => [c.id, c])),
    [expenseCategories],
  );
  const categoryNameMap = useMemo(
    () => new Map(expenseCategories.map((c) => [c.id, c.name])),
    [expenseCategories],
  );

  const kpis = useMemo(
    () => computeKPIs(expenses, categoryNameMap),
    [expenses, categoryNameMap],
  );

  const granularity: Granularity = pickGranularity(range);
  const trend = useMemo(
    () => computeExpenseTrend(expenses, range, granularity, filters),
    [expenses, range, granularity, filters],
  );
  const breakdown = useMemo(
    () => computeCategoryBreakdown(expenses, range, expenseCategories, filters),
    [expenses, range, expenseCategories, filters],
  );

  const filteredExpenses = useMemo(() => {
    const within = filterExpenses(expenses, range, filters);
    const sorted = [...within];
    switch (sort) {
      case "date_asc": sorted.sort((a, b) => +new Date(a.date) - +new Date(b.date)); break;
      case "amount_desc": sorted.sort((a, b) => b.amount - a.amount); break;
      case "amount_asc": sorted.sort((a, b) => a.amount - b.amount); break;
      default: sorted.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    }
    return sorted;
  }, [expenses, range, filters, sort]);

  const totalInWindow = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const trendData = trend.map((p) => ({ label: p.label, value: p.total }));

  // ---------- Handlers ----------

  function openAddDialog() {
    setEditing(null);
    setDraft({
      title: "",
      amount: 0,
      categoryId: expenseCategories[0]?.id ?? null,
    });
    setDraftDate(new Date().toISOString().slice(0, 10));
    setDialogOpen(true);
  }

  function openEditDialog(expense: Expense) {
    setEditing(expense);
    setDraft({
      title: expense.title,
      amount: expense.amount,
      categoryId: expense.categoryId,
      vendor: expense.vendor,
      description: expense.description,
      notes: expense.notes,
    });
    setDraftDate(new Date(expense.date).toISOString().slice(0, 10));
    setDialogOpen(true);
  }

  function saveExpense() {
    if (!draft.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!draft.amount || draft.amount <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    const date = draftDate
      ? new Date(draftDate).toISOString()
      : new Date().toISOString();
    if (editing) {
      updateExpense(editing.id, { ...draft, date });
      toast.success("Expense updated");
    } else {
      addExpense({ ...draft, date });
      toast.success("Expense added");
    }
    setDialogOpen(false);
  }

  function openEditCat(cat: ExpenseCategory) {
    setEditingCat(cat);
    setNewCatName(cat.name);
    setNewCatColor(cat.color ?? PALETTE[0]);
  }

  function resetCatForm() {
    setEditingCat(null);
    setNewCatName("");
    setNewCatColor(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
  }

  function handleSaveCat() {
    if (!newCatName.trim()) {
      toast.error("Enter a category name");
      return;
    }
    if (editingCat) {
      updateCategory(editingCat.id, { name: newCatName.trim(), color: newCatColor });
      toast.success("Category updated");
    } else {
      const cat = addCategory({ name: newCatName.trim(), color: newCatColor });
      toast.success(`Category "${cat.name}" created`);
    }
    resetCatForm();
  }

  function handleDeleteCategory(id: string) {
    const res = deleteCategory(id);
    if (!res.ok) {
      toast.error(res.reason ?? "Cannot delete this category");
    } else {
      toast.success("Category removed");
    }
  }

  function handleExportCsv() {
    const csv = buildExpensesCsv(expenses, expenseCategories, range, filters);
    downloadFile(csv.filename, csv.body);
    logReport({
      kind: "EXPORT_CSV",
      rangeFrom: range.from.toISOString(),
      rangeTo: range.to.toISOString(),
      filters: filters as Record<string, unknown>,
      rowCount: csv.rowCount,
      total: csv.total,
      exportedFile: csv.filename,
    });
    toast.success("CSV exported", {
      description: `${csv.rowCount} expense${csv.rowCount === 1 ? "" : "s"} · ${formatCurrency(csv.total)}`,
    });
  }

  function handleExportXls() {
    const xls = buildExpensesXls(expenses, expenseCategories, range, filters, businessName);
    downloadFile(xls.filename, xls.body, "application/vnd.ms-excel");
    logReport({
      kind: "EXPORT_XLSX",
      rangeFrom: range.from.toISOString(),
      rangeTo: range.to.toISOString(),
      filters: filters as Record<string, unknown>,
      rowCount: xls.rowCount,
      exportedFile: xls.filename,
    });
    toast.success("Excel exported", {
      description: `${xls.rowCount} expense${xls.rowCount === 1 ? "" : "s"} · ${xls.filename}`,
    });
  }

  function handleExportPdf() {
    const html = buildExpensesPrintHtml({
      businessName,
      expenses,
      categories: expenseCategories,
      range,
      filters,
    });
    openPrintWindow(html);
    logReport({
      kind: "EXPORT_PDF",
      rangeFrom: range.from.toISOString(),
      rangeTo: range.to.toISOString(),
      filters: filters as Record<string, unknown>,
      rowCount: filterExpenses(expenses, range, filters).length,
    });
    toast.success("Print preview opened", {
      description: "Choose 'Save as PDF' in the print dialog.",
    });
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
              Expense Tracking
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              See where your money is going — {RANGE_OPTIONS.find((o) => o.value === preset)?.label.toLowerCase()}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setCatDialogOpen(true)} variant="outline">
              <Tags className="size-4" /> Manage Categories
            </Button>
            <Button onClick={openAddDialog} variant="accent">
              <Plus className="size-4" /> Add expense
            </Button>
          </div>
        </div>

        {/* Range pills + filters */}
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
              placeholder="Search title, vendor, notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-40 text-xs">
              <Filter className="size-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {expenseCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today" value={formatCurrency(kpis.totalToday)} icon={Wallet} hint={`${kpis.countToday} expense${kpis.countToday === 1 ? "" : "s"}`} index={0} />
        <StatCard label="This week" value={formatCurrency(kpis.totalWeek)} icon={Receipt} hint={`${kpis.countWeek} expense${kpis.countWeek === 1 ? "" : "s"}`} index={1} />
        <StatCard label="This month" value={formatCurrency(kpis.totalMonth)} icon={Layers} delta={kpis.monthOverMonthGrowth != null ? Math.round(kpis.monthOverMonthGrowth * 1000) / 10 : undefined} hint="vs last month" index={2} />
        <StatCard label="This year" value={formatCurrency(kpis.totalYear)} icon={TrendingUp} index={3} />
      </div>

      {/* Secondary KPI strip */}
      <div className="mt-3 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
        <KpiCell label="Highest category" value={kpis.highestCategoryThisMonth?.name ?? "—"} hint={kpis.highestCategoryThisMonth ? formatCurrency(kpis.highestCategoryThisMonth.total) : "no spend this month"} />
        <KpiCell label="Largest expense" value={formatCurrency(kpis.largestExpenseThisMonth)} hint="this month" />
        <KpiCell label="Avg. monthly" value={formatCurrency(kpis.averageMonthlySpending)} hint="all time" />
      </div>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ───────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-6 flex flex-col gap-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card>
              <CardHead
                title="Spending trend"
                subtitle={`${formatDate(range.from)} – ${formatDate(range.to)} · ${formatCurrency(totalInWindow)} total`}
              />
              <AreaChart data={trendData} />
            </Card>
            <Card>
              <CardHead title="Category breakdown" />
              <BreakdownList rows={breakdown} />
            </Card>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <ActivityHistoryPanel
              title="Expenses activity"
              entries={expenseAuditLogs.map((l) => ({
                id: l.id,
                action: l.action,
                label: l.entityLabel,
                user: l.user,
                createdAt: l.createdAt,
              }))}
            />
          </div>
        </TabsContent>

        {/* ── HISTORY ────────────────────────────────────────────── */}
        <TabsContent value="history" className="mt-6 flex flex-col gap-4">
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold tracking-tight">Expense history</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {filteredExpenses.length} expense{filteredExpenses.length === 1 ? "" : "s"} · {formatCurrency(totalInWindow)} total
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input type="number" placeholder="Min ₱" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="h-9 w-24 text-sm" />
                <Input type="number" placeholder="Max ₱" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="h-9 w-24 text-sm" />
                <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                  <SelectTrigger className="h-9 w-40 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">Date · newest first</SelectItem>
                    <SelectItem value="date_asc">Date · oldest first</SelectItem>
                    <SelectItem value="amount_desc">Amount · highest first</SelectItem>
                    <SelectItem value="amount_asc">Amount · lowest first</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <ExpenseTable
              expenses={filteredExpenses}
              categoryById={categoryById}
              onEdit={openEditDialog}
              onDelete={(id) => {
                deleteExpense(id);
                toast.success("Expense archived");
              }}
            />
          </Card>
          <DeletedSection
            expenses={expenses}
            categoryById={categoryById}
            onRestore={(id) => {
              restoreExpense(id);
              toast.success("Expense restored");
            }}
            onPurge={(id) => {
              purgeExpense(id);
              toast.success("Expense deleted");
            }}
          />
        </TabsContent>

        {/* ── REPORTS ────────────────────────────────────────────── */}
        <TabsContent value="reports" className="mt-6 flex flex-col gap-6">
          <Card>
            <CardHead
              title="Generate report"
              subtitle="Download the active window — every export is logged in the audit trail below."
            />
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button variant="accent" onClick={handleExportCsv}>
                <ArrowDownToLine className="size-4" /> Export CSV
              </Button>
              <Button variant="outline" onClick={handleExportXls}>
                <FileSpreadsheet className="size-4" /> Export Excel
              </Button>
              <Button variant="outline" onClick={handleExportPdf}>
                <FileText className="size-4" /> Download PDF
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              All formats include your business name, period, summary, category breakdown and the full expense list.
            </p>
          </Card>
          <Card>
            <CardHead title="Audit trail" subtitle="Report generation and exports for this tenant" />
            <ReportAudit logs={expenseReports} />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit expense" : "Add expense"}</DialogTitle>
            <DialogDescription>
              Quickly capture spend — most fields are optional.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Title *</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. Electricity bill"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Amount (₱) *</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.amount || ""}
                  onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) || 0 })}
                  placeholder="e.g. 2,500"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={draftDate}
                  onChange={(e) => setDraftDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select
                  value={draft.categoryId ?? "__none__"}
                  onValueChange={(v) => setDraft({ ...draft, categoryId: v === "__none__" ? null : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Uncategorised</SelectItem>
                    {expenseCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Vendor</Label>
                <Input
                  value={draft.vendor ?? ""}
                  onChange={(e) => setDraft({ ...draft, vendor: e.target.value })}
                  placeholder="e.g. Meralco"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <textarea
                rows={2}
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="e.g. Monthly office electricity"
                className="flex w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm shadow-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <textarea
                rows={2}
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="e.g. Paid via GCash · ref #12345"
                className="flex w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm shadow-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={saveExpense}>
              {editing ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage categories dialog */}
      <Dialog
        open={catDialogOpen}
        onOpenChange={(o) => {
          setCatDialogOpen(o);
          if (!o) resetCatForm();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage categories</DialogTitle>
            <DialogDescription>
              Defaults are seeded; add your own, edit, or delete any not in use.
            </DialogDescription>
          </DialogHeader>

          {/* Add / edit form */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-card/50 p-3">
            <Tags className="size-4 text-muted-foreground" />
            <Input
              placeholder="e.g. Software"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveCat(); }}
              className="h-9 max-w-xs text-sm"
            />
            <div className="flex items-center gap-1.5">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewCatColor(c)}
                  className={cn(
                    "size-5 rounded-full border-2 transition-all",
                    newCatColor === c ? "border-foreground scale-110" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Pick color ${c}`}
                />
              ))}
            </div>
            <Button onClick={handleSaveCat} variant="accent" size="sm">
              <Plus className="size-4" /> {editingCat ? "Update" : "Add category"}
            </Button>
            {editingCat && (
              <Button onClick={resetCatForm} variant="ghost" size="sm">
                Cancel
              </Button>
            )}
          </div>

          {/* Category list */}
          <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {expenseCategories.map((cat) => {
              const inUse = expenses.filter(
                (e) => !e.deletedAt && e.categoryId === cat.id,
              ).length;
              return (
                <div key={cat.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: cat.color ?? "#9ca3af" }} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {inUse} expense{inUse === 1 ? "" : "s"}
                        {cat.isDefault && " · default"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEditCat(cat)} title="Edit">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteCategory(cat.id)}
                      title={inUse > 0 ? "Reassign expenses first" : "Delete category"}
                    >
                      <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {expenseCategories.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No categories yet — add one above.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-6", className)}>
      {children}
    </div>
  );
}

function CardHead({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
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
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 truncate text-lg font-semibold tabular">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function BreakdownList({
  rows,
}: {
  rows: ReturnType<typeof computeCategoryBreakdown>;
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No spend in this window.</p>;
  }
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.categoryId ?? r.name} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: r.color ?? "#9ca3af" }}
              />
              <span className="truncate font-medium">{r.name}</span>
            </div>
            <span className="tabular text-muted-foreground">
              {formatCurrency(r.total)} · {(r.share * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(r.total / max) * 100}%`,
                backgroundColor: r.color ?? "var(--color-foreground)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ExpenseTable({
  expenses,
  categoryById,
  onEdit,
  onDelete,
}: {
  expenses: Expense[];
  categoryById: Map<string, { name: string; color?: string }>;
  onEdit: (e: Expense) => void;
  onDelete: (id: string) => void;
}) {
  if (expenses.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No expenses match these filters.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left">
          <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-3 pr-3 font-medium">Date</th>
            <th className="py-3 pr-3 font-medium">Title</th>
            <th className="py-3 pr-3 font-medium">Category</th>
            <th className="py-3 pr-3 font-medium">Vendor</th>
            <th className="py-3 pr-3 text-right font-medium">Amount</th>
            <th className="py-3 pr-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => {
            const cat = e.categoryId ? categoryById.get(e.categoryId) : null;
            return (
              <tr key={e.id} className="border-b border-border/60 last:border-0">
                <td className="py-3 pr-3 text-muted-foreground">{formatDate(e.date)}</td>
                <td className="py-3 pr-3">
                  <p className="font-medium">{e.title}</p>
                  {e.description && (
                    <p className="text-xs text-muted-foreground truncate max-w-xs">{e.description}</p>
                  )}
                </td>
                <td className="py-3 pr-3">
                  {cat ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: cat.color ?? "#9ca3af" }} />
                      <span className="text-xs">{cat.name}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-3 pr-3 text-muted-foreground">{e.vendor ?? "—"}</td>
                <td className="py-3 pr-3 text-right font-medium tabular">{formatCurrency(e.amount)}</td>
                <td className="py-3 pr-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => onEdit(e)} title="Edit">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => onDelete(e.id)} title="Archive">
                      <Archive className="size-3.5 text-muted-foreground hover:text-foreground" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DeletedSection({
  expenses,
  categoryById,
  onRestore,
  onPurge,
}: {
  expenses: Expense[];
  categoryById: Map<string, { name: string; color?: string }>;
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
}) {
  const deleted = expenses.filter((e) => e.deletedAt).slice(0, 10);
  if (deleted.length === 0) return null;
  return (
    <Card>
      <CardHead
        title="Archived"
        subtitle={`${deleted.length} archived — restore, or delete permanently`}
      />
      <div className="flex flex-col gap-2">
        {deleted.map((e) => {
          const cat = e.categoryId ? categoryById.get(e.categoryId) : null;
          return (
            <div
              key={e.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/30 px-4 py-2.5 text-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                {cat && (
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color ?? "#9ca3af" }}
                  />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium opacity-80">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(e.date)} · {formatCurrency(e.amount)} · archived {relativeTime(e.deletedAt!)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => onRestore(e.id)}>
                  <RotateCcw className="size-3.5" /> Restore
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onPurge(e.id)}
                  title="Delete permanently"
                >
                  <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ReportAudit({
  logs,
}: {
  logs: ReturnType<typeof useBusinessStore.getState>["expenseReports"];
}) {
  if (logs.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No reports generated yet — use the export buttons above.
      </p>
    );
  }
  const variantFor = (kind: string): "accent" | "outline" | "secondary" => {
    if (kind.startsWith("EXPORT")) return "accent";
    if (kind === "DASHBOARD_VIEW") return "outline";
    return "secondary";
  };
  return (
    <div className="flex flex-col">
      {logs.map((r) => (
        <div
          key={r.id}
          className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0"
        >
          <div className="flex items-center gap-3">
            <Badge variant={variantFor(r.kind)} className="font-mono text-[10px]">
              {r.kind}
            </Badge>
            <span className="text-sm">
              {formatDate(r.rangeFrom)} – {formatDate(r.rangeTo)}
            </span>
            {r.exportedFile && (
              <span className="font-mono text-xs text-muted-foreground">{r.exportedFile}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {r.rowCount != null && <span className="tabular">{r.rowCount} rows</span>}
            {r.total != null && <span className="tabular">{formatCurrency(r.total)}</span>}
            <span>{r.user}</span>
            <span>{relativeTime(r.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}