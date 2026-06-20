"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Lock,
  ShieldCheck,
  Loader2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { serviceMap, type ServiceId } from "@/lib/data/services";
import { bundleMap, bundleListPrice, type BundleId } from "@/lib/data/bundles";
import { paymentMethods } from "@/lib/payments/methods";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getIcon } from "@/components/icon-map";
import { useSession } from "@/lib/auth/hooks";
import { PremiumBackdrop } from "@/components/checkout/premium-backdrop";
import { PaymentBrandIcon } from "@/components/checkout/payment-brand-icon";
import { formatCurrency, cn } from "@/lib/utils";

type Interval = "MONTHLY" | "QUARTERLY" | "YEARLY";

const INTERVAL_META: Record<
  Interval,
  { months: number; discount: number; label: string; suffix: string }
> = {
  MONTHLY: { months: 1, discount: 0, label: "monthly", suffix: "/mo" },
  QUARTERLY: { months: 3, discount: 0.1, label: "quarterly", suffix: "/quarter" },
  YEARLY: { months: 12, discount: 0.2, label: "yearly", suffix: "/yr" },
};

function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useSession();

  const ref = params.get("ref");
  const serviceId = params.get("service") as ServiceId | null;
  const bundleId = params.get("bundle") as BundleId | null;
  const interval = (params.get("interval") as Interval | null) ?? "MONTHLY";
  const meta = INTERVAL_META[interval] ?? INTERVAL_META.MONTHLY;

  const [method, setMethod] = useState(paymentMethods[0].id);
  const [stage, setStage] = useState<"idle" | "processing" | "done">(
    ref ? "done" : "idle",
  );

  useEffect(() => {
    if (!loading && !user) {
      const here = `/checkout?${params.toString()}`;
      router.replace(`/login?redirect=${encodeURIComponent(here)}`);
    }
  }, [loading, user, router, params]);

  useEffect(() => {
    if (ref && stage === "done") {
      toast.success("Payment successful", {
        description: "Your subscription is now active.",
      });
    }
  }, [ref, stage]);

  const order = useMemo(() => {
    if (bundleId && bundleMap[bundleId]) {
      const b = bundleMap[bundleId];
      return {
        kind: "bundle" as const,
        name: b.name,
        price: b.price,
        list: bundleListPrice(b),
        items: b.services.map((id) => serviceMap[id].name),
        icon: b.icon,
        gradient: b.gradient,
      };
    }
    const id = (serviceId && serviceMap[serviceId]
      ? serviceId
      : "inventory") as ServiceId;
    const s = serviceMap[id];
    return {
      kind: "service" as const,
      name: s.name,
      price: s.price,
      list: s.price,
      items: s.features.slice(0, 4),
      icon: s.icon,
      gradient: s.gradient,
    };
  }, [serviceId, bundleId]);

  const total = Math.round(order.price * meta.months * (1 - meta.discount));
  const vat = Math.round(total * 0.12);
  const OrderIcon = getIcon(order.icon);

  async function pay() {
    setStage("processing");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: serviceId,
          bundle: bundleId,
          planInterval: interval,
          methods: [method],
        }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.mock) {
        setStage("done");
        toast.success("Payment successful", {
          description: "Your subscription is now active.",
        });
        setTimeout(() => router.push("/dashboard"), 2000);
      } else {
        throw new Error(data.error ?? "Checkout failed");
      }
    } catch (err) {
      setStage("idle");
      toast.error("Payment failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        <PremiumBackdrop />
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center text-center"
        >
          <span className="relative flex size-20 items-center justify-center rounded-full bg-success/15 text-success">
            <span className="absolute inset-0 animate-ping rounded-full bg-success/30" />
            <Check className="size-10" strokeWidth={2.5} />
          </span>
          <h1 className="mt-8 font-display text-4xl font-medium tracking-tight">
            You&apos;re all set
          </h1>
          <p className="mt-3 max-w-sm text-muted-foreground">
            {order.name} is now active and ready to use.
          </p>
          <Button asChild variant="accent" size="lg" className="mt-8">
            <Link href="/dashboard">
              Go to dashboard <ChevronRight className="size-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <PremiumBackdrop />

      <header className="relative z-10 flex items-center justify-between px-8 py-7 sm:px-14">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm text-muted-foreground backdrop-blur-md transition-all hover:border-foreground/20 hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to plans
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-8 py-12 sm:px-14 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        {/* LEFT — payment selection */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
            Checkout
          </p>
          <h1 className="font-display mt-3 text-5xl font-medium tracking-tight sm:text-6xl lg:text-7xl">
            Almost there.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            Choose how you&apos;d like to pay. Your plan activates the moment
            payment succeeds.
          </p>

          <div className="mt-14">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Step 01
                </p>
                <h2 className="mt-1 text-lg font-medium tracking-tight">
                  Payment method
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" /> Secured by PayMongo
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {paymentMethods.map((pm) => {
                const active = method === pm.id;
                return (
                  <button
                    key={pm.id}
                    onClick={() => setMethod(pm.id)}
                    className={cn(
                      "group relative flex items-center gap-4 rounded-2xl border bg-transparent p-4 text-left transition-all duration-300",
                      active
                        ? "border-foreground/80 bg-card/40"
                        : "border-border/40 hover:border-foreground/30 hover:bg-card/20",
                    )}
                  >
                    <PaymentBrandIcon
                      id={pm.id}
                      className="size-10 shrink-0 rounded-[10px] shadow-sm transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium tracking-tight">
                        {pm.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {pm.tagline}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border",
                      )}
                    >
                      {active && <Check className="size-3" strokeWidth={3.5} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-12">
            <div className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Step 02
              </p>
              <h2 className="mt-1 text-lg font-medium tracking-tight">
                Complete payment
              </h2>
            </div>

            <Button
              variant="accent"
              size="xl"
              className="group relative h-14 w-full overflow-hidden rounded-2xl text-base"
              onClick={pay}
              disabled={stage === "processing"}
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
              {stage === "processing" ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Processing payment…
                </>
              ) : (
                <>
                  <Lock className="size-4" /> Pay {formatCurrency(total)}
                  <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" /> PCI-DSS compliant
              </span>
              <span className="size-1 rounded-full bg-muted-foreground/40" />
              <span className="inline-flex items-center gap-1.5">
                <Lock className="size-3.5" /> 256-bit TLS
              </span>
              <span className="size-1 rounded-full bg-muted-foreground/40" />
              <span>No card storage</span>
            </div>
          </div>
        </motion.div>

        {/* RIGHT — order summary glass card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-fit lg:sticky lg:top-8"
        >
          <div className="relative overflow-hidden rounded-[28px] border border-border/40 bg-card/40 p-9 backdrop-blur-2xl sm:p-10">
            {/* Inner highlight ring */}
            <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/20 dark:ring-white/5" />

            <div className="relative flex items-start justify-between">
              <span
                className="flex size-12 items-center justify-center rounded-2xl text-white"
                style={{
                  background: `linear-gradient(135deg, ${order.gradient[0]}, ${order.gradient[1]})`,
                }}
              >
                <OrderIcon className="size-5" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Order summary
              </span>
            </div>

            <h3 className="font-display relative mt-7 text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
              {order.name}
            </h3>
            <p className="relative mt-2 text-sm text-muted-foreground">
              {order.kind === "bundle"
                ? "Bundle subscription"
                : "Service subscription"}{" "}
              · billed {meta.label}
            </p>

            <ul className="relative mt-7 flex flex-col gap-2.5">
              {order.items.map((it) => (
                <li
                  key={it}
                  className="flex items-center gap-2.5 text-[15px] text-foreground/85"
                >
                  <Check className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2.5} />
                  {it}
                </li>
              ))}
            </ul>

            <div className="relative my-8 h-px bg-border/40" />

            <div className="relative flex flex-col gap-2.5 text-[15px]">
              <Row label="Subtotal" value={formatCurrency(total)} />
              {order.kind === "bundle" && order.list > order.price && (
                <Row
                  label="Bundle discount"
                  value={`− ${formatCurrency(
                    Math.round(
                      (order.list - order.price) *
                        meta.months *
                        (1 - meta.discount),
                    ),
                  )}`}
                  accent
                />
              )}
              <Row label="VAT (incl.)" value={formatCurrency(vat)} muted />

              <div className="mt-5 flex items-end justify-between border-t border-border/40 pt-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Due today
                  </p>
                  <p className="font-display mt-1 flex items-baseline gap-1 text-5xl font-medium tracking-tight">
                    {formatCurrency(total)}
                    <span className="text-base font-normal text-muted-foreground">
                      {meta.suffix}
                    </span>
                  </p>
                </div>
                <Sparkles className="size-4 text-muted-foreground" />
              </div>
            </div>

            <div className="relative mt-7 rounded-2xl border border-border/30 p-4 text-xs leading-relaxed text-muted-foreground">
              Billed monthly · No contracts · Cancel anytime — you keep full
              access until the period ends.
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          accent && "text-success",
          muted && "text-muted-foreground",
          "font-medium tabular-nums",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CheckoutInner />
    </Suspense>
  );
}