import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import { services, type ServiceId } from "@/lib/data/services";
import { bundles, type BundleId } from "@/lib/data/bundles";

const prisma = () => getPrisma();

export interface EffectivePrice {
  key: string;
  kind: "SERVICE" | "BUNDLE";
  name: string;
  monthlyCents: number;
  monthlyPhp: number;
  isOverridden: boolean;
  updatedAt: Date | null;
  updatedByUserId: string | null;
}

function staticDefault(key: string): {
  kind: "SERVICE" | "BUNDLE";
  name: string;
  monthlyCents: number;
} | null {
  const svc = services.find((s) => s.id === key);
  if (svc) {
    return { kind: "SERVICE", name: svc.name, monthlyCents: svc.price * 100 };
  }
  const bundle = bundles.find((b) => b.id === key);
  if (bundle) {
    return { kind: "BUNDLE", name: bundle.name, monthlyCents: bundle.price * 100 };
  }
  return null;
}

/** Reads all pricing rows from DB + overlays static defaults. */
export async function listEffectivePricing(): Promise<EffectivePrice[]> {
  const rows = await prisma().servicePricing.findMany();
  const overrideMap = new Map(rows.map((r) => [r.key, r]));

  const out: EffectivePrice[] = [];

  for (const svc of services) {
    const o = overrideMap.get(svc.id);
    out.push({
      key: svc.id,
      kind: "SERVICE",
      name: o?.displayName ?? svc.name,
      monthlyCents: o?.monthlyCents ?? svc.price * 100,
      monthlyPhp: Math.round((o?.monthlyCents ?? svc.price * 100) / 100),
      isOverridden: Boolean(o),
      updatedAt: o?.updatedAt ?? null,
      updatedByUserId: o?.updatedByUserId ?? null,
    });
  }
  for (const bundle of bundles) {
    const o = overrideMap.get(bundle.id);
    out.push({
      key: bundle.id,
      kind: "BUNDLE",
      name: o?.displayName ?? bundle.name,
      monthlyCents: o?.monthlyCents ?? bundle.price * 100,
      monthlyPhp: Math.round((o?.monthlyCents ?? bundle.price * 100) / 100),
      isOverridden: Boolean(o),
      updatedAt: o?.updatedAt ?? null,
      updatedByUserId: o?.updatedByUserId ?? null,
    });
  }

  return out;
}

/** Returns the effective monthly cents for a single service or bundle key. */
export async function getEffectiveMonthlyCents(
  key: ServiceId | BundleId | string,
): Promise<number> {
  const row = await prisma().servicePricing.findUnique({ where: { key } });
  if (row) return row.monthlyCents;
  const fallback = staticDefault(key);
  return fallback?.monthlyCents ?? 0;
}

export async function upsertPricing(opts: {
  key: string;
  monthlyCents: number;
  updatedByUserId?: string;
}) {
  const fallback = staticDefault(opts.key);
  if (!fallback) {
    throw new Error(`Unknown pricing key: ${opts.key}`);
  }
  if (opts.monthlyCents < 0) {
    throw new Error("Price must be non-negative");
  }

  return prisma().servicePricing.upsert({
    where: { key: opts.key },
    update: {
      monthlyCents: opts.monthlyCents,
      updatedByUserId: opts.updatedByUserId ?? null,
    },
    create: {
      key: opts.key,
      kind: fallback.kind,
      monthlyCents: opts.monthlyCents,
      updatedByUserId: opts.updatedByUserId ?? null,
    },
  });
}

/** Reverts a single key back to its static default by deleting the override. */
export async function resetPricing(key: string) {
  await prisma()
    .servicePricing.delete({ where: { key } })
    .catch(() => {
      // Ignore — no override existed.
    });
}
