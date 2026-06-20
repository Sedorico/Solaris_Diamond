"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { BarChart } from "@/components/dashboard/charts";
import { PageHeader } from "@/components/admin/ui";
import { formatCurrency } from "@/lib/utils";

interface Analytics {
  revenue: { month: string; revenueCents: number }[];
  subscribers: { month: string; count: number }[];
}

export default function AdminRevenuePage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalCents = data.revenue.reduce((sum, r) => sum + r.revenueCents, 0);
  const totalSubs = data.subscribers.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Revenue"
        description="Trailing 12-month revenue and subscriber growth."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">12-month revenue</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {formatCurrency(totalCents / 100)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">12-month new subscriptions</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{totalSubs}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h3 className="font-semibold tracking-tight">Revenue trend</h3>
        <div className="mt-6">
          <BarChart
            data={data.revenue.map((r) => ({
              label: r.month.slice(5),
              value: r.revenueCents / 100,
            }))}
            format={(v) => formatCurrency(v)}
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h3 className="font-semibold tracking-tight">Subscriber growth</h3>
        <div className="mt-6">
          <BarChart
            data={data.subscribers.map((s) => ({
              label: s.month.slice(5),
              value: s.count,
            }))}
            format={(v) => String(Math.round(v))}
          />
        </div>
      </div>
    </div>
  );
}
