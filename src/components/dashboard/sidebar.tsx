"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";
import { dashboardNav } from "@/lib/data/dashboard-nav";
import { getIcon } from "@/components/icon-map";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/hooks";
import { cn } from "@/lib/utils";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { subscribedServices } = useSession();

  const serviceNavItems = dashboardNav.filter((n) => n.service);
  const unlocked = serviceNavItems.filter((n) =>
    subscribedServices.includes(n.service!),
  ).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-15 items-center px-5">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        <p className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Modules
        </p>
        {dashboardNav.map((item) => {
          const Icon = getIcon(item.icon);
          const locked =
            item.service !== null &&
            !subscribedServices.includes(item.service);
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-secondary text-foreground"
                  : "text-foreground/70 hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4.5 shrink-0",
                  active
                    ? "text-accent"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span className="flex-1">{item.title}</span>
              {locked && <Lock className="size-3.5 text-muted-foreground" />}
              {active && (
                <span className="size-1.5 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      {unlocked < serviceNavItems.length && (
        <div className="m-3 rounded-2xl border border-border bg-secondary/40 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" />
            <p className="text-sm font-medium">
              {unlocked} of {serviceNavItems.length} unlocked
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
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
