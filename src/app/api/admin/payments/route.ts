import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { listPayments } from "@/lib/admin/service";

export async function GET(req: Request) {
  await requireRole("SUPERADMIN");
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const payments = await listPayments({ status });
  return NextResponse.json({ payments });
}
