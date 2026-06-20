"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/admin/ui";
import { formatCurrency } from "@/lib/utils";
import { services } from "@/lib/data/services";
import { bundles } from "@/lib/data/bundles";

interface CustomerOption {
  tenantId: string;
  businessName: string | null;
  tenantName: string;
  ownerEmail: string | null;
}

const INTERVALS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly (−10%)" },
  { value: "YEARLY", label: "Yearly (−20%)" },
] as const;

interface AdminSubRow {
  id: string;
  service: string | null;
  bundle: string | null;
  planInterval: string;
  status: string;
  priceCents: number;
  startDate: string;
  endDate: string;
  tenant: { name: string; businessName: string | null };
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<AdminSubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/subscriptions");
    if (res.ok) {
      const data = await res.json();
      setSubs(data.subscriptions ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: "cancel" | "renew" | "extend", id: string, days?: number) {
    setActingId(id);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id, days }),
      });
      if (!res.ok) throw new Error("Action failed");
      toast.success(`Subscription ${action}ed`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActingId(null);
    }
  }

  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Subscriptions"
        description="Every subscription across the platform — grant, extend, cancel, renew."
      >
        <Button size="sm" variant="accent" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" /> Add subscription
        </Button>
      </PageHeader>

      <AddSubscriptionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={load}
      />

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : subs.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No subscriptions yet.</p>
        ) : (
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Tenant</th>
                <th className="px-4 py-3 text-left font-medium">Plan</th>
                <th className="px-4 py-3 text-left font-medium">Interval</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Ends</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">
                    {s.tenant.businessName ?? s.tenant.name}
                  </td>
                  <td className="px-4 py-3">{s.service ?? s.bundle ?? "—"}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {s.planInterval.toLowerCase()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        s.status === "ACTIVE"
                          ? "success"
                          : s.status === "CANCELED" || s.status === "EXPIRED"
                            ? "muted"
                            : "accent"
                      }
                    >
                      {s.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(s.endDate).toLocaleDateString("en-PH")}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(s.priceCents / 100)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status === "ACTIVE" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actingId === s.id}
                          onClick={() => act("extend", s.id, 30)}
                        >
                          +30d
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actingId === s.id}
                          onClick={() => act("cancel", s.id)}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {(s.status === "EXPIRED" || s.status === "CANCELED") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actingId === s.id}
                        onClick={() => act("renew", s.id)}
                      >
                        Renew
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AddSubscriptionDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void | Promise<void>;
}) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [kind, setKind] = useState<"service" | "bundle">("bundle");
  const [planKey, setPlanKey] = useState("");
  const [interval, setInterval] = useState("MONTHLY");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingCustomers(true);
    fetch("/api/admin/customers")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []))
      .catch(() => setCustomers([]))
      .finally(() => setLoadingCustomers(false));
  }, [open]);

  const planOptions: { id: string; name: string; price: number }[] =
    kind === "service" ? services : bundles;

  async function submit() {
    if (!tenantId || !planKey) {
      toast.error("Pick a customer and a plan");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          kind,
          key: planKey,
          planInterval: interval,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to add subscription");
      }
      toast.success("Subscription granted");
      onOpenChange(false);
      setTenantId("");
      setPlanKey("");
      await onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add subscription</DialogTitle>
          <DialogDescription>
            Grant a plan to a customer directly — useful for test or comped
            accounts, no checkout required.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Customer</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingCustomers ? "Loading…" : "Select a customer"}
                />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.tenantId} value={c.tenantId}>
                    {c.businessName ?? c.tenantName}
                    {c.ownerEmail ? ` · ${c.ownerEmail}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select
                value={kind}
                onValueChange={(v) => {
                  setKind(v as "service" | "bundle");
                  setPlanKey("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bundle">Bundle</SelectItem>
                  <SelectItem value="service">Single service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Plan</Label>
              <Select value={planKey} onValueChange={setPlanKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {planOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {formatCurrency(p.price)}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Billing interval</Label>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVALS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button variant="accent" onClick={submit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Granting…
              </>
            ) : (
              "Grant subscription"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
