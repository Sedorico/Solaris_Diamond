import { NextResponse } from "next/server";
import { getOwnerContext, unauthorized, badRequest } from "@/lib/attendance/api";
import { createDepartment, listDepartments } from "@/lib/attendance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  return NextResponse.json({ departments: await listDepartments(session.tenantId) });
}

export async function POST(request: Request) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const body = await request.json().catch(() => null);
  const name = (body?.name ?? "").trim();
  if (!name) return badRequest("Department name is required");
  return NextResponse.json({
    department: await createDepartment(session.tenantId, name),
  });
}
