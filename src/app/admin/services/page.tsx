"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { serviceMap, type ServiceId } from "@/lib/data/services";
import { PageHeader } from "@/components/admin/ui";
import { formatCurrency } from "@/lib/utils";

interface ServiceStat {
  service: string;
  subscribers: number;
  revenueCents: number;
}

export default function AdminServicesPage() {
  const [stats, setStats] = useState<ServiceStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => setStats(d.services ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Services"
        description="Per-service subscriber counts and revenue contribution."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => {
          const meta = serviceMap[s.service as ServiceId];
          return (
            <div
              key={s.service}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {meta?.name ?? s.service}
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                {s.subscribers}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(s.revenueCents / 100)} attributed revenue
              </p>
            </div>
          );
        })}
        {stats.length === 0 && (
          <p className="text-sm text-muted-foreground">No active service subscriptions yet.</p>
        )}
      </div>
    </div>
  );
}
