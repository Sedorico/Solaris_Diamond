"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiGet, fmtDate, fmtTime, fmtHours } from "@/lib/attendance/client";
import type { AttendanceLogDTO, DepartmentDTO } from "@/lib/attendance/types";
import { AttendanceStatusBadge } from "./status-badge";

interface LogsResponse {
  rows: AttendanceLogDTO[];
  total: number;
  page: number;
  pageSize: number;
}

export function LogsTab({ refreshKey }: { refreshKey: number }) {
  const [departments, setDepartments] = useState<DepartmentDTO[]>([]);
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [departmentId, setDepartmentId] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiGet<{ departments: DepartmentDTO[] }>("/api/attendance/departments")
      .then((d) => setDepartments(d.departments))
      .catch(() => {});
  }, [refreshKey]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status !== "ALL") params.set("status", status);
    if (departmentId !== "ALL") params.set("departmentId", departmentId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(page));
    apiGet<LogsResponse>(`/api/attendance/logs?${params.toString()}`)
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [search, status, departmentId, from, to, page]);

  // Reset to first page when filters change.
  useEffect(() => {
    setPage(1);
  }, [search, status, departmentId, from, to]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load, refreshKey]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee or ID"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All status</SelectItem>
            <SelectItem value="PRESENT">Present</SelectItem>
            <SelectItem value="LATE">Late</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ABSENT">Absent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger>
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div>
          <Label className="sr-only">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="sr-only">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : !data || data.rows.length === 0 ? (
        <EmptyState
          title="No attendance logs"
          description="Approved and pending attendance records will appear here once your team starts timing in."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <div className="hidden min-w-[820px] grid-cols-[1.6fr_1fr_1.2fr_1fr_1fr_0.8fr_1fr] gap-4 border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid">
            <span>Employee</span>
            <span>Employee ID</span>
            <span>Department</span>
            <span>Time in</span>
            <span>Time out</span>
            <span className="text-right">Hours</span>
            <span className="text-right">Status</span>
          </div>
          {data.rows.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-2 items-center gap-3 border-b border-border px-5 py-3.5 text-sm last:border-0 sm:min-w-[820px] sm:grid-cols-[1.6fr_1fr_1.2fr_1fr_1fr_0.8fr_1fr]"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{r.employeeName}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(r.workDate)}</p>
              </div>
              <span className="hidden font-mono text-xs sm:block">{r.employeeCode}</span>
              <span className="hidden sm:block">{r.departmentName ?? "—"}</span>
              <span className="hidden tabular-nums sm:block">{fmtTime(r.timeIn)}</span>
              <span className="hidden tabular-nums sm:block">{fmtTime(r.timeOut)}</span>
              <span className="hidden text-right font-medium tabular-nums sm:block">
                {fmtHours(r.workingHours)}
              </span>
              <span className="flex justify-end">
                <AttendanceStatusBadge status={r.status} />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {data.total} record{data.total === 1 ? "" : "s"} · page {data.page} of{" "}
            {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
