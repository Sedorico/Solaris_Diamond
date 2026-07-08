import { NextResponse } from "next/server";
import {
  getOwnerContext,
  unauthorized,
  badRequest,
  pinRequired,
  hasAdminAccess,
} from "@/lib/pos/api";
import { reprintReceipt } from "@/lib/pos/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Reprint a historical receipt — PIN-gated, and counted on the receipt row. */
export async function POST(_request: Request, ctx: Ctx) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  if (!(await hasAdminAccess(session.tenantId))) return pinRequired();
  const { id } = await ctx.params;
  const result = await reprintReceipt(session.tenantId, session.id, id);
  if (!result.ok) return badRequest(result.reason);
  return NextResponse.json({ receipt: result.receipt });
}
