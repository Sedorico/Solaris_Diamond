import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { getPlatformHealth } from "@/lib/admin/service";

export async function GET() {
  await requireRole("SUPERADMIN");
  const checks = await getPlatformHealth();
  return NextResponse.json({ checks });
}
