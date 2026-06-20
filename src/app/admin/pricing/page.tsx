"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  RotateCcw,
  Save,
  Tag,
  Package,
  Sparkles,
} from "lucide-react";
import { PageHeader, SectionCard } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";

interface PricingRow {
  key: string;
  kind: "SERVICE" | "BUNDLE";
  name: string;
  monthlyCents: number;
  monthlyPhp: number;
  isOverridden: boolean;
  updatedAt: string | null;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "Default";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminPricingPage() {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/pricing");
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = await res.json();
      const list: PricingRow[] = data.pricing ?? [];
      setRows(list);
      setDraft(
        Object.fromEntries(list.map((r) => [r.key, String(r.monthlyPhp)])),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg);
      console.error("[admin/pricing] failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(row: PricingRow) {
    const val = Number(draft[row.key]);
    if (!Number.isFinite(val) || val < 0) {
      toast.error("Invalid price");
      return;
    }
    setSavingKey(row.key);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: row.key, monthlyPhp: val }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success(`${row.name} price updated`, {
        description: `New monthly price: ${formatCurrency(val)}`,
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingKey(null);
    }
  }

  async function reset(row: PricingRow) {
    setSavingKey(row.key);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: row.key }),
      });
      if (!res.ok) throw new Error("Reset failed");
      toast.success(`${row.name} reset to default`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSavingKey(null);
    }
  }

  const services = rows.filter((r) => r.kind === "SERVICE");
  const bundles = rows.filter((r) => r.kind === "BUNDLE");
  const overriddenCount = rows.filter((r) => r.isOverridden).length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Pricing"
        description="Set the monthly price of every service and bundle. Quarterly and yearly intervals derive automatically."
      >
        <Badge variant={overriddenCount > 0 ? "accent" : "muted"}>
          <Sparkles className="size-3" />
          {overriddenCount} custom · {rows.length - overriddenCount} default
        </Badge>
      </PageHeader>

      {loadError && (
        <SectionCard
          className="mb-6 border-destructive/40 bg-destructive/5"
          title="Couldn't load pricing"
          description="The /api/admin/pricing endpoint returned an error."
        >
          <pre className="overflow-x-auto rounded-md bg-card p-3 text-xs text-destructive">
            {loadError}
          </pre>
          <p className="mt-3 text-xs text-muted-foreground">
            If you just added the <code>ServicePricing</code> model to Prisma,
            restart the dev server so the running Node process picks up the
            regenerated Prisma client.
          </p>
        </SectionCard>
      )}

      <SectionCard
        className="mb-6 border-dashed bg-secondary/20"
        title="How pricing works"
      >
        <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <li>
            • Prices are in <strong>Philippine pesos per month</strong>. Whole
            pesos only (no centavos).
          </li>
          <li>
            • <strong>Quarterly</strong> = monthly × 3 with 10% discount.{" "}
            <strong>Yearly</strong> = monthly × 12 with 20% discount.
          </li>
          <li>
            • Changes take effect <strong>immediately</strong> for new checkouts
            and renewals. Existing active subscriptions are NOT re-priced — they
            keep the price at activation.
          </li>
          <li>
            • &ldquo;Default&rdquo; means the price comes from the code file. Editing
            it creates a database override.
          </li>
        </ul>
      </SectionCard>

      <SectionCard
        title="Individual services"
        description="The 5 standalone services subscribers can purchase one at a time."
      >
        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <PricingTable
            rows={services}
            draft={draft}
            setDraft={setDraft}
            save={save}
            reset={reset}
            savingKey={savingKey}
            icon={Tag}
          />
        )}
      </SectionCard>

      <SectionCard
        className="mt-6"
        title="Bundles"
        description="Curated multi-service bundles with built-in savings versus buying individually."
      >
        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <PricingTable
            rows={bundles}
            draft={draft}
            setDraft={setDraft}
            save={save}
            reset={reset}
            savingKey={savingKey}
            icon={Package}
          />
        )}
      </SectionCard>
    </div>
  );
}

function PricingTable({
  rows,
  draft,
  setDraft,
  save,
  reset,
  savingKey,
  icon: Icon,
}: {
  rows: PricingRow[];
  draft: Record<string, string>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  save: (row: PricingRow) => void;
  reset: (row: PricingRow) => void;
  savingKey: string | null;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="overflow-x-auto">
    <table className="w-full min-w-[640px] text-sm">
      <thead>
        <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
          <th className="py-2.5 text-left font-medium">Plan</th>
          <th className="py-2.5 text-left font-medium">Status</th>
          <th className="py-2.5 text-right font-medium">Monthly (₱)</th>
          <th className="py-2.5 text-right font-medium">Last change</th>
          <th className="py-2.5 text-right font-medium"></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const dirty = draft[row.key] !== String(row.monthlyPhp);
          const saving = savingKey === row.key;
          return (
            <tr key={row.key} className="border-b border-border last:border-0">
              <td className="py-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-foreground/60">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {row.key}
                    </p>
                  </div>
                </div>
              </td>
              <td className="py-3">
                <Badge variant={row.isOverridden ? "accent" : "muted"}>
                  {row.isOverridden ? "Custom" : "Default"}
                </Badge>
              </td>
              <td className="py-3 text-right">
                <div className="inline-flex items-center gap-1.5">
                  <span className="text-sm text-muted-foreground">₱</span>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={draft[row.key] ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [row.key]: e.target.value }))
                    }
                    className={cn(
                      "w-28 text-right tabular-nums",
                      dirty && "border-accent ring-1 ring-accent/30",
                    )}
                  />
                </div>
              </td>
              <td className="py-3 text-right text-xs text-muted-foreground">
                {relativeTime(row.updatedAt)}
              </td>
              <td className="py-3 text-right">
                <div className="inline-flex items-center gap-1">
                  {row.isOverridden && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={saving}
                      onClick={() => reset(row)}
                    >
                      <RotateCcw className="size-3.5" />
                      Reset
                    </Button>
                  )}
                  <Button
                    variant={dirty ? "accent" : "outline"}
                    size="sm"
                    disabled={!dirty || saving}
                    onClick={() => save(row)}
                  >
                    {saving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    Save
                  </Button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
