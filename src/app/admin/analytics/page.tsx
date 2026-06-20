"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, Activity } from "lucide-react";
import {
  PageHeader,
  SectionCard,
  AreaChart,
  KpiCard,
} from "@/components/admin/ui";
import { formatCurrency } from "@/lib/utils";
import { serviceMap, type ServiceId } from "@/lib/data/services";

interface AnalyticsData {
  kpis: {
    mrrCents: number;
    arrCents: number;
    arpcCents: number;
    churnRate: number;
    monthlyRevenueDelta: number;
    totalSubscribers: number;
  };
  revenueMonthly: { month: string; revenueCents: number }[];
  subscribers: { month: string; count: number }[];
  services: {
    service: string;
    subscribers: number;
    revenueCents: number;
    growthRate: number;
    churnRate: number;
  }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
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

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Analytics"
        description="Deep performance metrics across the platform."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="MRR"
          value={data.kpis.mrrCents}
          format={(v) => formatCurrency(v / 100)}
          delta={data.kpis.monthlyRevenueDelta}
          icon={TrendingUp}
          index={0}
        />
        <KpiCard
          label="ARR"
          value={data.kpis.arrCents}
          format={(v) => formatCurrency(v / 100)}
          icon={TrendingUp}
          index={1}
        />
        <KpiCard
          label="ARPC"
          value={data.kpis.arpcCents}
          format={(v) => formatCurrency(v / 100)}
          hint="per customer / month"
          icon={Activity}
          index={2}
        />
        <KpiCard
          label="Churn rate"
          value={`${data.kpis.churnRate.toFixed(1)}%`}
          hint="this month"
          icon={Activity}
          index={3}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Revenue trend"
          description="Last 12 months"
        >
          <AreaChart
            data={data.revenueMonthly.map((r) => ({
              label: r.month.slice(5),
              value: r.revenueCents / 100,
            }))}
            format={(v) => formatCurrency(v)}
          />
        </SectionCard>

        <SectionCard
          title="Subscriber growth"
          description="New subscriptions per month"
        >
          <AreaChart
            data={data.subscribers.map((s) => ({
              label: s.month.slice(5),
              value: s.count,
            }))}
            format={(v) => String(Math.round(v))}
          />
        </SectionCard>
      </div>

      <SectionCard
        className="mt-6"
        title="Service ranking"
        description="By subscriber count, with growth and churn"
      >
        <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-3 text-left font-medium">Service</th>
              <th className="py-3 text-right font-medium">Subscribers</th>
              <th className="py-3 text-right font-medium">Revenue</th>
              <th className="py-3 text-right font-medium">Growth</th>
              <th className="py-3 text-right font-medium">Churn</th>
            </tr>
          </thead>
          <tbody>
            {[...data.services]
              .sort((a, b) => b.subscribers - a.subscribers)
              .map((s) => (
                <tr key={s.service} className="border-b border-border last:border-0">
                  <td className="py-3 font-medium">
                    {serviceMap[s.service as ServiceId]?.name ?? s.service}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {s.subscribers}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {formatCurrency(s.revenueCents / 100)}
                  </td>
                  <td
                    className={`py-3 text-right tabular-nums ${
                      s.growthRate > 0
                        ? "text-success"
                        : s.growthRate < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }`}
                  >
                    {s.growthRate > 0 ? "+" : ""}
                    {s.growthRate.toFixed(1)}%
                  </td>
                  <td className="py-3 text-right tabular-nums text-muted-foreground">
                    {s.churnRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        </div>
      </SectionCard>
    </div>
  );
}
