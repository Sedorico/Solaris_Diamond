"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Values = z.infer<typeof schema>;

export default function ResetPasswordPage() {
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
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      toast.error("Failed to update password", {
        description: error.message,
      });
      return;
    }

    toast.success("Password updated", {
      description: "You can now sign in with your new password.",
    });
    router.push("/login");
  }

  return (
    <div>
      <span className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-border bg-secondary text-accent">
        <ShieldCheck className="size-6" />
      </span>
      <AuthHeading
        title="Set a new password"
        subtitle="Choose a strong password you haven't used before."
      />
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>New password</Label>
          <Input
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Confirm new password</Label>
          <Input
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
        <Button
          type="submit"
          size="lg"
          variant="accent"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Updating…" : "Update password"}
          {!isSubmitting && <ArrowRight className="size-4" />}
        </Button>
      </form>
    </div>
  );
}
