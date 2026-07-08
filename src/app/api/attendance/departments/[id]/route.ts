import { NextResponse } from "next/server";
import { getOwnerContext, unauthorized, badRequest } from "@/lib/attendance/api";
import { deleteDepartment } from "@/lib/attendance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const result = await deleteDepartment(session.tenantId, id);
  if (!result.ok) return badRequest(result.reason ?? "Could not delete department");
  return NextResponse.json({ ok: true });
}
