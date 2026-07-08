/**
 * Shared DTO types for the POS module — used by both the API routes and the
 * dashboard UI. Self-contained: no dependency on any other Solaris module.
 *
 * Money crosses this boundary in pesos (floats). The database stores centavos;
 * the service layer converts at the edge.
 */

export type PosPaymentMethod = "Cash" | "GCash" | "Maya" | "Card" | "Bank";

export const POS_PAYMENT_METHODS: PosPaymentMethod[] = [
  "Cash",
  "GCash",
  "Maya",
  "Card",
  "Bank",
];

export type PosTransactionStatus = "COMPLETED" | "VOIDED" | "REFUNDED";

// --- Catalog -----------------------------------------------------------------

export interface PosCategoryDTO {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  productCount: number;
}

export interface PosProductDTO {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  imageUrl: string | null;
  categoryId: string | null;
  available: boolean;
  createdAt: string;
}

export interface PosCatalogDTO {
  categories: PosCategoryDTO[];
  products: PosProductDTO[];
}

export interface PosProductInput {
  name: string;
  sku?: string | null;
  price: number;
  imageUrl?: string | null;
  categoryId?: string | null;
  available?: boolean;
}

// --- Cart ---------------------------------------------------------------------

export interface PosCartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  imageUrl?: string | null;
}

// --- Checkout ----------------------------------------------------------------

export type PosDiscountType = "amount" | "percent";

export interface PosCheckoutPayload {
  items: { productId: string; qty: number }[];
  method: PosPaymentMethod;
  /** Pesos tendered — required for Cash. */
  cashReceived?: number;
  discountType?: PosDiscountType;
  discountValue?: number;
  customer?: string;
  notes?: string;
}

// --- Receipt -----------------------------------------------------------------

/** Immutable receipt content frozen at checkout time. */
export interface PosReceiptSnapshot {
  receiptNo: string;
  ref: string;
  business: {
    name: string;
    address: string | null;
    contactNumber: string | null;
    logoUrl: string | null;
  };
  headerMessage: string | null;
  footerMessage: string | null;
  thankYouMessage: string | null;
  cashier: string;
  customer: string | null;
  completedAt: string;
  lines: { name: string; qty: number; price: number; lineTotal: number }[];
  subtotal: number;
  discount: number;
  /** Null when VAT is disabled. `included` mirrors vatInclusive at sale time. */
  tax: { label: string; amount: number; included: boolean } | null;
  total: number;
  method: PosPaymentMethod;
  cashReceived: number | null;
  change: number | null;
}

// --- Transactions ------------------------------------------------------------

export interface PosTransactionRowDTO {
  id: string;
  ref: string;
  receiptNo: string | null;
  completedAt: string;
  cashier: string | null;
  customer: string | null;
  method: PosPaymentMethod;
  status: PosTransactionStatus;
  total: number;
  change: number | null;
  itemCount: number;
}

export interface PosTransactionDetailDTO extends PosTransactionRowDTO {
  subtotal: number;
  discount: number;
  tax: number;
  cashReceived: number | null;
  notes: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  items: { name: string; qty: number; price: number; lineTotal: number }[];
  receipt: PosReceiptSnapshot | null;
}

export interface PosTransactionListDTO {
  rows: PosTransactionRowDTO[];
  total: number;
  /** Sum of COMPLETED transaction totals matching the filters, in pesos. */
  revenue: number;
}

export type PosTransactionSort = "newest" | "oldest" | "highest" | "lowest";

export interface PosTransactionFilters {
  search?: string;
  status?: PosTransactionStatus | "all";
  method?: PosPaymentMethod | "all";
  from?: string;
  to?: string;
  minTotal?: number;
  maxTotal?: number;
  sort?: PosTransactionSort;
  limit?: number;
  offset?: number;
}

// --- Settings ----------------------------------------------------------------

export interface PosSettingsDTO {
  companyName: string;
  address: string;
  contactNumber: string;
  logoUrl: string | null;
  headerMessage: string;
  footerMessage: string;
  thankYouMessage: string;
  vatEnabled: boolean;
  vatRate: number; // percent, e.g. 12
  vatInclusive: boolean;
  pinRequired: boolean;
  pinSet: boolean;
  primaryColor: string;
  secondaryColor: string;
  theme: "light" | "dark";
  cashierName: string;
  defaultMethod: PosPaymentMethod;
}

export type PosSettingsPatch = Partial<Omit<PosSettingsDTO, "pinSet">>;

// --- Reports -----------------------------------------------------------------

export type PosReportPeriod = "daily" | "weekly" | "monthly" | "custom";

export interface PosReportDTO {
  period: PosReportPeriod;
  rangeFrom: string;
  rangeTo: string;
  revenue: number;
  transactionCount: number;
  averageSale: number;
  itemsSold: number;
  voidedCount: number;
  bestSellers: { name: string; qty: number; revenue: number }[];
  topCategories: { name: string; color: string | null; qty: number; revenue: number }[];
  peakHours: { hour: number; count: number; revenue: number }[];
  methodBreakdown: { method: string; count: number; revenue: number }[];
  dailyTrend: { day: string; revenue: number; count: number }[];
}

// --- PIN ---------------------------------------------------------------------

export interface PosPinStatusDTO {
  pinRequired: boolean;
  pinSet: boolean;
  unlocked: boolean;
}
