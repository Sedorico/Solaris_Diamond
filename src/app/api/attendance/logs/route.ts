import { NextResponse } from "next/server";
import { getOwnerContext, unauthorized } from "@/lib/attendance/api";
import { listLogs } from "@/lib/attendance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const sp = new URL(request.url).searchParams;
  const data = await listLogs(session.tenantId, {
    search: sp.get("search") ?? undefined,
    status: sp.get("status") ?? undefined,
    departmentId: sp.get("departmentId") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    page: sp.get("page") ? parseInt(sp.get("page")!, 10) : undefined,
    pageSize: sp.get("pageSize") ? parseInt(sp.get("pageSize")!, 10) : undefined,
  });
  return NextResponse.json(data);
}
