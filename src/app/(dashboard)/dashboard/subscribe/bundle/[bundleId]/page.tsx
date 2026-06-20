"use client";

import { use, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import {
  bundleMap,
  bundleListPrice,
  bundleSavings,
  type BundleId,
} from "@/lib/data/bundles";
import { serviceMap } from "@/lib/data/services";
import { getIcon } from "@/components/icon-map";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModuleHeader } from "@/components/dashboard/ui";
import { formatCurrency, cn } from "@/lib/utils";

type Interval = "MONTHLY" | "QUARTERLY" | "YEARLY";

const INTERVALS: {
  id: Interval;
  label: string;
  months: number;
  discount: number;
  badge?: string;
}[] = [
  { id: "MONTHLY", label: "Monthly", months: 1, discount: 0 },
  { id: "QUARTERLY", label: "Quarterly", months: 3, discount: 0.1, badge: "Save 10%" },
  { id: "YEARLY", label: "Yearly", months: 12, discount: 0.2, badge: "Save 20%" },
];

export default function SubscribeBundlePage({
  params,
}: {
  params: Promise<{ bundleId: string }>;
}) {
  const { bundleId } = use(params);
  const bundle = bundleMap[bundleId as BundleId];
  if (!bundle) notFound();

  const router = useRouter();
  const [interval, setInterval] = useState<Interval>("MONTHLY");
  const [submitting, setSubmitting] = useState(false);

  const opt = INTERVALS.find((i) => i.id === interval)!;
  const total = Math.round(bundle.price * opt.months * (1 - opt.discount));
  const Icon = getIcon(bundle.icon);

  function subscribe() {
    setSubmitting(true);
    // Hand off to the checkout page to choose a payment method and pay.
    router.push(`/checkout?bundle=${bundleId}&interval=${interval}`);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <ModuleHeader
        title={`Subscribe to ${bundle.name}`}
        description="Bundle subscriptions unlock all included services at once."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <span
              className="flex size-12 items-center justify-center rounded-xl text-white"
              style={{
                background: `linear-gradient(135deg, ${bundle.gradient[0]}, ${bundle.gradient[1]})`,
              }}
            >
              <Icon className="size-6" />
            </span>
            <div>
              <h3 className="font-semibold tracking-tight">{bundle.name}</h3>
              <p className="text-sm text-muted-foreground">{bundle.tagline}</p>
            </div>
            {bundle.featured && (
              <Badge variant="accent" className="ml-auto">
                <Sparkles className="size-3" /> Popular
              </Badge>
            )}
          </div>

          <p className="mt-5 text-sm text-foreground/80">{bundle.description}</p>

          <p className="mt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Includes
          </p>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {bundle.services.map((id) => {
              const svc = serviceMap[id];
              const SvcIcon = getIcon(svc.icon);
              return (
                <li
                  key={id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3"
                >
                  <SvcIcon className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{svc.name}</span>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">
            List price{" "}
            <span className="line-through">
              {formatCurrency(bundleListPrice(bundle))}/mo
            </span>{" "}
            — you save{" "}
            <span className="font-medium text-success">
              {formatCurrency(bundleSavings(bundle))}/mo
            </span>
          </div>
        </section>

        <section className="flex h-fit flex-col rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Choose interval
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {INTERVALS.map((opt) => {
              const optTotal = Math.round(
                bundle.price * opt.months * (1 - opt.discount),
              );
              const perMonth = Math.round(optTotal / opt.months);
              const active = interval === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setInterval(opt.id)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-3 text-left transition-all",
                    active
                      ? "border-accent bg-accent-soft/30 ring-1 ring-accent/30"
                      : "border-border hover:border-foreground/20",
                  )}
                >
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {opt.label}
                      {opt.badge && (
                        <Badge variant="success" className="text-[10px]">
                          <Sparkles className="size-2.5" /> {opt.badge}
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(perMonth)}/mo
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatCurrency(optTotal)}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="my-5 h-px bg-border" />
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total today</span>
            <span>{formatCurrency(total)}</span>
          </div>

          <Button
            variant="accent"
            size="lg"
            className="mt-5 w-full"
            onClick={subscribe}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Continuing…
              </>
            ) : (
              <>
                Continue to checkout <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </section>
      </div>
    </div>
  );
}
