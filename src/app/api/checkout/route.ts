import { NextResponse } from "next/server";
import { z } from "zod";
import { createCheckoutSession } from "@/lib/payments/paymongo";
import { serviceMap, type ServiceId } from "@/lib/data/services";
import { bundleMap, type BundleId } from "@/lib/data/bundles";
import { env } from "@/lib/env";
import { getSession } from "@/lib/auth/session";
import { calculatePrice } from "@/lib/subscriptions/pricing";
import { activateSubscription } from "@/lib/subscriptions/service";
import { getEffectiveMonthlyCents } from "@/lib/pricing/service";
import type { PlanInterval, ServiceKey, BundleKey } from "@prisma/client";

const schema = z.object({
  service: z.string().optional(),
  bundle: z.string().optional(),
  planInterval: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]).default("MONTHLY"),
  methods: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { service, bundle, planInterval, methods } = parsed.data;
  const interval = planInterval as PlanInterval;

  let name: string;
  let baseMonthlyCents: number;
  let reference: string;
  let serviceKey: ServiceKey | undefined;
  let bundleKey: BundleKey | undefined;

  if (bundle && bundleMap[bundle as BundleId]) {
    const b = bundleMap[bundle as BundleId];
    name = b.name;
    baseMonthlyCents = await getEffectiveMonthlyCents(b.id);
    bundleKey = b.id as BundleKey;
    reference = `BNDL-${b.id}-${session.tenantId}-${interval}-${Date.now()}`;
  } else if (service && serviceMap[service as ServiceId]) {
    const s = serviceMap[service as ServiceId];
    name = s.name;
    baseMonthlyCents = await getEffectiveMonthlyCents(s.id);
    serviceKey = s.id as ServiceKey;
    reference = `SVC-${s.id}-${session.tenantId}-${interval}-${Date.now()}`;
  } else {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const totalCents = calculatePrice(baseMonthlyCents, interval);
  const intervalLabel =
    interval === "MONTHLY"
      ? "monthly"
      : interval === "QUARTERLY"
        ? "quarterly"
        : "yearly";

  try {
    const checkoutResult = await createCheckoutSession({
      lineItems: [
        { name: `${name} — ${intervalLabel}`, amount: totalCents, quantity: 1 },
      ],
      methods,
      description: `Solaris Diamond — ${name} (${intervalLabel})`,
      referenceNumber: reference,
      successUrl: `${env.appUrl}/checkout?ref=${reference}&service=${serviceKey ?? ""}&bundle=${bundleKey ?? ""}`,
      cancelUrl: `${env.appUrl}/pricing`,
    });

    if (checkoutResult.mock) {
      await activateSubscription(session.tenantId, {
        service: serviceKey,
        bundle: bundleKey,
        planInterval: interval,
        priceCents: totalCents,
        paymentReference: reference,
      });
    }

    return NextResponse.json(checkoutResult);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 502 },
    );
  }
}
