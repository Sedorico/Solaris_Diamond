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
 * Employee authentication for the public attendance portal. This is entirely
 * separate from the owner's Supabase auth: employees never get a Solaris
 * Diamond account. Credentials are created by the owner, passwords are hashed
 * with scrypt, and the portal session is a stateless HMAC-signed cookie scoped
 * to a single business (tenant + slug).
 */

const COOKIE_NAME = "att_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function signingSecret(): string {
  return (
    env.attendanceSessionSecret ||
    env.supabaseServiceKey ||
    "solaris-attendance-dev-secret"
  );
}

// --- Password hashing ------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hash] = parts;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return (
    expected.length === actual.length && timingSafeEqual(expected, actual)
  );
}

// --- Session token (signed cookie) -----------------------------------------

export interface EmployeeSession {
  eid: string; // employee id
  tid: string; // tenant id
  slug: string; // portal slug the session was issued for
  exp: number; // epoch ms
}

function sign(body: string): string {
  return createHmac("sha256", signingSecret()).update(body).digest("base64url");
}

export function createSessionToken(
  data: Omit<EmployeeSession, "exp">,
): string {
  const payload: EmployeeSession = {
    ...data,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string): EmployeeSession | null {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as EmployeeSession;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// --- Cookie helpers --------------------------------------------------------

export async function setEmployeeSession(
  data: Omit<EmployeeSession, "exp">,
): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, createSessionToken(data), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearEmployeeSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getEmployeeSession(): Promise<EmployeeSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
