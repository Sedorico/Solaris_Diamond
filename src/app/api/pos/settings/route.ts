import { NextResponse } from "next/server";
import {
  getOwnerContext,
  unauthorized,
  badRequest,
  pinRequired,
  hasAdminAccess,
} from "@/lib/pos/api";
import { getSettings, updateSettings } from "@/lib/pos/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Settings are readable without a PIN (the register needs branding). */
export async function GET() {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  return NextResponse.json({ settings: await getSettings(session.tenantId) });
}

/** Changing branding / receipt / tax settings is an admin action. */
export async function PATCH(request: Request) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  if (!(await hasAdminAccess(session.tenantId))) return pinRequired();
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid body");
  const result = await updateSettings(session.tenantId, session.id, body);
  if (!result.ok) return badRequest(result.reason);
  return NextResponse.json({ settings: result.settings });
}
