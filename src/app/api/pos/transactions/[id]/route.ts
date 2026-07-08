import { NextResponse } from "next/server";
import {
  getOwnerContext,
  unauthorized,
  badRequest,
  notFound,
  pinRequired,
  hasAdminAccess,
} from "@/lib/pos/api";
import { getTransaction, voidTransaction } from "@/lib/pos/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  if (!(await hasAdminAccess(session.tenantId))) return pinRequired();
  const { id } = await ctx.params;
  const transaction = await getTransaction(session.tenantId, id);
  if (!transaction) return notFound("Transaction not found");
  return NextResponse.json({ transaction });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  if (!(await hasAdminAccess(session.tenantId))) return pinRequired();
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (body?.action !== "void") return badRequest("Unknown action");
  const result = await voidTransaction(session.tenantId, session.id, id, body.reason);
  if (!result.ok) return badRequest(result.reason);
  return NextResponse.json({ ok: true });
}
