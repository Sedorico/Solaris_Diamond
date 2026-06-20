"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Database, ShieldCheck, Mail, CreditCard, Cloud, Cpu } from "lucide-react";
import { PageHeader, SectionCard, StatusDot } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HealthCheck {
  service: string;
  status: "operational" | "warning" | "critical" | "unknown";
  latencyMs: number | null;
  message: string;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Database,
  Authentication: ShieldCheck,
  "Email Delivery": Mail,
  "Payment Gateway": CreditCard,
  Storage: Cloud,
  API: Cpu,
};

export default function PlatformHealthPage() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/health");
    if (res.ok) {
      const data = await res.json();
      setChecks(data.checks ?? []);
      setLastChecked(new Date());
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const operational = checks.filter((c) => c.status === "operational").length;
  const total = checks.length;
  const allGood = total > 0 && operational === total;
  const hasCritical = checks.some((c) => c.status === "critical");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Platform Health"
        description="Real-time status of every system powering Solaris Diamond."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
          Refresh
        </Button>
      </PageHeader>

      <SectionCard
        className="mb-6"
        title={
          loading
            ? "Checking…"
            : hasCritical
              ? "Critical issues detected"
              : allGood
                ? "All systems operational"
                : "Degraded performance"
        }
        description={
          lastChecked
            ? `Last checked ${lastChecked.toLocaleTimeString("en-PH")}`
            : "Initializing…"
        }
        action={
          <Badge
            variant={
              hasCritical
                ? "warning"
                : allGood
                  ? "success"
                  : "accent"
            }
          >
            {operational}/{total} operational
          </Badge>
        }
      >
        <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
          {checks.map((c) => (
            <span
              key={c.service}
              className={
                c.status === "operational"
                  ? "bg-success"
                  : c.status === "warning"
                    ? "bg-warning"
                    : c.status === "critical"
                      ? "bg-destructive"
                      : "bg-muted-foreground"
              }
              style={{ width: `${100 / Math.max(checks.length, 1)}%` }}
            />
          ))}
        </div>
      </SectionCard>

      {loading && checks.length === 0 ? (
        <div className="flex justify-center p-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {checks.map((c) => {
            const Icon = ICONS[c.service] ?? Cpu;
            return (
              <SectionCard key={c.service}>
                <div className="flex items-start gap-4">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-foreground/60">
                    <Icon className="size-5" />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold tracking-tight">
                        {c.service}
                      </h3>
                      <StatusDot status={c.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {c.message}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <Badge
                        variant={
                          c.status === "operational"
                            ? "success"
                            : c.status === "warning"
                              ? "accent"
                              : c.status === "critical"
                                ? "warning"
                                : "muted"
                        }
                      >
                        {c.status}
                      </Badge>
                      {c.latencyMs !== null && (
                        <span className="text-muted-foreground tabular-nums">
                          {c.latencyMs}ms
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
