import { NextResponse } from "next/server";
import { getOwnerContext, unauthorized } from "@/lib/attendance/api";
import { getReport, type ReportPeriod } from "@/lib/attendance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERIODS: ReportPeriod[] = ["daily", "weekly", "monthly", "custom"];

export async function GET(request: Request) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const sp = new URL(request.url).searchParams;
  const periodParam = sp.get("period") as ReportPeriod;
  const period = PERIODS.includes(periodParam) ? periodParam : "monthly";
  const data = await getReport(
    session.tenantId,
    period,
    sp.get("from") ?? undefined,
    sp.get("to") ?? undefined,
  );
  return NextResponse.json(data);
}
