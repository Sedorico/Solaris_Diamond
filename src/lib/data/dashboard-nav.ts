import type { ServiceId } from "./services";

export interface DashboardNavItem {
  title: string;
  href: string;
  icon: string;
  /** The service that unlocks this module. `null` = always available. */
  service: ServiceId | null;
}

export const dashboardNav: DashboardNavItem[] = [
  { title: "Overview", href: "/dashboard", icon: "LayoutGrid", service: null },
  { title: "Inventory", href: "/dashboard/inventory", icon: "Boxes", service: "inventory" },
  { title: "Sales", href: "/dashboard/sales", icon: "LineChart", service: "sales" },
  { title: "Expenses", href: "/dashboard/expenses", icon: "ReceiptText", service: "expenses" },
  { title: "Point of Sale", href: "/dashboard/pos", icon: "ScanLine", service: "pos" },
  { title: "Attendance", href: "/dashboard/attendance", icon: "Clock", service: "attendance" },
];
