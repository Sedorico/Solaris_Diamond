import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { listCustomers } from "@/lib/admin/service";

export async function GET(req: Request) {
  await requireRole("SUPERADMIN");
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const customers = await listCustomers({ search });
  return NextResponse.json({ customers });
}
