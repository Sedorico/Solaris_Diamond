import { NextResponse } from "next/server";
import { getOwnerContext, unauthorized, badRequest } from "@/lib/pos/api";
import {
  hasAdminUnlock,
  setAdminUnlock,
  clearAdminUnlock,
} from "@/lib/pos/admin-pin";
import { changePin, ensureSettings, verifyPin } from "@/lib/pos/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const settings = await ensureSettings(session.tenantId);
  return NextResponse.json({
    pinRequired: settings.pinRequired,
    pinSet: Boolean(settings.pinHash),
    unlocked:
      !settings.pinRequired ||
      !settings.pinHash ||
      (await hasAdminUnlock(session.tenantId)),
  });
}

/** Verify the PIN and issue a short-lived unlock cookie. */
export async function POST(request: Request) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const body = await request.json().catch(() => null);
  const pin = String(body?.pin ?? "");
  if (!pin) return badRequest("PIN is required");
  const ok = await verifyPin(session.tenantId, session.id, pin);
  if (!ok)
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  await setAdminUnlock(session.tenantId);
  return NextResponse.json({ ok: true });
}

/** Set, change or remove the PIN (newPin: null removes it). */
export async function PATCH(request: Request) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body || !("newPin" in body)) return badRequest("Invalid body");
  const result = await changePin(session.tenantId, session.id, {
    currentPin: body.currentPin ? String(body.currentPin) : undefined,
    newPin: body.newPin === null ? null : String(body.newPin),
  });
  if (!result.ok) return badRequest(result.reason);
  // A fresh PIN invalidates any existing unlock.
  await clearAdminUnlock();
  return NextResponse.json({ ok: true });
}

/** Manually relock the admin areas. */
export async function DELETE() {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  await clearAdminUnlock();
  return NextResponse.json({ ok: true });
}
