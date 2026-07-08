import { NextResponse } from "next/server";
import { getOwnerContext, unauthorized, badRequest } from "@/lib/pos/api";
import { deleteProduct, updateProduct } from "@/lib/pos/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid body");
  const result = await updateProduct(session.tenantId, session.id, id, body);
  if (!result.ok) return badRequest(result.reason);
  return NextResponse.json({ product: result.product });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const result = await deleteProduct(session.tenantId, session.id, id);
  if (!result.ok) return badRequest(result.reason);
  return NextResponse.json({ ok: true });
}
