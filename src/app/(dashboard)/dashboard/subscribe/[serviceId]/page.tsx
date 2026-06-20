"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { serviceMap, type ServiceId } from "@/lib/data/services";
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

export default function SubscribeServicePage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = use(params);
  const service = serviceMap[serviceId as ServiceId];
  if (!service) notFound();

  const router = useRouter();
  const [interval, setInterval] = useState<Interval>("MONTHLY");
  const [submitting, setSubmitting] = useState(false);

  const opt = INTERVALS.find((i) => i.id === interval)!;
  const total = Math.round(service.price * opt.months * (1 - opt.discount));
  const Icon = getIcon(service.icon);

  function subscribe() {
    setSubmitting(true);
    // Hand off to the checkout page — that's where the payment method is chosen
    // and the actual payment is completed. Carry the selected interval along.
    router.push(`/checkout?service=${serviceId}&interval=${interval}`);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <ModuleHeader
        title={`Subscribe to ${service.name}`}
        description="Choose a billing interval. Cancel anytime — access continues until period end."
      />

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-premium">
        <div className="grid lg:grid-cols-2">
          {/* Left — service info + what's included */}
          <div className="p-8 sm:p-12">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Icon className="size-6" />
            </span>
            <h2 className="font-display mt-6 text-2xl font-medium tracking-tight sm:text-3xl">
              {service.name}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {service.tagline}
            </p>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-foreground/80">
              {service.description}
            </p>

            <span className="eyebrow mt-9 block">What&apos;s included</span>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {service.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm">
                  <Check
                    className="size-4 shrink-0 text-accent"
                    strokeWidth={2.5}
                  />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — interval picker */}
          <div className="flex flex-col border-t border-border bg-secondary/30 p-8 sm:p-12 lg:border-l lg:border-t-0">
            <span className="eyebrow">Choose interval</span>
            <div className="mt-5 flex flex-col gap-2.5">
              {INTERVALS.map((opt) => {
                const optTotal = Math.round(
                  service.price * opt.months * (1 - opt.discount),
                );
                const perMonth = Math.round(optTotal / opt.months);
                const active = interval === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setInterval(opt.id)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border bg-card p-3.5 text-left transition-all",
                      active
                        ? "border-accent ring-1 ring-accent/30"
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

            <div className="my-6 h-px bg-border" />
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Total today
              </span>
              <span className="font-display text-2xl font-medium text-gradient-accent">
                {formatCurrency(total)}
              </span>
            </div>

            <Button
              variant="accent"
              size="lg"
              className="mt-6 w-full"
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

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Choose your payment method on the next step — pay securely, then
              you&apos;re in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
