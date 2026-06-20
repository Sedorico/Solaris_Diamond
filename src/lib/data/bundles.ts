import { services, type ServiceId } from "./services";

export type BundleId = "starter" | "growth" | "business";

export interface Bundle {
  id: BundleId;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  /** Monthly bundle price in PHP. */
  price: number;
  /** Services unlocked by this bundle. */
  services: ServiceId[];
  /** Services added on top of the previous (cheaper) bundle, for the "Includes" UI. */
  adds: ServiceId[];
  featured?: boolean;
  gradient: [string, string];
}

export const bundles: Bundle[] = [
  {
    id: "starter",
    name: "Starter Bundle",
    tagline: "Everything to start selling smart.",
    description:
      "Get your inventory under control and watch your sales come to life — the essential foundation.",
    icon: "Sprout",
    price: 799,
    services: ["inventory", "sales"],
    adds: ["inventory", "sales"],
    gradient: ["oklch(0.48 0 0)", "oklch(0.26 0 0)"],
  },
  {
    id: "growth",
    name: "Growth Bundle",
    tagline: "Scale with spend in full view.",
    description:
      "Everything in Starter, plus full expense tracking so you grow profitably, not just quickly.",
    icon: "TrendingUp",
    price: 999,
    services: ["inventory", "sales", "expenses"],
    adds: ["expenses"],
    featured: true,
    gradient: ["oklch(0.3 0 0)", "oklch(0.13 0 0)"],
  },
  {
    id: "business",
    name: "Business Bundle",
    tagline: "The complete operating system.",
    description:
      "Everything in Growth, plus Point of Sale and Attendance — your entire business, fully unified.",
    icon: "Building2",
    price: 1499,
    services: ["inventory", "sales", "expenses", "pos", "attendance"],
    adds: ["pos", "attendance"],
    gradient: ["oklch(0.52 0 0)", "oklch(0.28 0 0)"],
  },
];

export const bundleMap: Record<BundleId, Bundle> = Object.fromEntries(
  bundles.map((b) => [b.id, b]),
) as Record<BundleId, Bundle>;

/** Sum of the individual service prices a bundle covers (the "list price"). */
export function bundleListPrice(bundle: Bundle): number {
  return bundle.services.reduce((total, id) => {
    const svc = services.find((s) => s.id === id);
    return total + (svc?.price ?? 0);
  }, 0);
}

export function bundleSavings(bundle: Bundle): number {
  return Math.max(0, bundleListPrice(bundle) - bundle.price);
}
