import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { listAuditLogs, listSystemLogs } from "@/lib/admin/service";

export async function GET(req: Request) {
  await requireRole("SUPERADMIN");
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const action = url.searchParams.get("action") ?? undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const source = url.searchParams.get("source") ?? "audit";

  if (source === "system") {
    const logs = await listSystemLogs({});
    return NextResponse.json({ logs, source: "system" });
  }

  const logs = await listAuditLogs({
    search,
    action,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });
  return NextResponse.json({ logs, source: "audit" });
}
