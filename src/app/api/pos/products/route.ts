import { NextResponse } from "next/server";
import { getOwnerContext, unauthorized, badRequest } from "@/lib/pos/api";
import { createProduct } from "@/lib/pos/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid body");
  const result = await createProduct(session.tenantId, session.id, body);
  if (!result.ok) return badRequest(result.reason);
  return NextResponse.json({ product: result.product });
}
