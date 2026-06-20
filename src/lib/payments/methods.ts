export interface PaymentMethod {
  id: "gcash" | "maya" | "paypal" | "bank";
  name: string;
  tagline: string;
  /** Lucide icon name (resolved via `@/components/icon-map`). */
  icon: string;
  /** Brand accent color (for icon tint + selected ring). */
  brand: string;
  /** Corresponding PayMongo payment method type. */
  paymongoType: string;
}

export const paymentMethods: PaymentMethod[] = [
  {
    id: "gcash",
    name: "GCash",
    tagline: "Pay with your GCash wallet",
    icon: "Wallet",
    brand: "#0071CE",
    paymongoType: "gcash",
  },
  {
    id: "maya",
    name: "Maya",
    tagline: "Pay with Maya",
    icon: "Smartphone",
    brand: "#23C26A",
    paymongoType: "paymaya",
  },
  {
    id: "paypal",
    name: "PayPal",
    tagline: "Pay with your PayPal balance",
    icon: "CreditCard",
    brand: "#0070BA",
    paymongoType: "paypal",
  },
  {
    id: "bank",
    name: "Bank Transfer",
    tagline: "Online banking & InstaPay",
    icon: "Landmark",
    brand: "#7C7CE0",
    paymongoType: "dob",
  },
];
