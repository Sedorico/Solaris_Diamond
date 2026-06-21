"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ShieldAlert } from "lucide-react";
import { DiamondMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/hooks";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAdminStore } from "@/lib/store/admin-store";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/admin" },
      { title: "Analytics", href: "/admin/analytics" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { title: "Subscribers", href: "/admin/users" },
      { title: "Subscriptions", href: "/admin/subscriptions" },
      { title: "Payments", href: "/admin/payments" },
      { title: "Revenue", href: "/admin/revenue" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { title: "Services", href: "/admin/services" },
      { title: "Pricing", href: "/admin/pricing" },
      { title: "Customers", href: "/admin/customers" },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Platform Health", href: "/admin/health" },
      { title: "Audit Logs", href: "/admin/logs" },
      { title: "Notifications", href: "/admin/notifications" },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Admin Roles", href: "/admin/roles" },
      { title: "Settings", href: "/admin/settings" },
    ],
  },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSession();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    // Clear the mock admin session too (no-op in real mode).
    useAdminStore.getState().logout();
    router.push("/admin/login");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-15 items-center gap-2.5 px-6">
        <DiamondMark className="size-7 text-foreground" />
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight">
            Solaris
          </span>
          <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
            <ShieldAlert className="size-2.5" /> Admin
          </span>
        </div>
      </div>

      {/* Editorial index — transparent, serif, magnify on hover */}
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground/55">
              {group.label}
            </p>
            <div className="flex flex-col">
              {group.items.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className="group flex origin-left items-center border-b border-foreground/8 py-2 transition-transform duration-300 ease-out hover:scale-[1.06]"
                  >
                    <span
                      className={cn(
                        "font-display text-[15px] font-normal italic leading-tight transition-colors",
                        active
                          ? "text-accent"
                          : "text-foreground/80 group-hover:text-accent",
                      )}
                    >
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-foreground/10 p-5">
        <p className="text-sm font-medium">{user?.fullName ?? "Admin"}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Super administrator
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}
