"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Clock3,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Package,
  PhilippinePeso,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, EmptyState } from "@/components/dashboard/ui";
import { AreaChart, BarChart, HBarChart, PieChart } from "@/components/dashboard/charts";
import { cn } from "@/lib/utils";
import { apiGet, apiSend, fmtHourLabel, fmtMoney } from "@/lib/pos/client";
import {
  buildReportCsv,
  buildReportPrintHtml,
  buildReportXls,
  downloadFile,
  openPrintWindow,
} from "@/lib/pos/exports";
import type { PosReportDTO, PosReportPeriod, PosSettingsDTO } from "@/lib/pos/types";
import { LockedPanel, usePinGate } from "./pin-gate";

const PERIOD_TABS: { id: PosReportPeriod; label: string }[] = [
  { id: "daily", label: "Today" },
  { id: "weekly", label: "This week" },
  { id: "monthly", label: "This month" },
  { id: "custom", label: "Custom" },
];

function rangeFor(period: PosReportPeriod, from?: string, to?: string) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === "weekly") {
    const day = (start.getDay() + 6) % 7; // Monday = 0
    start.setDate(start.getDate() - day);
  } else if (period === "monthly") {
    start.setDate(1);
  } else if (period === "custom") {
    const f = new Date(`${from}T00:00:00`);
    const t = new Date(`${to}T23:59:59.999`);
    return { from: f, to: t };
  }
  return { from: start, to: now };
}

export function ReportsTab({ refreshKey }: { refreshKey: number }) {
  const { status, guard } = usePinGate();
  const locked = !!status && status.pinRequired && status.pinSet && !status.unlocked;

  const [period, setPeriod] = useState<PosReportPeriod>("daily");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [report, setReport] = useState<PosReportDTO | null>(null);
  const [businessName, setBusinessName] = useState("My Business");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ settings: PosSettingsDTO }>("/api/pos/settings")
      .then((d) => setBusinessName(d.settings.companyName))
      .catch(() => null);
  }, [refreshKey]);

  const fetchReport = useCallback(
    async (p: PosReportPeriod, f?: string, t?: string) => {
      const range = rangeFor(p, f, t);
      if (Number.isNaN(range.from.getTime()) || Number.isNaN(range.to.getTime())) {
        toast.error("Pick a valid date range");
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({
          period: p,
          from: range.from.toISOString(),
          to: range.to.toISOString(),
        });
        const d = await guard(() =>
          apiGet<{ report: PosReportDTO }>(`/api/pos/reports?${params.toString()}`),
        );
        setReport(d.report);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    },
    [guard],
  );

  useEffect(() => {
    if (locked || !status) return;
    if (period === "custom" && (!customFrom || !customTo)) return;
    fetchReport(period, customFrom, customTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, status, period, refreshKey]);

  const logExport = (format: string, filename: string) => {
    if (!report) return;
    apiSend("/api/pos/reports", "POST", {
      format,
      filename,
      from: report.rangeFrom,
      to: report.rangeTo,
    }).catch(() => null);
  };

  const exportCsv = () => {
    if (!report) return;
    const { body, filename } = buildReportCsv(report, businessName);
    downloadFile(filename, body);
    logExport("csv", filename);
  };
  const exportXls = () => {
    if (!report) return;
    const { body, filename } = buildReportXls(report, businessName);
    downloadFile(filename, body, "application/vnd.ms-excel");
    logExport("xlsx", filename);
  };
  const exportPdf = () => {
    if (!report) return;
    openPrintWindow(buildReportPrintHtml(report, businessName));
    logExport("pdf", `solaris-pos-report.pdf`);
  };

  if (!status) return <Skeleton className="h-96 rounded-2xl" />;
  if (locked) {
    return (
      <LockedPanel
        title="Reports are protected"
        description="Enter the admin PIN to view sales reports and download exports."
        onUnlocked={() => undefined}
      />
    );
  }

  const hasSales = !!report && report.transactionCount > 0;

  return (
    <div className="space-y-6">
      {/* Period selector + exports */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-border bg-card p-1">
          {PERIOD_TABS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-[13px] font-medium transition-all",
                period === p.id
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!report}>
            <Download className="size-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportXls} disabled={!report}>
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={!report}>
            <FileText className="size-4" /> PDF
          </Button>
        </div>
      </div>

      {period === "custom" && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-1.5">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-9 w-40"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-9 w-40"
            />
          </div>
          <Button
            variant="accent"
            size="sm"
            disabled={!customFrom || !customTo}
            onClick={() => fetchReport("custom", customFrom, customTo)}
          >
            Run report
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : !report ? (
        <EmptyState
          title="Pick a date range"
          description="Choose a period above to generate the report."
        />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Revenue"
              value={fmtMoney(report.revenue)}
              icon={PhilippinePeso}
              index={0}
            />
            <StatCard
              label="Transactions"
              value={String(report.transactionCount)}
              icon={ReceiptText}
              hint={report.voidedCount ? `${report.voidedCount} voided` : undefined}
              index={1}
            />
            <StatCard
              label="Average sale"
              value={fmtMoney(report.averageSale)}
              icon={TrendingUp}
              index={2}
            />
            <StatCard
              label="Items sold"
              value={String(report.itemsSold)}
              icon={Package}
              index={3}
            />
          </div>

          {!hasSales ? (
            <EmptyState
              title="No sales in this period"
              description="Completed transactions will appear here as soon as you make a sale."
            />
          ) : (
            <>
              {/* Revenue trend */}
              <ChartCard title="Revenue trend" icon={TrendingUp}>
                <AreaChart
                  data={report.dailyTrend.map((d) => ({
                    label: new Date(`${d.day}T12:00:00`).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                    }),
                    value: d.revenue,
                  }))}
                />
              </ChartCard>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Best sellers */}
                <ChartCard title="Best selling products" icon={BarChart3}>
                  <HBarChart
                    data={report.bestSellers.map((p) => ({
                      label: `${p.name} ×${p.qty}`,
                      value: p.revenue,
                    }))}
                    format={fmtMoney}
                    colored
                  />
                </ChartCard>

                {/* Top categories */}
                <ChartCard title="Top categories" icon={Package}>
                  <PieChart
                    data={report.topCategories.map((c) => ({
                      label: c.name,
                      value: c.revenue,
                    }))}
                    format={fmtMoney}
                  />
                </ChartCard>

                {/* Peak hours */}
                <ChartCard title="Peak sales hours" icon={Clock3}>
                  <BarChart
                    data={report.peakHours.map((h) => ({
                      label: fmtHourLabel(h.hour),
                      value: h.revenue,
                    }))}
                    format={fmtMoney}
                  />
                </ChartCard>

                {/* Payment methods */}
                <ChartCard title="Payment methods" icon={CreditCard}>
                  <div className="flex flex-col gap-3">
                    {report.methodBreakdown.map((m) => (
                      <div
                        key={m.method}
                        className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{m.method}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {m.count} transaction{m.count === 1 ? "" : "s"}
                          </span>
                        </div>
                        <span className="font-medium tabular-nums">
                          {fmtMoney(m.revenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function ChartCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
