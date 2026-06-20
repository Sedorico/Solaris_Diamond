"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  UserX,
  Sparkles,
  Wallet,
  TrendingUp,
  AlertCircle,
  Building2,
  ArrowRight,
  Loader2,
  Activity,
  CircleDollarSign,
} from "lucide-react";
import { PageHeader, KpiCard, SectionCard, AreaChart, Donut } from "@/components/admin/ui";
import { serviceMap, type ServiceId } from "@/lib/data/services";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface Analytics {
  kpis: {
    totalSubscribers: number;
    totalSubscribersDelta: number;
    activeSubscribers: number;
    activeSubscribersDelta: number;
    expiredSubscribers: number;
    trialUsers: number;
    monthlyRevenueCents: number;
    monthlyRevenueDelta: number;
    annualRevenueCents: number;
    pendingPayments: number;
    totalBusinesses: number;
    totalBusinessesDelta: number;
    mrrCents: number;
    arrCents: number;
    arpcCents: number;
    churnRate: number;
  };
  revenueMonthly: { month: string; revenueCents: number }[];
  revenueDaily: { day: string; revenueCents: number }[];
  subscribers: { month: string; count: number }[];
  services: {
    service: string;
    subscribers: number;
    revenueCents: number;
    growthRate: number;
    churnRate: number;
  }[];
  alerts: {
    id: string;
    type: string;
    title: string;
    message: string;
    createdAt: string;
    severity: "info" | "warning" | "critical";
  }[];
}

type Range = "daily" | "monthly";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(Math.abs(diff) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("monthly");

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { kpis, revenueMonthly, revenueDaily, services, alerts } = data;

  const revenueChartData =
    range === "monthly"
      ? revenueMonthly.map((r) => ({
          label: r.month.slice(5),
          value: r.revenueCents / 100,
        }))
      : revenueDaily.map((r) => ({
          label: r.day.slice(8),
          value: r.revenueCents / 100,
        }));

  const topService = [...services].sort(
    (a, b) => b.revenueCents - a.revenueCents,
  )[0];
  const fastestGrowing = [...services].sort(
    (a, b) => b.growthRate - a.growthRate,
  )[0];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Overview"
        description="Platform-wide performance across all tenants."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/analytics">
            Deep analytics <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </PageHeader>

      {/* Primary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total subscribers"
          value={kpis.totalSubscribers.toLocaleString()}
          delta={kpis.totalSubscribersDelta}
          hint="vs. start of month"
          icon={Users}
          index={0}
        />
        <KpiCard
          label="Active subscribers"
          value={kpis.activeSubscribers.toLocaleString()}
          delta={kpis.activeSubscribersDelta}
          hint="vs. last month"
          icon={UserCheck}
          index={1}
        />
        <KpiCard
          label="Expired"
          value={kpis.expiredSubscribers.toLocaleString()}
          hint="lifetime"
          icon={UserX}
          index={2}
        />
        <KpiCard
          label="Trial users"
          value={kpis.trialUsers.toLocaleString()}
          hint="currently in trial"
          icon={Sparkles}
          index={3}
        />
      </div>

      {/* Revenue KPIs */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Monthly revenue"
          value={kpis.monthlyRevenueCents}
          format={(v) => formatCurrency(v / 100)}
          delta={kpis.monthlyRevenueDelta}
          hint="vs. last month"
          icon={Wallet}
          index={0}
        />
        <KpiCard
          label="Annual revenue"
          value={kpis.annualRevenueCents}
          format={(v) => formatCurrency(v / 100)}
          hint="year to date"
          icon={TrendingUp}
          index={1}
        />
        <KpiCard
          label="Pending payments"
          value={kpis.pendingPayments.toLocaleString()}
          hint="awaiting capture"
          icon={AlertCircle}
          index={2}
        />
        <KpiCard
          label="Total businesses"
          value={kpis.totalBusinesses.toLocaleString()}
          delta={kpis.totalBusinessesDelta}
          hint="vs. start of month"
          icon={Building2}
          index={3}
        />
      </div>

      {/* Revenue chart */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <SectionCard
          title="Revenue"
          description="Trailing performance across all tenants"
          action={
            <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-0.5 text-xs">
              {(["daily", "monthly"] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-md px-2.5 py-1 font-medium capitalize transition-colors ${
                    range === r
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "daily" ? "30 days" : "12 months"}
                </button>
              ))}
            </div>
          }
        >
          <AreaChart data={revenueChartData} />
        </SectionCard>

        {/* Recurring revenue */}
        <SectionCard title="Recurring revenue" description="Normalized to monthly basis">
          <div className="flex items-center gap-6">
            <Donut
              value={kpis.mrrCents}
              max={Math.max(kpis.mrrCents, kpis.arrCents / 12)}
              label={formatCurrency(kpis.mrrCents / 100)}
              sublabel="MRR"
            />
            <div className="flex flex-1 flex-col gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">ARR</p>
                <p className="text-lg font-semibold tracking-tight">
                  {formatCurrency(kpis.arrCents / 100)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ARPC</p>
                <p className="text-lg font-semibold tracking-tight">
                  {formatCurrency(kpis.arpcCents / 100)}
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}/ mo
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Churn rate</p>
                <p className="text-lg font-semibold tracking-tight">
                  {kpis.churnRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Services + Alerts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard
          title="Service performance"
          description="Active subscribers and attributed revenue"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/services">
                Details <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          {services.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No active subscriptions yet.
            </p>
          ) : (
            <ul className="flex flex-col">
              {services
                .sort((a, b) => b.subscribers - a.subscribers)
                .map((s, i) => {
                  const meta = serviceMap[s.service as ServiceId];
                  const max = Math.max(
                    ...services.map((x) => x.subscribers),
                    1,
                  );
                  return (
                    <li
                      key={s.service}
                      className="flex items-center gap-4 border-t border-border py-3 first:border-0"
                    >
                      <span className="w-5 text-xs font-medium tabular-nums text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="min-w-[120px] text-sm font-medium">
                        {meta?.name ?? s.service}
                      </span>
                      <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                        <span
                          className="absolute inset-y-0 left-0 rounded-full bg-accent transition-all"
                          style={{ width: `${(s.subscribers / max) * 100}%` }}
                        />
                      </span>
                      <span className="w-16 text-right text-sm font-medium tabular-nums">
                        {s.subscribers}
                      </span>
                      <span className="hidden w-24 text-right text-xs tabular-nums text-muted-foreground sm:inline">
                        {formatCurrency(s.revenueCents / 100)}
                      </span>
                      <span
                        className={`hidden w-12 text-right text-xs font-medium tabular-nums md:inline ${
                          s.growthRate > 0
                            ? "text-success"
                            : s.growthRate < 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }`}
                      >
                        {s.growthRate > 0 ? "+" : ""}
                        {s.growthRate.toFixed(1)}%
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Activity"
          description="Recent platform events"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/notifications">
                All <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          {alerts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nothing yet — quiet on the platform.
            </p>
          ) : (
            <ul className="flex flex-col">
              {alerts.slice(0, 8).map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 border-t border-border py-3 first:border-0"
                >
                  <span
                    className={`mt-1 size-2 shrink-0 rounded-full ${
                      a.severity === "critical"
                        ? "bg-destructive"
                        : a.severity === "warning"
                          ? "bg-warning"
                          : "bg-accent"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.message}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {relativeTime(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Insights */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SectionCard className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <CircleDollarSign className="size-3.5 text-accent" />
            Highest revenue
          </div>
          {topService ? (
            <>
              <p className="text-xl font-semibold tracking-tight">
                {serviceMap[topService.service as ServiceId]?.name ?? topService.service}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(topService.revenueCents / 100)} attributed
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          )}
        </SectionCard>

        <SectionCard className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="size-3.5 text-accent" />
            Fastest growing
          </div>
          {fastestGrowing ? (
            <>
              <p className="text-xl font-semibold tracking-tight">
                {serviceMap[fastestGrowing.service as ServiceId]?.name ?? fastestGrowing.service}
              </p>
              <Badge variant="success">
                +{fastestGrowing.growthRate.toFixed(1)}%
              </Badge>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          )}
        </SectionCard>

        <SectionCard className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Activity className="size-3.5 text-accent" />
            Platform status
          </div>
          <p className="text-xl font-semibold tracking-tight">All systems</p>
          <Badge variant="success">Operational</Badge>
        </SectionCard>
      </div>
    </div>
  );
}
