"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlert, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthHeading } from "@/components/auth/auth-heading";
import { AuthShader } from "@/components/auth/auth-shader";
import { MeshGradientBackdrop } from "@/components/three/mesh-gradient-backdrop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAdminStore } from "@/lib/store/admin-store";
import { useSession } from "@/lib/auth/hooks";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { user } = useSession();
  const adminAuthed = useAdminStore((s) => s.authed);

  // Already signed in as an admin? Skip the form and go straight to the console.
  // Fixes being asked to log in again when entering via the logo backdoor.
  useEffect(() => {
    if (user?.role === "SUPERADMIN" || adminAuthed) {
      router.replace("/admin");
    }
  }, [user, adminAuthed, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createSupabaseBrowserClient();

    // ── Mock mode (no Supabase): check against the seeded super-admin ──
    if (!supabase) {
      // Trim the password too — the seeded value has no spaces, so this only
      // saves users from accidental trailing whitespace / autofill quirks.
      const ok = useAdminStore.getState().login(email.trim(), password.trim());
      setLoading(false);
      if (!ok) {
        toast.error("Invalid credentials", {
          description: "Check the admin email and password.",
        });
        return;
      }
      toast.success("Welcome, administrator");
      router.push("/admin");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      toast.error("Invalid credentials", {
        description: error.message,
      });
      return;
    }

    const res = await fetch("/api/auth/session");
    const { user } = await res.json();

    if (!user || user.role !== "SUPERADMIN") {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Access denied", {
        description: "This account does not have admin privileges.",
      });
      return;
    }

    toast.success("Welcome, administrator");
    router.push("/admin");
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-4 py-16">
      <div className="pointer-events-none absolute inset-0">
        <MeshGradientBackdrop />
      </div>

      <div className="absolute left-6 right-6 top-6 z-10 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Home
          </Link>
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-premium">
        {/* Form side */}
        <div className="relative flex-1 p-8 sm:p-12">
          <span className="mb-5 inline-flex size-12 items-center justify-center rounded-2xl border border-border bg-secondary text-accent">
            <ShieldAlert className="size-6" />
          </span>
          <AuthHeading
            title="Admin Console"
            subtitle="Restricted access. Authorised personnel only."
          />

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Admin email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@solarisdiamond.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Password</Label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Verifying…
                </>
              ) : (
                <>
                  Access console <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          <p className="relative z-10 mt-8 text-center text-xs text-muted-foreground">
            Protected by enterprise-grade encryption.
          </p>
        </div>

        {/* Brand side with shader */}
        <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden lg:flex">
          <div className="absolute inset-0 z-0 bg-[#f0ece3] dark:bg-[#0a0a0a]" />
          <AuthShader className="absolute inset-0 z-[1] h-full w-full" />
          <div className="relative z-10 flex flex-col items-center gap-5">
            <Logo
              showWord={false}
              href={null}
              className="[&_svg]:size-14"
            />
            <div className="flex flex-col items-center gap-2">
              <span
                style={{
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  fontSize: "1.75rem",
                  letterSpacing: "0.3em",
                  fontWeight: 500,
                }}
                className="uppercase text-[#1C1C1A] dark:text-white"
              >
                Solaris
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
                  Admin
                </span>
                <span className="h-px flex-1 bg-black/20 dark:bg-white/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
