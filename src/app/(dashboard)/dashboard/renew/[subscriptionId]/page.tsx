"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, RefreshCw, Loader2 } from "lucide-react";
import { serviceMap, type ServiceId } from "@/lib/data/services";
import { bundleMap, type BundleId } from "@/lib/data/bundles";
import { Button } from "@/components/ui/button";
import { ModuleHeader } from "@/components/dashboard/ui";
import { formatCurrency } from "@/lib/utils";

interface Subscription {
  id: string;
  service: string | null;
  bundle: string | null;
  planInterval: "MONTHLY" | "QUARTERLY" | "YEARLY";
  status: string;
  priceCents: number;
  endDate: string;
}

function label(sub: Subscription): string {
  if (sub.bundle && bundleMap[sub.bundle as BundleId]) {
    return bundleMap[sub.bundle as BundleId].name;
  }
  if (sub.service && serviceMap[sub.service as ServiceId]) {
    return serviceMap[sub.service as ServiceId].name;
  }
  return "Subscription";
}

export default function RenewPage({
  params,
}: {
  params: Promise<{ subscriptionId: string }>;
}) {
  const { subscriptionId } = use(params);
  const router = useRouter();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    fetch("/api/subscriptions")
      .then((r) => r.json())
      .then((data) => {
        const all: Subscription[] = data.all ?? [];
        setSub(all.find((s) => s.id === subscriptionId) ?? null);
      })
      .finally(() => setLoading(false));
  }, [subscriptionId]);

  async function renew() {
    setRenewing(true);
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/renew`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Renewal failed");
      toast.success("Subscription renewed");
      router.push("/dashboard/billing");
    } catch (err) {
      setRenewing(false);
      toast.error(err instanceof Error ? err.message : "Renewal failed");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="mx-auto max-w-2xl">
        <ModuleHeader
          title="Subscription not found"
          description="We couldn't find that subscription."
        />
        <Button asChild variant="outline" className="mt-6">
          <Link href="/dashboard/billing">Back to billing</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ModuleHeader
        title={`Renew ${label(sub)}`}
        description="Your subscription has expired or is about to. Renew to continue uninterrupted access."
      />

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <dl className="grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="font-medium">{label(sub)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Interval</dt>
            <dd className="font-medium capitalize">
              {sub.planInterval.toLowerCase()}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{sub.status}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Period ended</dt>
            <dd className="font-medium">
              {new Date(sub.endDate).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-3 text-base font-semibold">
            <dt>Renewal price</dt>
            <dd>{formatCurrency(sub.priceCents / 100)}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="accent"
            size="lg"
            className="flex-1"
            onClick={renew}
            disabled={renewing}
          >
            {renewing ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Renewing…
              </>
            ) : (
              <>
                <RefreshCw className="size-4" /> Renew Now
              </>
            )}
          </Button>
          <Button asChild variant="outline" size="lg" className="flex-1">
            <Link href="/pricing">
              View Plans <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
