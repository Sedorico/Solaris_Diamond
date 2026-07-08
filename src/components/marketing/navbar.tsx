"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useScroll,
  useSpring,
} from "motion/react";
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
import { useConcierge } from "@/lib/store/concierge";
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
import { Logo, SolarisMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii"];

// Chapter order: Services (the plate) first, then the rest of mainNav split
// around the centred logo — left gets the first two, right gets the rest.
const restNav = mainNav.filter((i) => i.title !== "Services");
const leftNav = restNav.slice(0, 2);
const rightNav = restNav.slice(2);

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const openConcierge = useConcierge((s) => s.setOpen);
  const { user, loading } = useSession();

  // Reading progress — a gold hairline that fills as the visitor reads.
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });

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
      className="fixed inset-x-0 top-0 z-50"
    >
      {/* Reading progress — fills along the very top edge as you scroll */}
      <motion.div
        style={{ scaleX: progress }}
        className="absolute inset-x-0 top-0 z-10 h-[2px] origin-left bg-accent/80"
      />

      {/* ── Desktop: full masthead at rest ↔ floating capsule when reading ── */}
      <div className="hidden lg:block">
        <AnimatePresence initial={false} mode="wait">
          {!scrolled ? (
            <motion.div
              key="masthead"
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mx-auto grid h-20 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-10">
                {/* Left chapters */}
                <nav className="flex items-center justify-start gap-8">
                  <button
                    onMouseEnter={() => setMenu("services")}
                    className="group flex items-baseline gap-2 text-foreground/80 transition-colors hover:text-foreground"
                  >
                    <span className="font-display text-xs italic text-accent/70">
                      i.
                    </span>
                    <SwapLabel label="Services" />
                    <ChevronDown
                      className={cn(
                        "size-3 self-center text-muted-foreground transition-transform duration-300",
                        menu === "services" && "rotate-180",
                      )}
                    />
                  </button>
                  {leftNav.map((item, idx) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onMouseEnter={() => setMenu(null)}
                      className={cn(
                        "group flex items-baseline gap-2 text-foreground/80 transition-colors hover:text-foreground",
                        pathname === item.href && "text-foreground",
                      )}
                    >
                      <span className="font-display text-xs italic text-accent/70">
                        {ROMAN[idx + 1]}.
                      </span>
                      <SwapLabel label={item.title} />
                    </Link>
                  ))}
                </nav>

                {/* The mark, centred like a masthead */}
                <Logo className="mx-12" />

                {/* Right chapters + appendix */}
                <div className="flex items-center justify-end gap-8">
                  {rightNav.map((item, idx) =>
                    item.title === "Contact" ? (
                      <button
                        key={item.href}
                        onClick={() => {
                          setMenu(null);
                          openConcierge(true);
                        }}
                        onMouseEnter={() => setMenu(null)}
                        className="group flex items-baseline gap-2 text-foreground/80 transition-colors hover:text-foreground"
                      >
                        <span className="font-display text-xs italic text-accent/70">
                          {ROMAN[idx + 1 + leftNav.length]}.
                        </span>
                        <SwapLabel label={item.title} />
                      </button>
                    ) : (
                      <Link
                        key={item.href}
                        href={item.href}
                        onMouseEnter={() => setMenu(null)}
                        className={cn(
                          "group flex items-baseline gap-2 text-foreground/80 transition-colors hover:text-foreground",
                          pathname === item.href && "text-foreground",
                        )}
                      >
                        <span className="font-display text-xs italic text-accent/70">
                          {ROMAN[idx + 1 + leftNav.length]}.
                        </span>
                        <SwapLabel label={item.title} />
                      </Link>
                    ),
                  )}
                  <span className="h-5 w-px bg-border" />
                  <div className="flex items-center gap-3.5">
                    <ThemeToggle className="border-0 hover:bg-secondary/60" />
                    {loading ? (
                      <div className="size-8 animate-pulse rounded-full bg-secondary/70" />
                    ) : user ? (
                      <AccountMenu user={user} onLogout={handleLogout} />
                    ) : (
                      <>
                        <Link
                          href="/login"
                          className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Login
                        </Link>
                        <Link
                          href="/register"
                          className="group flex items-center gap-2 rounded-full border border-accent/50 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          Get started
                          <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:rotate-45" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Masthead hairline, pinned with a tiny diamond */}
              <div className="relative mx-auto max-w-7xl px-10">
                <div className="h-px bg-gradient-to-r from-transparent via-foreground/25 to-transparent" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[7px] leading-none text-accent">
                  ◆
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="capsule"
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex justify-center pt-4"
            >
              <div className="glass flex items-center rounded-full border border-border py-1.5 pl-2 pr-1.5 shadow-premium">
                <Link
                  href="/"
                  aria-label="Solaris Diamond — home"
                  className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-secondary/60"
                >
                  <SolarisMark className="size-6" />
                </Link>
                <span className="mx-2 h-4 w-px bg-border" />

                {/* Chapters — roman numerals that unfurl their titles on hover */}
                <nav className="flex items-center">
                  <button
                    onMouseEnter={() => setMenu("services")}
                    className="group flex items-center rounded-full px-2.5 py-1.5 transition-colors hover:bg-secondary/60"
                  >
                    <span className="font-display text-sm italic leading-none text-foreground/80 transition-colors group-hover:text-accent">
                      i.
                    </span>
                    <UnfurlLabel label="Services" />
                  </button>
                  {restNav.map((item, idx) =>
                    item.title === "Contact" ? (
                      <button
                        key={item.href}
                        onClick={() => {
                          setMenu(null);
                          openConcierge(true);
                        }}
                        onMouseEnter={() => setMenu(null)}
                        className="group flex items-center rounded-full px-2.5 py-1.5 transition-colors hover:bg-secondary/60"
                      >
                        <span className="font-display text-sm italic leading-none text-foreground/80 transition-colors group-hover:text-accent">
                          {ROMAN[idx + 1]}.
                        </span>
                        <UnfurlLabel label={item.title} />
                      </button>
                    ) : (
                      <Link
                        key={item.href}
                        href={item.href}
                        onMouseEnter={() => setMenu(null)}
                        className={cn(
                          "group flex items-center rounded-full px-2.5 py-1.5 transition-colors hover:bg-secondary/60",
                        )}
                      >
                        <span
                          className={cn(
                            "font-display text-sm italic leading-none transition-colors group-hover:text-accent",
                            pathname === item.href
                              ? "text-accent"
                              : "text-foreground/80",
                          )}
                        >
                          {ROMAN[idx + 1]}.
                        </span>
                        <UnfurlLabel label={item.title} />
                      </Link>
                    ),
                  )}
                </nav>

                <span className="mx-2 h-4 w-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <ThemeToggle className="border-0 hover:bg-secondary/60" />
                  {loading ? (
                    <div className="size-8 animate-pulse rounded-full bg-secondary/70" />
                  ) : user ? (
                    <AccountMenu user={user} onLogout={handleLogout} />
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="rounded-full px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Login
                      </Link>
                      <Link
                        href="/register"
                        aria-label="Get started"
                        title="Get started"
                        className="group flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-glow transition-transform duration-300 hover:scale-110"
                      >
                        <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mobile / tablet bar ── */}
      <div
        className={cn(
          "flex h-16 items-center justify-between px-6 transition-all duration-500 lg:hidden",
          scrolled ? "glass border-b border-border" : "",
        )}
      >
        <Logo />
        <div className="flex items-center gap-1.5">
          <ThemeToggle className="hidden border-0 hover:bg-secondary/60 sm:inline-flex" />
          {!loading && user && (
            <AccountMenu user={user} onLogout={handleLogout} />
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

/**
 * Masthead label — mono small-caps at rest; on hover the label slides up and
 * is replaced by its serif-italic twin in gold. A tiny piece of typesetting
 * theatre on every link.
 */
function SwapLabel({ label }: { label: string }) {
  return (
    <span className="relative block h-[15px] overflow-hidden">
      <span className="block font-mono text-[10px] uppercase leading-[15px] tracking-[0.24em] transition-transform duration-300 group-hover:-translate-y-full">
        {label}
      </span>
      <span className="absolute inset-0 block translate-y-full font-display text-[14px] italic leading-[15px] text-accent transition-transform duration-300 group-hover:translate-y-0">
        {label}
      </span>
    </span>
  );
}

/** Capsule label — hidden until hover, when it unfurls beside its numeral. */
function UnfurlLabel({ label }: { label: string }) {
  return (
    <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground opacity-0 transition-all duration-300 group-hover:ml-2 group-hover:max-w-28 group-hover:opacity-100">
      {label}
    </span>
  );
}

/** The signed-in avatar dropdown, shared by masthead, capsule, and mobile. */
function AccountMenu({
  user,
  onLogout,
}: {
  user: { fullName: string; email: string };
  onLogout: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full pl-1 pr-1 outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
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
          <p className="text-sm font-medium text-foreground">{user.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
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
          onClick={onLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileMenu({ pathname, isLoggedIn }: { pathname: string; isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const openConcierge = useConcierge((s) => s.setOpen);
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
            {mainNav.map((item, i) =>
              item.title === "Contact" ? (
                <SheetClose asChild key={item.href}>
                  <button
                    onClick={() => openConcierge(true)}
                    className="font-display flex items-center gap-4 border-b border-border py-5 text-left text-2xl font-medium transition-colors hover:text-accent"
                  >
                    <span className="eyebrow w-6">{String(i + 1).padStart(2, "0")}</span>
                    {item.title}
                  </button>
                </SheetClose>
              ) : (
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
              ),
            )}
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
