import { toast } from "sonner";

export type OtpReason = "registration" | "new-device" | "password-reset";

/**
 * In production the OTP is delivered by Resend (see `lib/email/resend.ts`) and
 * never exposed client-side. In local development there's no inbox, so we
 * surface the code via a toast purely so the flows are testable end to end.
 */
export function notifyDevOtp(code: string, email: string) {
  toast.info("Verification code sent", {
    description: `We emailed a 6-digit code to ${email}. Dev code: ${code}`,
    duration: 12000,
  });
}

/**
 * Ask the server to generate, email and remember a verification code. Returns
 * whether real email was sent and, in mock mode only, the code itself so the
 * dev toast can display it.
 */
export async function requestOtp(email: string, reason: OtpReason) {
  const res = await fetch("/api/auth/otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, reason }),
  });
  return (await res.json()) as {
    ok: boolean;
    mock: boolean;
    devCode?: string;
    error?: string;
  };
}

/** Validate a code the user typed against the server-issued OTP cookie. */
export async function confirmOtp(email: string, code: string, reason?: OtpReason) {
  const res = await fetch("/api/auth/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, reason }),
  });
  return (await res.json()) as { ok: boolean; error?: string };
}
