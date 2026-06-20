import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/paymongo";
import { getPrisma } from "@/lib/db/prisma";
import { activateSubscription } from "@/lib/subscriptions/service";
import type { PlanInterval, ServiceKey, BundleKey } from "@prisma/client";

interface PayMongoEvent {
  data?: {
    attributes?: {
      type?: string;
      data?: {
        attributes?: {
          reference_number?: string;
          amount?: number;
          payment_method_type?: string;
          payments?: Array<{ attributes?: { amount?: number } }>;
        };
      };
    };
  };
}

function parseReference(ref: string) {
  const parts = ref.split("-");
  const kind = parts[0];
  const id = parts[1];
  const tenantId = parts[2];
  const interval = parts[3] as PlanInterval | undefined;

  return {
    kind: kind as "SVC" | "BNDL",
    id,
    tenantId,
    interval: interval ?? ("MONTHLY" as PlanInterval),
    serviceKey: kind === "SVC" ? (id as ServiceKey) : undefined,
    bundleKey: kind === "BNDL" ? (id as BundleKey) : undefined,
  };
}

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("paymongo-signature");

  const valid = await verifyWebhookSignature(payload, signature);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: PayMongoEvent;
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const type = event.data?.attributes?.type;
  const eventData = event.data?.attributes?.data?.attributes;

  switch (type) {
    case "checkout_session.payment.paid":
    case "payment.paid": {
      const reference = eventData?.reference_number;
      if (!reference) break;

      const parsed = parseReference(reference);
      if (!parsed.tenantId) break;

      const amountCents =
        eventData?.amount ??
        eventData?.payments?.[0]?.attributes?.amount ??
        0;

      const prisma = getPrisma();

      const sub = await activateSubscription(parsed.tenantId, {
        service: parsed.serviceKey,
        bundle: parsed.bundleKey,
        planInterval: parsed.interval,
        priceCents: amountCents,
        paymentReference: reference,
      });

      const payment = await prisma.payment.create({
        data: {
          tenantId: parsed.tenantId,
          subscriptionId: sub.id,
          amountCents,
          currency: "PHP",
          method: eventData?.payment_method_type ?? "unknown",
          status: "PAID",
          paymongoIntentId: reference,
        },
      });

      const invoiceCount = await prisma.invoice.count();
      await prisma.invoice.create({
        data: {
          tenantId: parsed.tenantId,
          paymentId: payment.id,
          subscriptionId: sub.id,
          invoiceNumber: `INV-${String(invoiceCount + 1).padStart(6, "0")}`,
          issuedAt: new Date(),
          paidAt: new Date(),
          items: [
            {
              name: parsed.serviceKey ?? parsed.bundleKey ?? "Subscription",
              amount: amountCents,
            },
          ],
          subtotalCents: amountCents,
          taxCents: Math.round(amountCents * 0.12),
          totalCents: amountCents,
        },
      });

      break;
    }
    case "payment.failed": {
      const reference = eventData?.reference_number;
      if (!reference) break;

      const parsed = parseReference(reference);
      if (!parsed.tenantId) break;

      const prisma = getPrisma();
      await prisma.payment.create({
        data: {
          tenantId: parsed.tenantId,
          amountCents: eventData?.amount ?? 0,
          currency: "PHP",
          method: eventData?.payment_method_type ?? "unknown",
          status: "FAILED",
          paymongoIntentId: reference,
        },
      });

      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
