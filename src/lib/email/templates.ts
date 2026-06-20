import "server-only";
import { Resend } from "resend";
import { env, integrations } from "@/lib/env";

const resend = integrations.resend ? new Resend(env.resendApiKey) : null;

async function deliver(to: string, subject: string, html: string) {
  if (!resend) {
    console.info(`[email:mock] → ${to} · ${subject}`);
    return { mock: true as const };
  }
  await resend.emails.send({ from: env.emailFrom, to, subject, html });
  return { mock: false as const };
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

function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:16px;background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px">${label}</a>`;
}

export function sendExpiryWarningEmail(opts: {
  to: string;
  userName: string;
  serviceName: string;
  daysLeft: number;
  renewUrl: string;
}) {
  return deliver(
    opts.to,
    `${opts.serviceName} subscription expires in ${opts.daysLeft} day${opts.daysLeft === 1 ? "" : "s"}`,
    shell(
      `Your ${opts.serviceName} subscription is ending soon`,
      `<p style="color:#555;font-size:14px">Hi ${opts.userName}, your subscription to <strong>${opts.serviceName}</strong> will expire in <strong>${opts.daysLeft} day${opts.daysLeft === 1 ? "" : "s"}</strong>. Renew now to avoid interruption.</p>
       ${button(opts.renewUrl, "Renew subscription")}`,
    ),
  );
}

export function sendExpiredEmail(opts: {
  to: string;
  userName: string;
  serviceName: string;
  renewUrl: string;
}) {
  return deliver(
    opts.to,
    `${opts.serviceName} subscription expired`,
    shell(
      `Your ${opts.serviceName} subscription has expired`,
      `<p style="color:#555;font-size:14px">Hi ${opts.userName}, access to <strong>${opts.serviceName}</strong> has been suspended. Renew anytime to restore your data and continue where you left off.</p>
       ${button(opts.renewUrl, "Renew now")}`,
    ),
  );
}

export function sendSubscriptionActivatedEmail(opts: {
  to: string;
  userName: string;
  serviceName: string;
  endDate: Date;
}) {
  const formatted = opts.endDate.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return deliver(
    opts.to,
    `${opts.serviceName} is now active`,
    shell(
      `${opts.serviceName} activated`,
      `<p style="color:#555;font-size:14px">Hi ${opts.userName}, your subscription to <strong>${opts.serviceName}</strong> is now active until <strong>${formatted}</strong>.</p>
       ${button(`${env.appUrl}/dashboard`, "Open dashboard")}`,
    ),
  );
}
