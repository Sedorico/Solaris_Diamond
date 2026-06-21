"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { useSession } from "@/lib/auth/hooks";
import { notifyDevOtp, requestOtp } from "@/lib/auth/dev-otp";
import { integrations } from "@/lib/env";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

type Values = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/";
  const login = useAuthStore((s) => s.login);
  const { refresh } = useSession();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    // ── Production mode: Supabase auth ──────────────────────────────────────
    if (integrations.supabase) {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        toast.error("Sign in failed", { description: error.message });
        return;
      }
      // Refresh the shared session BEFORE navigating so the guards + navbar see
      // the new user immediately. Without this, the dashboard can briefly bounce
      // back to /login (or the navbar still shows "Login") until the auth
      // listener catches up — the intermittent bug.
      await refresh();
      toast.success("Welcome back");
      router.push(redirect);
      router.refresh();
      return;
    }

    // ── Mock mode: Zustand auth (no Supabase keys) ───────────────────────────
    const res = await login(values);
    if (res.status === "verify") {
      // New device → ask the server to email a real verification code.
      const sent = await requestOtp(values.email, "new-device");
      if (sent.devCode) notifyDevOtp(sent.devCode, values.email);
      if (sent.error)
        toast.error("Email delivery issue", { description: sent.error });
      toast.warning("New device detected", {
        description: "For your security we've emailed a verification code.",
      });
      const q = new URLSearchParams({
        flow: "new-device",
        email: values.email,
        redirect,
      });
      router.push(`/verify?${q.toString()}`);
      return;
    }
    toast.success("Welcome back");
    router.push(redirect);
  }

  return (
    <div>
      <AuthHeading
        title="Welcome back"
        subtitle="Sign in to your Solaris Diamond workspace."
      />
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Email</Label>
          <Input
            type="email"
            placeholder="jane@company.com"
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label>Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-accent hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            placeholder="••••••••"
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Switch defaultChecked />
          Remember me for 30 days
        </label>

        <Button
          type="submit"
          size="lg"
          variant="accent"
          className="mt-1"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
          {!isSubmitting && <ArrowRight className="size-4" />}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Solaris?{" "}
        <Link
          href="/register"
          className="font-medium text-accent hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}