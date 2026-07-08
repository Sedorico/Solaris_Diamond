import { NextResponse } from "next/server";
import { getOwnerContext, unauthorized, badRequest } from "@/lib/attendance/api";
import { reviewRequest, type ReviewDecision } from "@/lib/attendance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DECISIONS: ReviewDecision[] = ["APPROVE", "REJECT", "LATE"];

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const decision = body?.decision as ReviewDecision;
  if (!DECISIONS.includes(decision)) return badRequest("Invalid decision");

  const result = await reviewRequest(session.tenantId, id, decision, session.id);
  if (!result.ok) return badRequest(result.reason ?? "Could not review request");
  return NextResponse.json({ ok: true });
}
