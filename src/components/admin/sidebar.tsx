"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Wallet,
  Receipt,
  Boxes,
  ScrollText,
  LogOut,
  ShieldAlert,
  Bell,
  Building2,
  Activity,
  BarChart3,
  ShieldCheck,
  Settings,
  Tag,
} from "lucide-react";
import { DiamondMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/hooks";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAdminStore } from "@/lib/store/admin-store";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Commerce",
    items: [
      { title: "Subscribers", href: "/admin/users", icon: Users },
      { title: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
      { title: "Payments", href: "/admin/payments", icon: Receipt },
      { title: "Revenue", href: "/admin/revenue", icon: Wallet },
    ],
  },
  {
    label: "Catalog",
    items: [
      { title: "Services", href: "/admin/services", icon: Boxes },
      { title: "Pricing", href: "/admin/pricing", icon: Tag },
      { title: "Customers", href: "/admin/customers", icon: Building2 },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Platform Health", href: "/admin/health", icon: Activity },
      { title: "Audit Logs", href: "/admin/logs", icon: ScrollText },
      { title: "Notifications", href: "/admin/notifications", icon: Bell },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Admin Roles", href: "/admin/roles", icon: ShieldCheck },
      { title: "Settings", href: "/admin/settings", icon: Settings },
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
    <div className="flex h-full flex-col bg-neutral-950 text-neutral-300">
      <div className="flex h-15 items-center gap-2.5 px-5">
        <DiamondMark className="size-7" />
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight text-white">
            Solaris
          </span>
          <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-accent">
            <ShieldAlert className="size-2.5" /> Admin
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label} className="mb-2">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-600">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-white/10 text-white"
                      : "text-neutral-400 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      active ? "text-accent" : "text-neutral-500",
                    )}
                  />
                  {item.title}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="px-1 text-sm font-medium text-white">
          {user?.fullName ?? "Admin"}
        </p>
        <p className="px-1 text-xs text-neutral-500">Super administrator</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full justify-start text-neutral-400 hover:bg-white/5 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}
