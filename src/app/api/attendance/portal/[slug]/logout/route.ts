import { NextResponse } from "next/server";
import { clearEmployeeSession } from "@/lib/attendance/employee-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await clearEmployeeSession();
  return NextResponse.json({ ok: true });
}
