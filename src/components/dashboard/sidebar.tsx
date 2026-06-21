"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { dashboardNav } from "@/lib/data/dashboard-nav";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/hooks";
import { cn } from "@/lib/utils";

const ROMAN = ["I", "II", "III", "IV", "V"];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { subscribedServices } = useSession();

  const serviceNavItems = dashboardNav.filter((n) => n.service);
  const unlocked = serviceNavItems.filter((n) =>
    subscribedServices.includes(n.service!),
  ).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-15 items-center px-6">
        <Logo />
      </div>

      {/* Editorial index — transparent, vertically centred, magnify on hover */}
      <nav className="flex flex-1 flex-col justify-center gap-1 px-6">
        <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground/70">
          The Index
        </p>
        {dashboardNav.map((item, i) => {
          const locked =
            item.service !== null && !subscribedServices.includes(item.service);
          const active = pathname === item.href;
          const label = i === 0 ? "Dashboard" : `Module ${ROMAN[i - 1]}`;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="group flex origin-left items-baseline gap-3 border-b border-foreground/10 py-3 transition-transform duration-300 ease-out hover:scale-[1.08]"
            >
              <span
                className={cn(
                  "font-mono text-[10px] tabular-nums transition-colors",
                  active ? "text-accent" : "text-muted-foreground/50",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "font-display block truncate text-lg font-normal italic leading-tight transition-colors",
                    active
                      ? "text-accent"
                      : "text-foreground/85 group-hover:text-accent",
                  )}
                >
                  {item.title}
                </span>
                <span className="mt-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground/55">
                  {label}
                  {locked && <Lock className="size-2.5" />}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      {unlocked < serviceNavItems.length && (
        <div className="m-4 rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-md">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {unlocked} of {serviceNavItems.length} unlocked
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Unlock every module with the Business Bundle.
          </p>
          <Button asChild size="sm" variant="accent" className="mt-3 w-full">
            <Link href="/pricing">Upgrade plan</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
