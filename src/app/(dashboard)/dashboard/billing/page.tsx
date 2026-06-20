"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Sparkles, X, Loader2 } from "lucide-react";
import { services, serviceMap, type ServiceId } from "@/lib/data/services";
import { bundles, bundleMap, bundleSavings, type BundleId } from "@/lib/data/bundles";
import { getIcon } from "@/components/icon-map";
import { ModuleHeader } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface Subscription {
  id: string;
  service: string | null;
  bundle: string | null;
  planInterval: "MONTHLY" | "QUARTERLY" | "YEARLY";
  status: string;
  priceCents: number;
  startDate: string;
  endDate: string;
  canceledAt: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  issuedAt: string;
  totalCents: number;
  paidAt: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function subscriptionLabel(sub: Subscription): string {
  if (sub.bundle && bundleMap[sub.bundle as BundleId]) {
    return bundleMap[sub.bundle as BundleId].name;
  }
  if (sub.service && serviceMap[sub.service as ServiceId]) {
    return serviceMap[sub.service as ServiceId].name;
  }
  return "Subscription";
}

export default function BillingPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  async function load() {
    try {
      const [subsRes, billRes] = await Promise.all([
        fetch("/api/subscriptions"),
        fetch("/api/billing"),
      ]);
      if (subsRes.ok) {
        const data = await subsRes.json();
        setSubscriptions(data.active ?? []);
      }
      if (billRes.ok) {
        const data = await billRes.json();
        setInvoices(data.invoices ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function cancel(id: string) {
    setCancelingId(id);
    try {
      const res = await fetch(`/api/subscriptions/${id}/cancel`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Cancel failed");
      toast.success("Subscription canceled");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <ModuleHeader
        title="Billing & plans"
        description="Manage your subscriptions, upgrade and view invoices."
      />

      <h3 className="mt-6 text-lg font-semibold tracking-tight">
        Active subscriptions
      </h3>

      {loading ? (
        <div className="mt-3 flex items-center justify-center rounded-2xl border border-border bg-card p-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : subscriptions.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
          You have no active subscriptions yet. Subscribe to a service or bundle
          below to get started.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Plan</th>
                <th className="px-4 py-3 text-left font-medium">Interval</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Renews on</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">
                    {subscriptionLabel(sub)}
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {sub.planInterval.toLowerCase()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="success">{sub.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(sub.endDate)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(sub.priceCents / 100)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancel(sub.id)}
                      disabled={cancelingId === sub.id}
                    >
                      {cancelingId === sub.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <X className="size-3.5" />
                      )}
                      Cancel
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="mt-10 text-lg font-semibold tracking-tight">
        Save with a bundle
      </h3>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {bundles.map((b) => {
          const Icon = getIcon(b.icon);
          return (
            <div
              key={b.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex size-9 items-center justify-center rounded-lg text-white"
                  style={{
                    background: `linear-gradient(135deg, ${b.gradient[0]}, ${b.gradient[1]})`,
                  }}
                >
                  <Icon className="size-4.5" />
                </span>
                <p className="font-medium">{b.name}</p>
                {b.featured && (
                  <Badge variant="accent" className="ml-auto">
                    <Sparkles className="size-3" /> Popular
                  </Badge>
                )}
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                {formatCurrency(b.price)}
                <span className="text-sm font-normal text-muted-foreground">
                  /mo
                </span>
              </p>
              <p className="text-xs text-success">
                Save {formatCurrency(bundleSavings(b))}/mo
              </p>
              <Button asChild variant={b.featured ? "accent" : "outline"} className="mt-4">
                <Link href={`/dashboard/subscribe/bundle/${b.id}`}>
                  Subscribe
                </Link>
              </Button>
            </div>
          );
        })}
      </div>

      <h3 className="mt-10 text-lg font-semibold tracking-tight">
        Individual services
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => {
          const Icon = getIcon(s.icon);
          return (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <span className="flex size-10 items-center justify-center rounded-xl border border-border text-foreground/70">
                <Icon className="size-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(s.price)}/mo
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/subscribe/${s.id}`}>Subscribe</Link>
              </Button>
            </div>
          );
        })}
      </div>

      <h3 className="mt-10 text-lg font-semibold tracking-tight">Invoices</h3>
      {loading ? (
        <div className="mt-4 flex items-center justify-center rounded-2xl border border-border bg-card p-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-border bg-card">
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No invoices yet. Invoices will appear here after your first payment.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Invoice</th>
                <th className="px-4 py-3 text-left font-medium">Issued</th>
                <th className="px-4 py-3 text-left font-medium">Paid</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(inv.issuedAt)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(inv.paidAt)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(inv.totalCents / 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
