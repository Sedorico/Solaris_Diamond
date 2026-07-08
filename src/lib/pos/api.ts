import "server-only";
import { NextResponse } from "next/server";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { hasAdminUnlock } from "@/lib/pos/admin-pin";
import { ensureSettings } from "@/lib/pos/service";

/**
 * Session guard for POS API routes. Every route resolves the caller's tenant
 * here so the server — not the UI — is the real tenant-isolation boundary.
 * Self-contained: no dependency on any other Solaris module.
 */
export async function getOwnerContext(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;
  if (
    session.role !== "OWNER" &&
    session.role !== "ADMIN" &&
    session.role !== "SUPERADMIN"
  ) {
    return null;
  }
  return session;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function badRequest(reason: string) {
  return NextResponse.json({ error: reason }, { status: 400 });
}

export function notFound(reason = "Not found") {
  return NextResponse.json({ error: reason }, { status: 404 });
}

/**
 * 403 with a machine-readable code so the client can open the PIN dialog and
 * retry, instead of treating it as a generic failure.
 */
export function pinRequired() {
  return NextResponse.json(
    { error: "Admin PIN required", code: "PIN_REQUIRED" },
    { status: 403 },
  );
}

/**
 * True when the caller may perform PIN-protected admin actions: either no PIN
 * is configured, or a valid unlock cookie from a recent verification exists.
 */
export async function hasAdminAccess(tenantId: string): Promise<boolean> {
  const settings = await ensureSettings(tenantId);
  if (!settings.pinRequired || !settings.pinHash) return true;
  return hasAdminUnlock(tenantId);
}
