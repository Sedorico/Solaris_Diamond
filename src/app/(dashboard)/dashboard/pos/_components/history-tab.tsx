"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Ban,
  ChevronDown,
  Printer,
  ReceiptText,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { apiGet, apiSend, fmtDateTime, fmtMoney } from "@/lib/pos/client";
import { buildReceiptHtml, openPrintWindow } from "@/lib/pos/exports";
import { POS_PAYMENT_METHODS } from "@/lib/pos/types";
import type {
  PosReceiptSnapshot,
  PosTransactionDetailDTO,
  PosTransactionListDTO,
  PosTransactionRowDTO,
  PosTransactionSort,
} from "@/lib/pos/types";
import { LockedPanel, usePinGate } from "./pin-gate";
import { ReceiptView } from "./receipt-view";

const PAGE_SIZE = 50;

const STATUS_META: Record<string, { label: string; variant: "success" | "muted" | "warning" }> = {
  COMPLETED: { label: "Completed", variant: "success" },
  VOIDED: { label: "Voided", variant: "muted" },
  REFUNDED: { label: "Refunded", variant: "warning" },
};

export function HistoryTab({ refreshKey }: { refreshKey: number }) {
  const { status, guard } = usePinGate();
  const locked = !!status && status.pinRequired && status.pinSet && !status.unlocked;

  const [data, setData] = useState<PosTransactionListDTO | null>(null);
  const [rows, setRows] = useState<PosTransactionRowDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [sort, setSort] = useState<PosTransactionSort>("newest");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");
  const [moreFilters, setMoreFilters] = useState(false);

  // Detail dialog
  const [detail, setDetail] = useState<PosTransactionDetailDTO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidConfirm, setVoidConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debounced.trim()) params.set("search", debounced.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (methodFilter !== "all") params.set("method", methodFilter);
    if (sort !== "newest") params.set("sort", sort);
    if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59.999`).toISOString());
    if (minTotal) params.set("minTotal", minTotal);
    if (maxTotal) params.set("maxTotal", maxTotal);
    params.set("limit", String(PAGE_SIZE));
    return params;
  }, [debounced, statusFilter, methodFilter, sort, from, to, minTotal, maxTotal]);

  const fetchList = useCallback(
    async (offset = 0) => {
      const params = new URLSearchParams(queryString);
      if (offset > 0) params.set("offset", String(offset));
      return guard(() =>
        apiGet<PosTransactionListDTO>(`/api/pos/transactions?${params.toString()}`),
      );
    },
    [queryString, guard],
  );

  useEffect(() => {
    if (locked || !status) return;
    let active = true;
    setLoading(true);
    fetchList()
      .then((d) => {
        if (!active) return;
        setData(d);
        setRows(d.rows);
      })
      .catch((e) => active && toast.error(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [locked, status, fetchList, refreshKey]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const d = await fetchList(rows.length);
      setRows((r) => [...r, ...d.rows]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  };

  const openDetail = async (row: PosTransactionRowDTO) => {
    try {
      const d = await guard(() =>
        apiGet<{ transaction: PosTransactionDetailDTO }>(
          `/api/pos/transactions/${row.id}`,
        ),
      );
      setDetail(d.transaction);
      setVoidReason("");
      setVoidConfirm(false);
      setDetailOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open transaction");
    }
  };

  const reprint = async (id: string) => {
    try {
      const d = await guard(() =>
        apiSend<{ receipt: PosReceiptSnapshot }>(
          `/api/pos/transactions/${id}/reprint`,
          "POST",
        ),
      );
      openPrintWindow(buildReceiptHtml(d.receipt));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reprint failed");
    }
  };

  const voidTxn = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await guard(() =>
        apiSend(`/api/pos/transactions/${detail.id}`, "PATCH", {
          action: "void",
          reason: voidReason.trim() || undefined,
        }),
      );
      toast.success(`${detail.ref} voided`);
      setDetailOpen(false);
      const d = await fetchList();
      setData(d);
      setRows(d.rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Void failed");
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }
  if (locked) {
    return (
      <LockedPanel
        title="Transaction history is protected"
        description="Enter the admin PIN to review, reprint or void past transactions."
        onUnlocked={() => undefined /* status flip re-triggers the fetch */}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats for the current filter */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Revenue (filtered)"
          value={data ? fmtMoney(data.revenue) : "—"}
          index={0}
        />
        <StatCard
          label="Transactions"
          value={data ? String(data.total) : "—"}
          index={1}
        />
        <StatCard
          label="Average sale"
          value={
            data && data.total > 0 ? fmtMoney(data.revenue / Math.max(1, data.total)) : "—"
          }
          index={2}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search receipt no., ref, customer, item…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="VOIDED">Voided</SelectItem>
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="h-10 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            {POS_PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as PosTransactionSort)}>
          <SelectTrigger className="h-10 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="highest">Highest amount</SelectItem>
            <SelectItem value="lowest">Lowest amount</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={moreFilters ? "secondary" : "outline"}
          size="sm"
          className="h-10"
          onClick={() => setMoreFilters((v) => !v)}
        >
          <SlidersHorizontal className="size-4" /> Filters
        </Button>
      </div>

      {moreFilters && (
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4">
          <div className="grid gap-1.5">
            <Label className="text-xs">From date</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">To date</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Min amount (₱)</Label>
            <Input
              type="number"
              min={0}
              value={minTotal}
              onChange={(e) => setMinTotal(e.target.value)}
              className="h-9"
              placeholder="0"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Max amount (₱)</Label>
            <Input
              type="number"
              min={0}
              value={maxTotal}
              onChange={(e) => setMaxTotal(e.target.value)}
              className="h-9"
              placeholder="Any"
            />
          </div>
        </div>
      )}

      {/* Transactions */}
      {loading ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 py-20 text-center">
          <ReceiptText className="mx-auto size-10 text-muted-foreground opacity-30" />
          <p className="mt-3 text-sm text-muted-foreground">No transactions found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[1.4fr_1.2fr_1fr_0.9fr_0.9fr_0.9fr_auto] gap-4 border-b border-border px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
            <span>Receipt</span>
            <span>Date & time</span>
            <span>Cashier</span>
            <span>Payment</span>
            <span>Status</span>
            <span className="text-right">Total</span>
            <span />
          </div>
          {rows.map((t) => {
            const meta = STATUS_META[t.status] ?? STATUS_META.COMPLETED;
            return (
              <button
                key={t.id}
                onClick={() => openDetail(t)}
                className={cn(
                  "grid w-full grid-cols-2 items-center gap-3 border-b border-border px-5 py-4 text-left text-sm transition-colors last:border-0 hover:bg-secondary/40",
                  "md:grid-cols-[1.4fr_1.2fr_1fr_0.9fr_0.9fr_0.9fr_auto]",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-medium">
                    {t.receiptNo ?? t.ref}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.itemCount} item{t.itemCount === 1 ? "" : "s"}
                    {t.customer ? ` · ${t.customer}` : ""}
                  </p>
                </div>
                <span className="hidden text-xs text-muted-foreground md:block">
                  {fmtDateTime(t.completedAt)}
                </span>
                <span className="hidden truncate text-xs text-muted-foreground md:block">
                  {t.cashier ?? "—"}
                </span>
                <span className="hidden md:block">
                  <Badge variant="secondary">{t.method}</Badge>
                </span>
                <span className="hidden md:block">
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </span>
                <span
                  className={cn(
                    "text-right font-medium tabular-nums",
                    t.status === "VOIDED" && "text-muted-foreground line-through",
                  )}
                >
                  {fmtMoney(t.total)}
                </span>
                <span
                  className="hidden text-muted-foreground md:block"
                  onClick={(e) => {
                    e.stopPropagation();
                    reprint(t.id);
                  }}
                  title="Reprint receipt"
                  role="button"
                >
                  <Printer className="size-4 transition-colors hover:text-foreground" />
                </span>
              </button>
            );
          })}
          {data && rows.length < data.total && (
            <div className="border-t border-border p-3 text-center">
              <Button variant="ghost" size="sm" onClick={loadMore} disabled={loadingMore}>
                <ChevronDown className="size-4" />
                {loadingMore ? "Loading…" : `Load more (${data.total - rows.length} remaining)`}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="size-5 text-accent" />
              {detail?.receiptNo ?? detail?.ref}
            </DialogTitle>
            {detail && (
              <DialogDescription>
                {fmtDateTime(detail.completedAt)} · {detail.cashier ?? "—"} ·{" "}
                {STATUS_META[detail.status]?.label}
                {detail.status === "VOIDED" && detail.voidReason
                  ? ` — ${detail.voidReason}`
                  : ""}
              </DialogDescription>
            )}
          </DialogHeader>
          {detail?.receipt && (
            <div className="max-h-80 overflow-y-auto">
              <ReceiptView receipt={detail.receipt} />
            </div>
          )}

          {voidConfirm ? (
            <div className="grid gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4">
              <p className="text-sm font-medium">
                Void {detail?.ref}? This cannot be undone.
              </p>
              <Input
                placeholder="Reason (optional)"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="h-9"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setVoidConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  disabled={busy}
                  onClick={voidTxn}
                >
                  {busy ? "Voiding…" : "Yes, void it"}
                </Button>
              </div>
            </div>
          ) : (
            <DialogFooter className="gap-2 sm:gap-0">
              {detail?.status === "COMPLETED" && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setVoidConfirm(true)}
                >
                  <Ban className="size-4" /> Void
                </Button>
              )}
              <Button
                variant="accent"
                onClick={() => detail && reprint(detail.id)}
              >
                <Printer className="size-4" /> Reprint / PDF
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
