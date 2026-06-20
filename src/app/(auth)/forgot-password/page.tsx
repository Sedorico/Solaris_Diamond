"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, KeyRound } from "lucide-react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      toast.error("Authentication is not configured.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error("Failed to send reset email", {
        description: error.message,
      });
      return;
    }

    toast.success("Reset email sent", {
      description: "Check your inbox for a password reset link.",
    });
    router.push(
      `/verify?flow=password-reset&email=${encodeURIComponent(values.email)}`,
    );
  }

  return (
    <div>
      <span className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-border bg-secondary text-accent">
        <KeyRound className="size-6" />
      </span>
      <AuthHeading
        title="Reset your password"
        subtitle="Enter your email and we'll send you a reset link."
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
        <Button
          type="submit"
          size="lg"
          variant="accent"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending…" : "Send reset link"}
          {!isSubmitting && <ArrowRight className="size-4" />}
        </Button>
      </form>
      <Link
        href="/login"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to sign in
      </Link>
    </div>
  );
}
