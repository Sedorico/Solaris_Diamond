import "server-only";
import { Resend } from "resend";
import { env, integrations } from "@/lib/env";

/**
 * Transactional email via Resend. In mock mode (no API key) we log the message
 * to the server console instead of sending — so OTP and welcome flows are
 * observable in local development without an inbox.
 */

const resend = integrations.resend ? new Resend(env.resendApiKey) : null;

async function deliver(to: string, subject: string, html: string) {
  if (!resend) {
    console.info(`[email:mock] → ${to} · ${subject}`);
    return { mock: true as const };
  }
  // The Resend SDK returns `{ data, error }` rather than throwing — so a failed
  // send (e.g. the free-tier "can only send to your own address" restriction)
  // is otherwise swallowed silently. Surface it to the console and the caller.
  const { data, error } = await resend.emails.send({
    from: env.emailFrom,
    to,
    subject,
    html,
  });
  if (error) {
    console.error(`[email:error] → ${to} · ${subject}`, error);
    return { mock: false as const, error: error.message };
  }
  console.info(`[email:sent] → ${to} · ${subject} · id=${data?.id ?? "?"}`);
  return { mock: false as const, id: data?.id };
}

function shell(title: string, body: string) {
  return `
  <div style="font-family:ui-sans-serif,system-ui,sans-serif;background:#fafafa;padding:40px 0">
    <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:16px;padding:32px">
      <div style="font-weight:600;font-size:18px;letter-spacing:-.02em">Solaris<span style="color:#888"> Diamond</span></div>
      <h1 style="font-size:20px;margin:24px 0 8px">${title}</h1>
      ${body}
      <p style="color:#999;font-size:12px;margin-top:32px">© ${new Date().getFullYear()} Solaris Diamond</p>
    </div>
  </div>`;
}

export function sendOtpEmail(to: string, code: string) {
  return deliver(
    to,
    "Your Solaris Diamond verification code",
    shell(
      "Verify your account",
      `<p style="color:#555;font-size:14px">Use the code below to verify your account. It expires in 10 minutes.</p>
       <div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:20px 0">${code}</div>
       <p style="color:#999;font-size:12px">If you didn't request this, you can safely ignore this email.</p>`,
    ),
  );
}

export function sendWelcomeEmail(to: string, name: string) {
  return deliver(
    to,
    "Welcome to Solaris Diamond",
    shell(
      `Welcome, ${name}!`,
      `<p style="color:#555;font-size:14px">Your workspace is ready. Jump into your dashboard to start adding products, ringing up sales and more.</p>
       <a href="${env.appUrl}/dashboard" style="display:inline-block;margin-top:16px;background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px">Open dashboard</a>`,
    ),
  );
}

export function sendNewDeviceEmail(to: string, code: string) {
  return deliver(
    to,
    "New device sign-in — verification required",
    shell(
      "New device detected",
      `<p style="color:#555;font-size:14px">We noticed a sign-in from a new device. For your security, enter this code to continue:</p>
       <div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:20px 0">${code}</div>`,
    ),
  );
}
