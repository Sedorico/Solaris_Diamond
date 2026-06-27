"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { PremiumBackdrop } from "@/components/checkout/premium-backdrop";
import { DiamondMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LiveClock } from "@/components/motion/live-clock";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSession } from "@/lib/auth/hooks";
import { useAdminStore } from "@/lib/store/admin-store";
import { integrations } from "@/lib/env";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, enriched } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLogin = pathname === "/admin/login";

  // In mock mode (no Supabase) admin access is gated by the seeded admin store
  // instead of the server session. Wait for persisted state to hydrate first
  // so we don't redirect an already-authed admin on refresh.
  const mockMode = !integrations.supabase;
  const adminAuthed = useAdminStore((s) => s.authed);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(useAdminStore.persist.hasHydrated());
    return useAdminStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  // Admin gating needs the authoritative role, so wait for the full session
  // (`enriched`) — not just the instant login check (`loading`).
  const checking = mockMode ? !hydrated : loading || !enriched;
  const authorized = mockMode
    ? adminAuthed
    : !!user && user.role === "SUPERADMIN";

  useEffect(() => {
    if (isLogin || checking) return;
    if (!authorized) {
      // A signed-in non-admin (real mode) lands on the dashboard; everyone
      // else goes to the admin login.
      if (!mockMode && user) router.replace("/dashboard");
      else router.replace("/admin/login");
    }
  }, [isLogin, checking, authorized, mockMode, user, router]);

  if (isLogin) return <>{children}</>;

  if (checking || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <DiamondMark className="size-12 animate-pulse" />
      </div>
    );
  }

  return (
    <>
      {/* Flowing gold wave-line backdrop behind the whole admin console */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <PremiumBackdrop />
      </div>

      <div className="glass-scope flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">
          <AdminSidebar />
        </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-foreground/10 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 border-0 p-0">
                <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                <AdminSidebar onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-3.5">
              <span className="h-px w-8 bg-accent/60" />
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/90 sm:text-[15px]">
                Admin Console
              </span>
              <span className="hidden h-4 w-px bg-foreground/15 sm:block" />
              <LiveClock className="hidden font-mono text-[11px] tracking-[0.22em] text-muted-foreground sm:inline-flex" />
            </div>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </>
  );
}
