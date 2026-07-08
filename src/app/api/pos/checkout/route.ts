import { NextResponse } from "next/server";
import { getOwnerContext, unauthorized, badRequest } from "@/lib/pos/api";
import { checkout } from "@/lib/pos/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Complete a sale. Never PIN-gated — this is the regular selling flow. All
 * amounts are recomputed server-side from catalog prices.
 */
export async function POST(request: Request) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid body");
  const result = await checkout(session.tenantId, session.id, session.fullName, body);
  if (!result.ok) return badRequest(result.reason);
  return NextResponse.json({
    transaction: result.transaction,
    receipt: result.receipt,
  });
}
