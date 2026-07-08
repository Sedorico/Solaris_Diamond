import { NextResponse } from "next/server";
import { getOwnerContext, unauthorized } from "@/lib/attendance/api";
import { listPendingRequests } from "@/lib/attendance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  return NextResponse.json({
    requests: await listPendingRequests(session.tenantId),
  });
}
