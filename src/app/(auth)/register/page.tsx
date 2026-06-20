"use client";

import { Suspense, useRef } from "react";
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
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { notifyDevOtp, requestOtp } from "@/lib/auth/dev-otp";

const schema = z
  .object({
    fullName: z.string().min(2, "Please enter your full name"),
    businessName: z.string().optional(),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Values = z.infer<typeof schema>;

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect");
  const cardRef = useRef<HTMLDivElement>(null);
  const registerAccount = useAuthStore((s) => s.register);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--glow-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--glow-y", `${e.clientY - rect.top}px`);
  }

  async function onSubmit(values: Values) {
    const supabase = createSupabaseBrowserClient();

    // ── Mock mode (no Supabase keys): create the local account and email a
    // real verification code via our own OTP endpoint. ──────────────────────
    if (!supabase) {
      await registerAccount({
        fullName: values.fullName,
        email: values.email,
        businessName: values.businessName,
        password: values.password,
      });
      const sent = await requestOtp(values.email, "registration");
      if (sent.devCode) notifyDevOtp(sent.devCode, values.email);
      if (sent.error)
        toast.error("Email delivery issue", { description: sent.error });
      toast.success("Check your email", {
        description: "We sent you a 6-digit verification code.",
      });
      const q = new URLSearchParams({
        flow: "registration",
        email: values.email,
      });
      if (redirect) q.set("redirect", redirect);
      router.push(`/verify?${q.toString()}`);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName,
          business_name: values.businessName,
        },
        emailRedirectTo: `${window.location.origin}/${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`,
      },
    });

    if (error) {
      toast.error("Registration failed", { description: error.message });
      return;
    }

    // Supabase doesn't throw on duplicate email (security feature against
    // email enumeration). Instead it returns a user record with an empty
    // identities array. Detect and surface it as an error.
    if (data.user && (data.user.identities ?? []).length === 0) {
      toast.error("Email already registered", {
        description:
          "This email is already in use. Sign in instead, or reset your password if you forgot it.",
        action: {
          label: "Sign in",
          onClick: () => router.push("/login"),
        },
      });
      return;
    }

    // If the project doesn't require email confirmation, Supabase returns a
    // session immediately — go straight to the landing page.
    if (data.session) {
      toast.success("Welcome!");
      router.push(redirect || "/");
      return;
    }

    toast.success("Check your email", {
      description: "We sent you a verification code and link.",
    });
    const q = new URLSearchParams({
      flow: "registration",
      email: values.email,
    });
    if (redirect) q.set("redirect", redirect);
    router.push(`/verify?${q.toString()}`);
  }

  return (
    <div ref={cardRef} onMouseMove={handleMouseMove}>
      <AuthHeading
        title="Create your account"
        subtitle="Get started in minutes. No credit card required."
      />
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field label="Full name" error={errors.fullName?.message}>
          <Input
            placeholder="Jane Cooper"
            autoComplete="name"
            {...register("fullName")}
          />
        </Field>
        <Field label="Business name" optional>
          <Input
            placeholder="Acme Inc."
            autoComplete="organization"
            {...register("businessName")}
          />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input
            type="email"
            placeholder="jane@company.com"
            autoComplete="email"
            {...register("email")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" error={errors.password?.message}>
            <PasswordInput
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("password")}
            />
          </Field>
          <Field label="Confirm" error={errors.confirmPassword?.message}>
            <PasswordInput
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
          </Field>
        </div>
        <Button
          type="submit"
          size="lg"
          variant="accent"
          className="mt-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating account…" : "Create account"}
          {!isSubmitting && <ArrowRight className="size-4" />}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-accent hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  error,
  optional,
  children,
}: {
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="flex items-center gap-1.5">
        {label}
        {optional && (
          <span className="text-xs font-normal text-muted-foreground">
            optional
          </span>
        )}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
