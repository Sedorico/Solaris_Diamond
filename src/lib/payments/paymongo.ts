import "server-only";
import { env, integrations } from "@/lib/env";

/**
 * PayMongo integration (server-only).
 *
 * Creates hosted Checkout Sessions and verifies webhook signatures. When no
 * secret key is configured the helpers return a mock session so local checkout
 * still flows end to end.
 */

const API = "https://api.paymongo.com/v1";

function authHeader() {
  const key = env.paymongoSecretKey ?? "";
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export interface CheckoutLineItem {
  name: string;
  amount: number; // in centavos
  quantity: number;
}

export interface CreateCheckoutInput {
  lineItems: CheckoutLineItem[];
  methods?: string[];
  description: string;
  referenceNumber: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(input: CreateCheckoutInput): Promise<{
  id: string;
  checkoutUrl: string;
  mock: boolean;
}> {
  if (!integrations.paymongo) {
    // Mock mode — bounce straight to the caller's success URL (the checkout
    // page handles the `?ref=` success state). Using input.successUrl keeps the
    // service/bundle context so the confirmation shows the right plan.
    return {
      id: `cs_mock_${Date.now()}`,
      checkoutUrl: input.successUrl,
      mock: true,
    };
  }

  const res = await fetch(`${API}/checkout_sessions`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: input.lineItems.map((li) => ({
            name: li.name,
            amount: li.amount,
            currency: "PHP",
            quantity: li.quantity,
          })),
          payment_method_types: input.methods ?? ["gcash", "paymaya", "card", "dob"],
          description: input.description,
          reference_number: input.referenceNumber,
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`PayMongo error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  return {
    id: json.data.id,
    checkoutUrl: json.data.attributes.checkout_url,
    mock: false,
  };
}

/**
 * Verify a PayMongo webhook signature header (`Paymongo-Signature`).
 * Format: `t=<timestamp>,te=<test sig>,li=<live sig>`.
 */
export async function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!integrations.paymongo || !env.paymongoWebhookSecret || !signatureHeader) {
    return false;
  }
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=") as [string, string]),
  );
  const timestamp = parts.t;
  const expected = parts.li ?? parts.te;
  if (!timestamp || !expected) return false;

  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const signed = createHmac("sha256", env.paymongoWebhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(signed), Buffer.from(expected));
  } catch {
    return false;
  }
}
