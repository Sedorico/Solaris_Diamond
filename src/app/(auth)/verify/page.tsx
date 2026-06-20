"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, MailCheck } from "lucide-react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { OtpInput } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  confirmOtp,
  requestOtp,
  notifyDevOtp,
  type OtpReason,
} from "@/lib/auth/dev-otp";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();

  const flow = params.get("flow") ?? "registration";
  const redirect = params.get("redirect") ?? "/";
  const token_hash = params.get("token_hash");
  const type = params.get("type");

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Auto-redirect if the user is already authenticated. Happens when the
  // Supabase email link sets session cookies and bounces back to /verify
  // — no token in the URL, but the user is already logged in.
  useEffect(() => {
    if (token_hash && type) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        toast.success("You're signed in");
        router.replace(redirect);
      }
    });
  }, [token_hash, type, redirect, router]);

  // Handle magic link / email confirmation callback
  useEffect(() => {
    if (token_hash && type) {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;
      supabase.auth
        .verifyOtp({ token_hash, type: type as "email" | "signup" })
        .then(({ error: err }) => {
          if (err) {
            setError(err.message);
          } else {
            toast.success("Email verified", {
              description: "Your account is ready.",
            });
            router.push(redirect);
          }
        });
    }
  }, [token_hash, type, redirect, router]);

  const email = params.get("email") ?? "";
  const reason = (flow as OtpReason) ?? "registration";

  async function submit(value: string) {
    setVerifying(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();

    // ── Mock mode (no Supabase): verify against the server-issued OTP cookie ──
    if (!supabase) {
      const { ok, error: err } = await confirmOtp(email, value, reason);
      setVerifying(false);
      if (!ok) {
        setError(err ?? "That code isn't right, or it has expired.");
        return;
      }
      if (reason === "password-reset") {
        toast.success("Verified", { description: "Choose a new password." });
        router.push("/reset-password");
        return;
      }
      useAuthStore.getState().completeVerification();
      toast.success("Verified", { description: "You're all set." });
      router.push(redirect);
      return;
    }

    if (flow === "password-reset") {
      const { error: err } = await supabase.auth.verifyOtp({
        email: params.get("email") ?? "",
        token: value,
        type: "recovery",
      });
      setVerifying(false);
      if (err) {
        setError(err.message);
        return;
      }
      router.push("/reset-password");
      return;
    }

    const { error: err } = await supabase.auth.verifyOtp({
      email: params.get("email") ?? "",
      token: value,
      type: "signup",
    });
    setVerifying(false);
    if (err) {
      setError(err.message);
      return;
    }
    toast.success("Verified", { description: "Your account is ready." });
    router.push(redirect);
  }

  function handleChange(value: string) {
    setCode(value);
    setError(null);
    if (value.length === 6) submit(value);
  }

  // If we're handling a callback link, show loading
  if (token_hash && type) {
    return (
      <div className="flex flex-col items-center gap-4">
        <MailCheck className="size-12 animate-pulse text-accent" />
        <p className="text-sm text-muted-foreground">
          Verifying your email...
        </p>
      </div>
    );
  }

  return (
    <div>
      <span className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-border bg-secondary text-accent">
        <MailCheck className="size-6" />
      </span>
      <AuthHeading
        title="Check your email"
        subtitle="We sent you a verification link. Click it to confirm your account, or enter the 6-digit code below."
      />

      <OtpInput value={code} onChange={handleChange} />
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <Button
        size="lg"
        variant="accent"
        className="mt-6 w-full"
        disabled={code.length !== 6 || verifying}
        onClick={() => submit(code)}
      >
        {verifying ? "Verifying…" : "Verify & continue"}
        {!verifying && <ArrowRight className="size-4" />}
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Didn&apos;t get it? Check your spam folder or{" "}
        <button
          onClick={async () => {
            const supabase = createSupabaseBrowserClient();
            if (!supabase) {
              const sent = await requestOtp(email, reason);
              if (sent.devCode) notifyDevOtp(sent.devCode, email);
              else toast.info("Verification code resent");
              return;
            }
            if (email) {
              await supabase.auth.resend({ type: "signup", email });
              toast.info("Verification email resent");
            }
          }}
          className="font-medium text-accent hover:underline"
        >
          resend code
        </button>
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
