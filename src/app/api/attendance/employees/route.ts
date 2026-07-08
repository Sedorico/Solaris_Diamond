import { NextResponse } from "next/server";
import { getOwnerContext, unauthorized, badRequest } from "@/lib/attendance/api";
import { createEmployee, listEmployees } from "@/lib/attendance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  return NextResponse.json({ employees: await listEmployees(session.tenantId) });
}

export async function POST(request: Request) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid body");
  const result = await createEmployee(session.tenantId, body);
  if (!result.ok) return badRequest(result.reason ?? "Could not create employee");
  return NextResponse.json({ employee: result.employee });
}
