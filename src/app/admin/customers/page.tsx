"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, Mail, Building2, CircleDollarSign, Layers } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface Customer {
  tenantId: string;
  businessName: string | null;
  tenantName: string;
  ownerName: string | null;
  ownerEmail: string | null;
  activeServices: number;
  hasActiveSubscription: boolean;
  lifetimeRevenueCents: number;
  lastActivityAt: string | null;
  createdAt: string;
}

function relativeDate(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const url = search
      ? `/api/admin/customers?search=${encodeURIComponent(search)}`
      : "/api/admin/customers";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers ?? []);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  const stats = {
    total: customers.length,
    active: customers.filter((c) => c.hasActiveSubscription).length,
    ltv: customers.reduce((sum, c) => sum + c.lifetimeRevenueCents, 0),
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Customers"
        description="Every tenant business that has registered on the platform."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SectionCard className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total customers
          </span>
          <span className="text-2xl font-semibold tracking-tight">
            {stats.total.toLocaleString()}
          </span>
        </SectionCard>
        <SectionCard className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Paying customers
          </span>
          <span className="text-2xl font-semibold tracking-tight">
            {stats.active.toLocaleString()}
          </span>
        </SectionCard>
        <SectionCard className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Lifetime revenue
          </span>
          <span className="text-2xl font-semibold tracking-tight">
            {formatCurrency(stats.ltv / 100)}
          </span>
        </SectionCard>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search business, owner, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : customers.length === 0 ? (
          <p className="p-12 text-center text-sm text-muted-foreground">
            No customers found.
          </p>
        ) : (
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Business</th>
                <th className="px-4 py-3 text-left font-medium">Owner</th>
                <th className="px-4 py-3 text-left font-medium">Services</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Lifetime</th>
                <th className="px-4 py-3 text-right font-medium">
                  Last activity
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.tenantId}
                  className="border-t border-border hover:bg-secondary/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-foreground/60">
                        <Building2 className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {c.businessName ?? c.tenantName}
                        </p>
                        {c.businessName && (
                          <p className="truncate text-xs text-muted-foreground">
                            {c.tenantName}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.ownerName ?? "—"}</p>
                    {c.ownerEmail && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="size-3" /> {c.ownerEmail}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                      <Layers className="size-3" />
                      {c.activeServices}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={c.hasActiveSubscription ? "success" : "muted"}
                    >
                      {c.hasActiveSubscription ? "Active" : "No subscription"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 font-medium tabular-nums">
                      <CircleDollarSign className="size-3 text-muted-foreground" />
                      {formatCurrency(c.lifetimeRevenueCents / 100)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {relativeDate(c.lastActivityAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
