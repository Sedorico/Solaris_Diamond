import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import {
  getDashboardKPIs,
  getRevenueByMonth,
  getRevenueByDay,
  getNewSubscribersByMonth,
  getServiceUsageStats,
  getAdminAlerts,
} from "@/lib/admin/service";

export async function GET() {
  await requireRole("SUPERADMIN");

  const [kpis, revenueMonthly, revenueDaily, subscribers, services, alerts] =
    await Promise.all([
      getDashboardKPIs(),
      getRevenueByMonth(12),
      getRevenueByDay(30),
      getNewSubscribersByMonth(12),
      getServiceUsageStats(),
      getAdminAlerts(8),
    ]);

  return NextResponse.json({
    kpis,
    revenueMonthly,
    revenueDaily,
    subscribers,
    services,
    alerts,
  });
}
