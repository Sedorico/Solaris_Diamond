import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtpToken, OTP_COOKIE, type OtpReason } from "@/lib/auth/otp";

const schema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  reason: z
    .enum(["registration", "new-device", "password-reset"])
    .optional(),
});

/**
 * Verify a submitted code against the signed OTP cookie. On success the cookie
 * is cleared so the code cannot be replayed.
 */
export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Enter the 6-digit code" },
      { status: 400 },
    );
  }

  const token = request.cookies.get(OTP_COOKIE)?.value;
  const ok = verifyOtpToken(
    token,
    parsed.data.email,
    parsed.data.code,
    parsed.data.reason as OtpReason | undefined,
  );

  const res = NextResponse.json(
    ok
      ? { ok: true }
      : { ok: false, error: "That code isn't right, or it has expired." },
    { status: ok ? 200 : 401 },
  );
  if (ok) res.cookies.delete(OTP_COOKIE);
  return res;
}
