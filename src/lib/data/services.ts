/**
 * The catalogue of subscribable services. This is the single source of truth
 * used by the marketing site, the pricing page, checkout and the customer
 * dashboard (to decide which modules are unlocked).
 *
 * `icon` is a string key resolved to a lucide-react component via
 * `components/icon-map.tsx` so this module stays serializable across the
 * server/client boundary.
 */

export type ServiceId =
  | "inventory"
  | "sales"
  | "expenses"
  | "pos"
  | "attendance";

export interface ServiceFeature {
  title: string;
  description: string;
}

export interface Service {
  id: ServiceId;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  /** Monthly price in PHP. */
  price: number;
  href: string;
  /** Short bullet list shown on cards / pricing. */
  features: string[];
  /** Richer feature blocks shown on the service detail / section. */
  capabilities: ServiceFeature[];
  /** Accent gradient (from / to oklch) for premium visual variety. */
  gradient: [string, string];
  stat: { label: string; value: string };
}

export const services: Service[] = [
  {
    id: "inventory",
    name: "Inventory Management",
    tagline: "Always know exactly what you have.",
    description:
      "Track every product, variant and stock movement in real time with automatic low-stock intelligence.",
    icon: "Boxes",
    price: 499,
    href: "/services/inventory",
    features: [
      "Add, edit & delete products",
      "Stock-in & stock-out logging",
      "Low-stock alerts",
      "Categories & variants",
      "Barcode-ready SKUs",
    ],
    capabilities: [
      { title: "Add Product", description: "Create rich product records with SKU, category, cost, price and reorder points." },
      { title: "Edit Product", description: "Update pricing and details instantly with a full audit trail." },
      { title: "Delete Product", description: "Soft-delete and archive without losing historical reporting." },
      { title: "Stock In", description: "Receive deliveries and increment quantities with reference notes." },
      { title: "Stock Out", description: "Deduct stock on sales, damage or transfers automatically." },
      { title: "Low Stock Alert", description: "Get notified the moment a product dips below its reorder point." },
    ],
    gradient: ["oklch(0.42 0 0)", "oklch(0.2 0 0)"],
    stat: { label: "avg. stock accuracy", value: "99.4%" },
  },
  {
    id: "sales",
    name: "Sales Dashboard",
    tagline: "See your revenue with total clarity.",
    description:
      "A beautiful, real-time view of daily, weekly and monthly performance and your best-selling products.",
    icon: "LineChart",
    price: 399,
    href: "/services/sales",
    features: [
      "Daily sales overview",
      "Weekly sales trends",
      "Monthly sales reports",
      "Top products ranking",
      "Exportable insights",
    ],
    capabilities: [
      { title: "Daily Sales", description: "Live revenue, orders and average basket size for today." },
      { title: "Weekly Sales", description: "Spot momentum with rolling 7-day comparisons." },
      { title: "Monthly Sales", description: "Board-ready monthly summaries with growth deltas." },
      { title: "Top Products", description: "Know your hero products and double down on what sells." },
    ],
    gradient: ["oklch(0.5 0 0)", "oklch(0.26 0 0)"],
    stat: { label: "reporting latency", value: "real-time" },
  },
  {
    id: "expenses",
    name: "Expense Tracking",
    tagline: "Control spend without the spreadsheets.",
    description:
      "Capture every cost, organise by category and understand exactly where the money goes each month.",
    icon: "ReceiptText",
    price: 299,
    href: "/services/expenses",
    features: [
      "Quick expense capture",
      "Custom categories",
      "Monthly summaries",
      "Vendor tracking",
      "Profit-aware reporting",
    ],
    capabilities: [
      { title: "Add Expense", description: "Log costs in seconds with amount, vendor and category." },
      { title: "Expense Categories", description: "Group spend into custom, colour-coded categories." },
      { title: "Monthly Expense Summary", description: "A clean monthly breakdown of where every peso went." },
    ],
    gradient: ["oklch(0.38 0 0)", "oklch(0.18 0 0)"],
    stat: { label: "categories tracked", value: "unlimited" },
  },
  {
    id: "pos",
    name: "Point of Sale",
    tagline: "Checkout that feels effortless.",
    description:
      "A fast, elegant POS with product selection, instant receipts and a complete transaction history.",
    icon: "ScanLine",
    price: 699,
    href: "/services/pos",
    features: [
      "Tap-to-add product grid",
      "One-tap checkout",
      "Receipt generation",
      "Transaction history",
      "Multi-tender support",
    ],
    capabilities: [
      { title: "Product Selection", description: "A responsive product grid built for speed at the counter." },
      { title: "Checkout", description: "Apply discounts, take payment and close the sale in seconds." },
      { title: "Receipt Generation", description: "Generate digital and printable receipts instantly." },
      { title: "Transaction History", description: "Search, filter and reconcile every transaction." },
    ],
    gradient: ["oklch(0.46 0 0)", "oklch(0.23 0 0)"],
    stat: { label: "avg. checkout time", value: "8 sec" },
  },
  {
    id: "attendance",
    name: "Attendance Tracking",
    tagline: "Know who's in, without the paperwork.",
    description:
      "Simple time-in / time-out tracking with tamper-proof logs your whole team can rely on.",
    icon: "Clock",
    price: 249,
    href: "/services/attendance",
    features: [
      "One-tap time in",
      "One-tap time out",
      "Daily attendance logs",
      "Hours worked totals",
      "Team roster view",
    ],
    capabilities: [
      { title: "Time In", description: "Staff clock in with a single tap, timestamped to the second." },
      { title: "Time Out", description: "Accurate clock-out with automatic hours calculation." },
      { title: "Attendance Logs", description: "A searchable, exportable record of every shift." },
    ],
    gradient: ["oklch(0.54 0 0)", "oklch(0.3 0 0)"],
    stat: { label: "log integrity", value: "tamper-proof" },
  },
];

export const serviceMap: Record<ServiceId, Service> = Object.fromEntries(
  services.map((s) => [s.id, s]),
) as Record<ServiceId, Service>;

export function getService(id: ServiceId) {
  return serviceMap[id];
}
