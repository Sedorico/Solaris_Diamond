import { NextResponse } from "next/server";
import { z } from "zod";
import { integrations } from "@/lib/env";
import { sendOtpEmail, sendNewDeviceEmail } from "@/lib/email/resend";
import { generateOtp } from "@/lib/utils";
import {
  issueOtpToken,
  OTP_COOKIE,
  OTP_TTL_SECONDS,
  type OtpReason,
} from "@/lib/auth/otp";

const schema = z.object({
  email: z.string().email(),
  reason: z
    .enum(["registration", "new-device", "password-reset"])
    .default("registration"),
});

/**
 * Generate a 6-digit code, email it (real email when Resend is configured,
 * otherwise logged to the server console), and store a signed token in an
 * httpOnly cookie so it can be verified later. No database required.
 */
export async function POST(request: Request) {
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
      { ok: false, error: "Enter a valid email address" },
      { status: 400 },
    );
  }

  const { email, reason } = parsed.data;
  const code = generateOtp();

  // Deliver. In mock mode (no Resend key) `deliver()` logs to the console.
  const result =
    reason === "new-device"
      ? await sendNewDeviceEmail(email, code)
      : await sendOtpEmail(email, code);

  const deliveryFailed = "error" in result && Boolean(result.error);

  const token = issueOtpToken(email, reason as OtpReason, code);

  const res = NextResponse.json({
    ok: true,
    mock: !integrations.resend,
    error: deliveryFailed ? (result as { error?: string }).error : undefined,
    // Reveal the code when there is no real inbox (local dev) OR when a real
    // send failed — so a misconfigured Resend setup never fully blocks the
    // flow locally. Never exposed on a successful production send.
    devCode: !integrations.resend || deliveryFailed ? code : undefined,
  });
  res.cookies.set(OTP_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OTP_TTL_SECONDS,
  });
  return res;
}
