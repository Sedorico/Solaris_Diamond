"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { AuthShader } from "@/components/auth/auth-shader";
import { MeshGradientBackdrop } from "@/components/three/mesh-gradient-backdrop";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { apiSend } from "@/lib/attendance/client";

/**
 * Employee login for the attendance portal. Mirrors the Solaris Diamond
 * `/login` design exactly, but the brand wordmark (top-left + right panel) and
 * the logo are driven by the owner's business name and uploaded logo. When no
 * logo is set, the logo slot is left blank.
 */
export function LoginScreen({
  slug,
  businessName,
  logoUrl,
  onSignedIn,
}: {
  slug: string;
  businessName: string;
  logoUrl: string | null;
  onSignedIn: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    setBusy(true);
    try {
      await apiSend(`/api/attendance/portal/${slug}/login`, "POST", {
        username,
        password,
      });
      onSignedIn();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-4 py-16">
      <div className="pointer-events-none absolute inset-0">
        <MeshGradientBackdrop />
      </div>

      {/* Top bar — business brand (left) + theme toggle (right) */}
      <div className="absolute left-6 right-6 top-6 z-10 flex items-center justify-between">
        <span className="inline-flex items-center gap-2.5">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="size-7 rounded-md object-contain"
            />
          )}
          <span className="text-[15px] font-semibold tracking-tight">
            {businessName}
          </span>
        </span>
        <ThemeToggle />
      </div>

      {/* Split card */}
      <div className="relative z-10 flex w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-premium">
        {/* Form side */}
        <div className="relative flex-1 p-8 sm:p-12">
          <AuthHeading
            title="Welcome back"
            subtitle={`Sign in to ${businessName} attendance.`}
          />
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your username"
                autoCapitalize="none"
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Password</Label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              variant="accent"
              className="mt-1"
              disabled={busy}
            >
              {busy ? "Signing in…" : "Sign in"}
              {!busy && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <p className="relative z-10 mt-8 text-center text-xs text-muted-foreground">
            Protected by enterprise-grade encryption.
          </p>
        </div>

        {/* Brand side */}
        <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden lg:flex">
          <div className="absolute inset-0 z-0 bg-[#f0ece3] dark:bg-[#0a0a0a]" />
          <AuthShader className="absolute inset-0 z-[1] h-full w-full" />
          <div className="relative z-10 flex flex-col items-center gap-5 px-8 text-center">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`${businessName} logo`}
                className="size-16 object-contain"
              />
            )}
            <div className="flex flex-col items-center gap-2">
              <span
                style={{
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  fontSize: "1.75rem",
                  letterSpacing: "0.16em",
                  fontWeight: 500,
                }}
                className="uppercase leading-tight text-[#1C1C1A] dark:text-white"
              >
                {businessName}
              </span>
              <div className="flex w-full items-center gap-3">
                <span className="h-px flex-1 bg-black/20 dark:bg-white/30" />
                <span
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "0.55rem",
                    letterSpacing: "0.45em",
                    fontWeight: 500,
                  }}
                  className="uppercase text-black/40 dark:text-white/50"
                >
                  Attendance
                </span>
                <span className="h-px flex-1 bg-black/20 dark:bg-white/30" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="relative z-10 mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
        Powered by Solaris Diamond
      </p>
    </div>
  );
}
