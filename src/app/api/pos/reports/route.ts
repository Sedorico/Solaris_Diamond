import { NextResponse } from "next/server";
import {
  getOwnerContext,
  unauthorized,
  badRequest,
  pinRequired,
  hasAdminAccess,
} from "@/lib/pos/api";
import { buildReport, logReportExport } from "@/lib/pos/service";
import type { PosReportPeriod } from "@/lib/pos/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERIODS: PosReportPeriod[] = ["daily", "weekly", "monthly", "custom"];

function parseRange(url: URL): { period: PosReportPeriod; from: Date; to: Date } | null {
  const period = (url.searchParams.get("period") ?? "daily") as PosReportPeriod;
  if (!PERIODS.includes(period)) return null;
  const from = new Date(url.searchParams.get("from") ?? "");
  const to = new Date(url.searchParams.get("to") ?? "");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to)
    return null;
  return { period, from, to };
}

export async function GET(request: Request) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  if (!(await hasAdminAccess(session.tenantId))) return pinRequired();
  const range = parseRange(new URL(request.url));
  if (!range) return badRequest("Invalid report range");
  const report = await buildReport(
    session.tenantId,
    session.id,
    range.period,
    range.from,
    range.to,
  );
  return NextResponse.json({ report });
}

/** Record a report download so exports appear in the audit trail. */
export async function POST(request: Request) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  if (!(await hasAdminAccess(session.tenantId))) return pinRequired();
  const body = await request.json().catch(() => null);
  const from = new Date(body?.from ?? "");
  const to = new Date(body?.to ?? "");
  if (!body?.format || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
    return badRequest("Invalid export log");
  await logReportExport(
    session.tenantId,
    session.id,
    String(body.format),
    from,
    to,
    String(body.filename ?? ""),
  );
  return NextResponse.json({ ok: true });
}
