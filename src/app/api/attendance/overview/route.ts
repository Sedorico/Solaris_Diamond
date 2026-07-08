import { NextResponse } from "next/server";
import { getOwnerContext, unauthorized } from "@/lib/attendance/api";
import { getOverview } from "@/lib/attendance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const data = await getOverview(session.tenantId);
  return NextResponse.json(data);
}
