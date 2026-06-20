import {
  Boxes,
  LineChart,
  ReceiptText,
  ScanLine,
  Clock,
  Sprout,
  TrendingUp,
  Building2,
  LayoutGrid,
  Wallet,
  Smartphone,
  CreditCard,
  Landmark,
  type LucideIcon,
} from "lucide-react";

/** Resolves the string `icon` keys stored in serializable data to components. */
export const iconMap: Record<string, LucideIcon> = {
  Boxes,
  LineChart,
  ReceiptText,
  ScanLine,
  Clock,
  Sprout,
  TrendingUp,
  Building2,
  LayoutGrid,
  Wallet,
  Smartphone,
  CreditCard,
  Landmark,
};

export function getIcon(key: string): LucideIcon {
  return iconMap[key] ?? Boxes;
}
