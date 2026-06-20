import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Stateless, DB-free OTP tokens.
 *
 * The 6-digit code is emailed to the user; the server keeps no database row.
 * Instead it hands the browser an httpOnly, HMAC-signed token that carries the
 * code, the email, the reason and an expiry. On verification the server checks
 * the supplied code against the signed token. Tampering is impossible without
 * the secret, and the cookie is httpOnly so client JS can never read the code.
 *
 * This keeps the verification flow fully working in local/mock mode (no
 * Supabase, no database) while remaining a reasonable lightweight 2FA in
 * production. Swap the cookie store for a Prisma table later without touching
 * the call sites.
 */

const SECRET =
  process.env.AUTH_SECRET ||
  process.env.CRON_SECRET ||
  "solaris-dev-otp-secret-change-me";

export const OTP_COOKIE = "sol_otp";
export const OTP_TTL_SECONDS = 600; // 10 minutes

export type OtpReason = "registration" | "new-device" | "password-reset";

interface OtpPayload {
  email: string;
  reason: OtpReason;
  code: string;
  exp: number; // epoch seconds
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(data: string): string {
  return b64url(createHmac("sha256", SECRET).update(data).digest());
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Build a signed, self-contained token carrying the emailed code. */
export function issueOtpToken(
  email: string,
  reason: OtpReason,
  code: string,
): string {
  const payload: OtpPayload = {
    email: email.toLowerCase(),
    reason,
    code,
    exp: Math.floor(Date.now() / 1000) + OTP_TTL_SECONDS,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Validate a token's signature, expiry, email, reason and code. */
export function verifyOtpToken(
  token: string | undefined,
  email: string,
  code: string,
  reason?: OtpReason,
): boolean {
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  if (!safeEqual(sig, sign(body))) return false;

  let payload: OtpPayload;
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8"));
  } catch {
    return false;
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) return false;
  if (payload.email !== email.toLowerCase()) return false;
  if (reason && payload.reason !== reason) return false;
  return safeEqual(payload.code, code);
}
