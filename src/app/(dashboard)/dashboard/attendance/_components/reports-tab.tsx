"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, FileSpreadsheet, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth/hooks";
import { apiGet } from "@/lib/attendance/client";
import {
  buildAttendanceCsv,
  buildAttendanceXls,
  buildAttendancePrintHtml,
  downloadFile,
  openPrintWindow,
} from "@/lib/attendance/exports";
import type { ReportSummaryDTO } from "@/lib/attendance/types";

type Period = "daily" | "weekly" | "monthly" | "custom";

const PERIODS: { id: Period; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "custom", label: "Custom" },
];

export function ReportsTab({ refreshKey }: { refreshKey: number }) {
  const { user } = useSession();
  const businessName = user?.businessName ?? "Solaris Diamond";
  const [period, setPeriod] = useState<Period>("monthly");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<ReportSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (period === "custom" && (!from || !to)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (period === "custom") {
      params.set("from", from);
      params.set("to", to);
    }
    apiGet<ReportSummaryDTO>(`/api/attendance/reports?${params.toString()}`)
      .then(setReport)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [period, from, to]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  function exportCsv() {
    if (!report) return;
    const { body, filename } = buildAttendanceCsv(report);
    downloadFile(filename, body);
    toast.success("CSV exported");
  }

  function exportXls() {
    if (!report) return;
    const { body, filename } = buildAttendanceXls(report, businessName);
    downloadFile(filename, body, "application/vnd.ms-excel");
    toast.success("Excel exported");
  }

  function exportPdf() {
    if (!report) return;
    openPrintWindow(buildAttendancePrintHtml(report, businessName));
  }

  const cards: { label: string; value: string }[] = report
    ? [
        { label: "Present", value: String(report.present) },
        { label: "Late", value: String(report.late) },
        { label: "Absent", value: String(report.absent) },
        { label: "Rejected", value: String(report.rejected) },
        { label: "Pending", value: String(report.pending) },
        { label: "Attendance %", value: `${report.attendancePercentage}%` },
        { label: "Avg hours", value: `${report.averageWorkingHours}h` },
        { label: "Total employees", value: String(report.totalEmployees) },
      ]
    : [];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div className="inline-flex rounded-full border border-border bg-secondary/60 p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-all " +
                  (period === p.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {p.label}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex items-end gap-2">
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">From</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">To</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!report}>
            <FileText className="size-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportXls} disabled={!report}>
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={!report}>
            <Printer className="size-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Summary */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : !report ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          Pick a custom date range to generate a report.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-border bg-card p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {c.label}
                </p>
                <p className="font-display mt-3 text-3xl font-normal leading-none tabular">
                  {c.value}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Report period: {new Date(report.rangeFrom).toDateString()} —{" "}
            {new Date(report.rangeTo).toDateString()} · {report.rows.length} record
            {report.rows.length === 1 ? "" : "s"}
          </p>
        </>
      )}
    </div>
  );
}
