import { NextResponse } from "next/server";
import { getOwnerContext, unauthorized, badRequest } from "@/lib/attendance/api";
import {
  deleteEmployee,
  resetEmployeePassword,
  setEmployeeStatus,
  updateEmployee,
} from "@/lib/attendance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid body");

  // Dedicated actions vs. general field updates.
  if (body.action === "reset-password") {
    const r = await resetEmployeePassword(session.tenantId, id, body.password ?? "");
    return r.ok ? NextResponse.json({ ok: true }) : badRequest(r.reason ?? "Failed");
  }
  if (body.action === "set-status") {
    const r = await setEmployeeStatus(session.tenantId, id, body.status);
    return r.ok ? NextResponse.json({ ok: true }) : badRequest(r.reason ?? "Failed");
  }

  const result = await updateEmployee(session.tenantId, id, body);
  if (!result.ok) return badRequest(result.reason ?? "Could not update employee");
  return NextResponse.json({ employee: result.employee });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const result = await deleteEmployee(session.tenantId, id);
  if (!result.ok) return badRequest(result.reason ?? "Could not delete employee");
  return NextResponse.json({ ok: true });
}
