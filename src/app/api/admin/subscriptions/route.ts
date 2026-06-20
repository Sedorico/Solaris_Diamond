import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import {
  listSubscriptions,
  extendSubscription,
} from "@/lib/admin/service";
import {
  cancelSubscription,
  renewSubscription,
  activateSubscription,
} from "@/lib/subscriptions/service";
import { calculatePrice } from "@/lib/subscriptions/pricing";
import { services } from "@/lib/data/services";
import { bundles } from "@/lib/data/bundles";
import type { PlanInterval, ServiceKey, BundleKey } from "@prisma/client";

const INTERVALS: PlanInterval[] = ["MONTHLY", "QUARTERLY", "YEARLY"];

export async function GET(req: Request) {
  await requireRole("SUPERADMIN");
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const subscriptions = await listSubscriptions({ status });
  return NextResponse.json({ subscriptions });
}

/** Grant a subscription to a tenant — used by admins to provision test or
 *  comped accounts without going through checkout. */
export async function POST(req: Request) {
  await requireRole("SUPERADMIN");
  const body = await req.json().catch(() => ({}));
  const { tenantId, kind, key, planInterval } = body as {
    tenantId?: string;
    kind?: "service" | "bundle";
    key?: string;
    planInterval?: PlanInterval;
  };

  if (!tenantId || !kind || !key) {
    return NextResponse.json(
      { error: "tenantId, kind and key are required" },
      { status: 400 },
    );
  }

  const baseMonthly =
    kind === "service"
      ? services.find((s) => s.id === key)?.price
      : bundles.find((b) => b.id === key)?.price;

  if (baseMonthly == null) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const interval = INTERVALS.includes(planInterval as PlanInterval)
    ? (planInterval as PlanInterval)
    : "MONTHLY";
  const priceCents = calculatePrice(baseMonthly * 100, interval);

  const subscription = await activateSubscription(tenantId, {
    ...(kind === "service"
      ? { service: key as ServiceKey }
      : { bundle: key as BundleKey }),
    planInterval: interval,
    priceCents,
  });

  return NextResponse.json({ subscription });
}

export async function PATCH(req: Request) {
  await requireRole("SUPERADMIN");
  const body = await req.json().catch(() => ({}));
  const { action, id, days } = body as {
    action?: string;
    id?: string;
    days?: number;
  };
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  switch (action) {
    case "extend":
      return NextResponse.json({
        subscription: await extendSubscription(id, days ?? 30),
      });
    case "cancel":
      return NextResponse.json({ subscription: await cancelSubscription(id) });
    case "renew":
      return NextResponse.json({ subscription: await renewSubscription(id) });
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
