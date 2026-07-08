import { NextResponse } from "next/server";
import { getOwnerContext, unauthorized, badRequest } from "@/lib/pos/api";
import { saveCart } from "@/lib/pos/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Debounced sync of the live register cart — crash/refresh insurance. */
export async function PUT(request: Request) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.items)) return badRequest("Invalid cart");
  const result = await saveCart(session.tenantId, body.items);
  if (!result.ok) return badRequest(result.reason);
  return NextResponse.json({ ok: true });
}
