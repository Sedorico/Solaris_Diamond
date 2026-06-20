/**
 * Centralised environment access. Supabase and database are optional —
 * the app runs in mock mode without any keys.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const env = {
  databaseUrl: process.env.DATABASE_URL,

  supabaseUrl: supabaseUrl ?? "",
  supabaseAnonKey: supabaseAnonKey ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

  paymongoSecretKey: process.env.PAYMONGO_SECRET_KEY,
  paymongoPublicKey: process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY,
  paymongoWebhookSecret: process.env.PAYMONGO_WEBHOOK_SECRET,

  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom:
    process.env.EMAIL_FROM ?? "Solaris Diamond <noreply@solarisdiamond.com>",

  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  cronSecret: process.env.CRON_SECRET,
} as const;

export const integrations = {
  supabase: Boolean(supabaseUrl && supabaseAnonKey),
  paymongo: Boolean(env.paymongoSecretKey),
  resend: Boolean(env.resendApiKey),
  database: Boolean(env.databaseUrl),
};