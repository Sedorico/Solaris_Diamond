import "server-only";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { buildReport } from "@/lib/pos/service";
import {
  getReport as getAttendanceServiceReport,
  type ReportPeriod,
} from "@/lib/attendance/service";
import type { PosReportDTO } from "@/lib/pos/types";
import type { ReportSummaryDTO } from "@/lib/attendance/types";

/**
 * Server-side data access for the AI assistant. Everything here is scoped by
 * the caller's session tenantId — the server, not the client payload, is the
 * tenant-isolation boundary. Results are trimmed to compact JSON so tool
 * outputs stay cheap in the prompt and never leak raw rows or internal IDs.
 */

export type AiPeriod = "today" | "yesterday" | "week" | "month";

export async function getAiSession(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;
  if (
    session.role !== "OWNER" &&
    session.role !== "ADMIN" &&
    session.role !== "SUPERADMIN"
  ) {
    return null;
  }
  return session;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function rangeFor(period: AiPeriod): {
  label: "daily" | "weekly" | "monthly" | "custom";
  from: Date;
  to: Date;
} {
  const now = new Date();
  if (period === "today") return { label: "daily", from: startOfDay(now), to: now };
  if (period === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { label: "custom", from: startOfDay(y), to: endOfDay(y) };
  }
  if (period === "week") {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return { label: "weekly", from, to: now };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { label: "monthly", from, to: now };
}

function trimPos(r: PosReportDTO) {
  return {
    range: { from: r.rangeFrom, to: r.rangeTo },
    revenue: r.revenue,
    transactionCount: r.transactionCount,
    averageSale: r.averageSale,
    itemsSold: r.itemsSold,
    voidedCount: r.voidedCount,
    bestSellers: r.bestSellers.slice(0, 8),
    topCategories: r.topCategories
      .slice(0, 6)
      .map(({ name, qty, revenue }) => ({ name, qty, revenue })),
    peakHours: r.peakHours.slice(0, 5),
    methodBreakdown: r.methodBreakdown,
    dailyTrend: r.dailyTrend,
  };
}

function trimAttendance(r: ReportSummaryDTO) {
  const lateToday = r.rows
    .filter((row) => row.status === "LATE")
    .slice(0, 10)
    .map((row) => ({
      employee: row.employeeName,
      date: row.workDate,
      timeIn: row.timeIn,
    }));
  return {
    range: { from: r.rangeFrom, to: r.rangeTo },
    totalEmployees: r.totalEmployees,
    present: r.present,
    late: r.late,
    absent: r.absent,
    pending: r.pending,
    attendancePercentage: r.attendancePercentage,
    averageWorkingHours: r.averageWorkingHours,
    lateEntries: lateToday,
  };
}

/** Live POS sales (real database) for the tenant, trimmed for the prompt. */
export async function getPosSnapshot(tenantId: string, period: AiPeriod) {
  const { label, from, to } = rangeFor(period);
  const report = await buildReport(tenantId, null, label, from, to);
  return trimPos(report);
}

/** Live attendance summary (real database) for the tenant. */
export async function getAttendanceSnapshot(tenantId: string, period: AiPeriod) {
  const map: Record<AiPeriod, ReportPeriod> = {
    today: "daily",
    yesterday: "daily",
    week: "weekly",
    month: "monthly",
  };
  const report = await getAttendanceServiceReport(tenantId, map[period]);
  return trimAttendance(report);
}
