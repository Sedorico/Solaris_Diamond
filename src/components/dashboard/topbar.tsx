"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  Search,
  LogOut,
  Settings,
  CreditCard,
  User,
} from "lucide-react";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { dashboardNav } from "@/lib/data/dashboard-nav";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/dashboard/sidebar";
import { useSession } from "@/lib/auth/hooks";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const current = dashboardNav.find((n) =>
    n.href === "/dashboard"
      ? pathname === n.href
      : pathname.startsWith(n.href),
  );

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="glass-strong sticky top-0 z-30 flex h-15 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
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
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <h1 className="text-base font-semibold tracking-tight">
          {current?.title ?? "Dashboard"}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search…"
            className="h-9 w-56 rounded-full border border-input bg-background/60 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <NotificationBell />
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full pl-1 pr-2.5 outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user ? initials(user.fullName) : "SD"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium text-foreground">
                {user?.fullName ?? "Guest"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email ?? "Not signed in"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <User /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/billing">
                <CreditCard /> Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
