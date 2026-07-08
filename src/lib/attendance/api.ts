import "server-only";
import { NextResponse } from "next/server";
import { getSession, type SessionUser } from "@/lib/auth/session";

/**
 * Resolve the owner/admin session for an attendance API call, or null if the
 * caller is not an authenticated manager. Every owner route uses this so the
 * server — not the UI — is the real tenant-isolation boundary.
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

/** Read browser/device from a User-Agent string for punch metadata. */
export function parseUserAgent(ua: string | null): {
  browser: string;
  device: string;
} {
  if (!ua) return { browser: "Unknown", device: "Unknown" };
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const device = /Mobi|Android|iPhone/.test(ua)
    ? "Mobile"
    : /iPad|Tablet/.test(ua)
      ? "Tablet"
      : "Desktop";
  return { browser, device };
}
