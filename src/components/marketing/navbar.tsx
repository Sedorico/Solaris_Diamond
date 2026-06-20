"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Menu,
  ArrowUpRight,
  LayoutDashboard,
  CreditCard,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { mainNav, siteConfig } from "@/lib/config/site";
import { useSession } from "@/lib/auth/hooks";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { services } from "@/lib/data/services";
import { bundles } from "@/lib/data/bundles";
import { getIcon } from "@/components/icon-map";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useSession();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/");
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      onMouseLeave={() => setMenu(null)}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "glass border-b border-border" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 lg:flex">
          <div onMouseEnter={() => setMenu("services")}>
            <button className="group flex items-center gap-1.5 text-sm text-foreground/70 transition-colors hover:text-foreground">
              Services
              <ChevronDown
                className={cn("size-3.5 transition-transform duration-300", menu === "services" && "rotate-180")}
              />
            </button>
          </div>
          {mainNav
            .filter((i) => i.title !== "Services")
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => setMenu(null)}
                className={cn(
                  "group relative text-sm text-foreground/70 transition-colors hover:text-foreground",
                  pathname === item.href && "text-foreground",
                )}
              >
                {item.title}
                <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle className="hidden border-0 hover:bg-secondary/60 sm:inline-flex" />
          {!loading && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hidden items-center gap-2 rounded-full pl-1 pr-1 outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring sm:flex"
                  aria-label="Account menu"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {initials(user.fullName)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium text-foreground">
                    {user.fullName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard /> Dashboard
                  </Link>
                </DropdownMenuItem>
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
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild size="sm" variant="accent" className="hidden sm:inline-flex">
                <Link href="/register">
                  Get started <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </>
          )}
          <MobileMenu pathname={pathname} isLoggedIn={!loading && !!user} />
        </div>
      </div>

      {/* Services mega panel */}
      <AnimatePresence>
        {menu === "services" && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-full hidden lg:block"
          >
            <div className="border-t border-border bg-background shadow-premium">
              <div className="mx-auto grid max-w-6xl grid-cols-[1.4fr_1fr] gap-10 px-6 py-8">
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  {services.map((s, i) => {
                    const Icon = getIcon(s.icon);
                    return (
                      <Link
                        key={s.id}
                        href={s.href}
                        onClick={() => setMenu(null)}
                        className="group flex items-center gap-4 border-b border-border/60 py-4 transition-colors last:border-0"
                      >
                        <span className="eyebrow w-6 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                        <Icon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-accent" />
                        <span className="flex flex-1 items-center justify-between">
                          <span className="text-sm font-medium transition-colors group-hover:text-accent">
                            {s.name}
                          </span>
                          <ArrowUpRight className="size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                        </span>
                      </Link>
                    );
                  })}
                </div>
                <div className="flex flex-col justify-between border-l border-border/60 pl-10">
                  <div>
                    <span className="eyebrow">Bundles</span>
                    <p className="font-display mt-3 text-xl font-medium leading-snug">
                      Save up to 30% with curated bundles.
                    </p>
                  </div>
                  <div className="mt-6 flex flex-col gap-2">
                    {bundles.map((b) => (
                      <Link
                        key={b.id}
                        href="/bundles"
                        onClick={() => setMenu(null)}
                        className="flex items-center justify-between text-sm text-foreground/70 transition-colors hover:text-foreground"
                      >
                        {b.name}
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function MobileMenu({ pathname, isLoggedIn }: { pathname: string; isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <div className="flex h-full flex-col p-6">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Logo />
          <nav className="mt-12 flex flex-col">
            {mainNav.map((item, i) => (
              <SheetClose asChild key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "font-display flex items-center gap-4 border-b border-border py-5 text-2xl font-medium transition-colors",
                    pathname === item.href ? "text-accent" : "hover:text-accent",
                  )}
                >
                  <span className="eyebrow w-6">{String(i + 1).padStart(2, "0")}</span>
                  {item.title}
                </Link>
              </SheetClose>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            <div className="flex items-center justify-between border border-border px-4 py-3">
              <span className="text-sm text-muted-foreground">Appearance</span>
              <ThemeToggle />
            </div>
            {isLoggedIn ? (
              <SheetClose asChild>
                <Button asChild variant="accent" size="lg">
                  <Link href="/dashboard">
                    <LayoutDashboard className="size-4" /> Dashboard
                  </Link>
                </Button>
              </SheetClose>
            ) : (
              <>
                <SheetClose asChild>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/login">Login</Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button asChild variant="accent" size="lg">
                    <Link href="/register">Get started</Link>
                  </Button>
                </SheetClose>
              </>
            )}
            <p className="eyebrow mt-2 text-center">{siteConfig.tagline}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
