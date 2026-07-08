import "server-only";
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Admin PIN for the POS module. The PIN itself is stored as a scrypt hash on
 * POSSettings; a successful verification issues a short-lived HMAC-signed
 * cookie so the cashier isn't re-prompted on every protected request. Regular
 * selling (catalog, cart, checkout) never touches this.
 */

const COOKIE_NAME = "pos_admin";
const MAX_AGE_SECONDS = 60 * 15; // 15 minutes

function signingSecret(): string {
  return (
    env.attendanceSessionSecret ||
    env.supabaseServiceKey ||
    "solaris-pos-dev-secret"
  );
}

// --- PIN hashing -------------------------------------------------------------

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPinHash(pin: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hash] = parts;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(pin, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

// --- Unlock token (signed cookie) ---------------------------------------------

interface UnlockPayload {
  tid: string; // tenant id the unlock was issued for
  exp: number; // epoch ms
}

function sign(body: string): string {
  return createHmac("sha256", signingSecret()).update(body).digest("base64url");
}

export async function setAdminUnlock(tenantId: string): Promise<void> {
  const payload: UnlockPayload = {
    tid: tenantId,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE_NAME, `${body}.${sign(body)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearAdminUnlock(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/** True when a valid, unexpired unlock cookie exists for this tenant. */
export async function hasAdminUnlock(tenantId: string): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as UnlockPayload;
    return payload.tid === tenantId && payload.exp > Date.now();
  } catch {
    return false;
  }
}
