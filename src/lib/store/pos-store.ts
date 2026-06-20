"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PosPaymentMethod = "Cash" | "GCash" | "Maya" | "Card" | "Bank";

export type PosTransactionStatus = "COMPLETED" | "VOIDED" | "REFUNDED";

export interface PosProduct {
  id: string;
  name: string;
  sku?: string;
  price: number;
  categoryId: string | null;
  imageUrl?: string;
  unitOfMeasure: string;
  isActive: boolean;
  createdAt: string;
}

export interface PosCategory {
  id: string;
  name: string;
  color?: string;
  sortOrder: number;
  createdAt: string;
}

export interface PosCartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  unitOfMeasure: string;
}

export interface PosTransactionItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  lineTotal: number;
  unitOfMeasure: string;
}

export interface PosTransaction {
  id: string;
  ref: string;
  items: PosTransactionItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  cashReceived?: number;
  change?: number;
  method: PosPaymentMethod;
  status: PosTransactionStatus;
  customer?: string;
  notes?: string;
  cashier: string;
  date: string;
  voidedAt?: string | null;
  voidReason?: string;
  refundedAt?: string | null;
}

export interface PosReceiptSettings {
  companyName: string;
  address: string;
  contactNumber: string;
  headerMessage: string;
  footerMessage: string;
  thankYouMessage: string;
  showLogo: boolean;
  showVat: boolean;
  vatRate: number;
}

export interface PosBrandingSettings {
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  theme: "light" | "dark";
}

export interface PosSettings {
  receipt: PosReceiptSettings;
  branding: PosBrandingSettings;
  requirePinForReports: boolean;
  requirePinForVoid: boolean;
  requirePinForSettings: boolean;
  defaultPaymentMethod: PosPaymentMethod;
  enableVat: boolean;
  vatRate: number;
  cashier: string;
}

export interface PosProductDraft {
  name: string;
  sku?: string;
  price: number;
  categoryId: string | null;
  imageUrl?: string;
  unitOfMeasure: string;
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

let counter = 0;
const uid = (p: string) =>
  `${p}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

const posRef = () =>
  "POS-" + Math.floor(100000 + Math.random() * 900000);

function isoDaysAgo(days: number, hour = 12, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Default settings
// ---------------------------------------------------------------------------

const defaultReceiptSettings: PosReceiptSettings = {
  companyName: "My Business",
  address: "123 Main Street, Manila, Philippines",
  contactNumber: "+63 912 345 6789",
  headerMessage: "Welcome! Thank you for your business.",
  footerMessage: "All sales are final. No returns without receipt.",
  thankYouMessage: "Thank you for your purchase! See you again soon. ✦",
  showLogo: false,
  showVat: true,
  vatRate: 12,
};

const defaultBrandingSettings: PosBrandingSettings = {
  companyName: "My Business",
  primaryColor: "#C98A3C",
  secondaryColor: "#1a1a1a",
  theme: "light",
};

const defaultSettings: PosSettings = {
  receipt: defaultReceiptSettings,
  branding: defaultBrandingSettings,
  requirePinForReports: true,
  requirePinForVoid: true,
  requirePinForSettings: true,
  defaultPaymentMethod: "Cash",
  enableVat: true,
  vatRate: 12,
  cashier: "Cashier",
};

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const seedPosCategories: PosCategory[] = [
  { id: "pcat-all", name: "All", color: "#1a1a1a", sortOrder: 0, createdAt: isoDaysAgo(30) },
  { id: "pcat-drinks", name: "Drinks", color: "#C98A3C", sortOrder: 1, createdAt: isoDaysAgo(30) },
  { id: "pcat-food", name: "Food", color: "#E8B84B", sortOrder: 2, createdAt: isoDaysAgo(30) },
  { id: "pcat-merch", name: "Merchandise", color: "#A6A6A4", sortOrder: 3, createdAt: isoDaysAgo(30) },
  { id: "pcat-other", name: "Other", color: "#5C5C5E", sortOrder: 4, createdAt: isoDaysAgo(30) },
];

const seedPosProducts: PosProduct[] = [];

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface PosState {
  posProducts: PosProduct[];
  posCategories: PosCategory[];
  transactions: PosTransaction[];
  settings: PosSettings;

  // Actions — Products
  addPosProduct: (draft: PosProductDraft) => PosProduct;
  updatePosProduct: (id: string, patch: Partial<PosProductDraft>) => void;
  deletePosProduct: (id: string) => { ok: boolean; reason?: string };
  togglePosProductActive: (id: string) => void;

  // Actions — Categories
  addPosCategory: (c: { name: string; color?: string }) => PosCategory;
  updatePosCategory: (id: string, patch: Partial<PosCategory>) => void;
  deletePosCategory: (id: string) => { ok: boolean; reason?: string };

  // Actions — Transactions
  recordPosTransaction: (opts: {
    items: PosCartItem[];
    method: PosPaymentMethod;
    cashReceived?: number;
    customer?: string;
    notes?: string;
  }) => PosTransaction;
  voidTransaction: (id: string, reason?: string) => { ok: boolean; reason?: string };

  // Actions — Settings
  updateReceiptSettings: (patch: Partial<PosReceiptSettings>) => void;
  updateBrandingSettings: (patch: Partial<PosBrandingSettings>) => void;
  updatePosSettings: (patch: Partial<Omit<PosSettings, "receipt" | "branding">>) => void;

  // Reset
  resetPos: () => void;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initial = () => ({
  posProducts: seedPosProducts,
  posCategories: seedPosCategories,
  transactions: [] as PosTransaction[],
  settings: defaultSettings,
});

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      ...initial(),

      // ----- Products ----------------------------------------------------------
      addPosProduct: (draft) => {
        const now = new Date().toISOString();
        const product: PosProduct = {
          id: uid("pprod"),
          name: draft.name.trim(),
          sku: draft.sku?.trim() || undefined,
          price: draft.price,
          categoryId: draft.categoryId,
          imageUrl: draft.imageUrl,
          unitOfMeasure: draft.unitOfMeasure || "pc",
          isActive: true,
          createdAt: now,
        };
        set((s) => ({ posProducts: [product, ...s.posProducts] }));
        return product;
      },

      updatePosProduct: (id, patch) => {
        set((s) => ({
          posProducts: s.posProducts.map((p) =>
            p.id === id ? { ...p, ...patch, name: patch.name?.trim() ?? p.name } : p,
          ),
        }));
      },

      deletePosProduct: (id) => {
        const state = get();
        const product = state.posProducts.find((p) => p.id === id);
        if (!product) return { ok: false, reason: "Product not found." };
        set((s) => ({ posProducts: s.posProducts.filter((p) => p.id !== id) }));
        return { ok: true };
      },

      togglePosProductActive: (id) => {
        set((s) => ({
          posProducts: s.posProducts.map((p) =>
            p.id === id ? { ...p, isActive: !p.isActive } : p,
          ),
        }));
      },

      // ----- Categories --------------------------------------------------------
      addPosCategory: ({ name, color }) => {
        const now = new Date().toISOString();
        const existing = get().posCategories;
        const maxOrder = existing.reduce((m, c) => Math.max(m, c.sortOrder), 0);
        const category: PosCategory = {
          id: uid("pcat"),
          name: name.trim(),
          color: color ?? "#888888",
          sortOrder: maxOrder + 1,
          createdAt: now,
        };
        set((s) => ({ posCategories: [...s.posCategories, category] }));
        return category;
      },

      updatePosCategory: (id, patch) => {
        set((s) => ({
          posCategories: s.posCategories.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        }));
      },

      deletePosCategory: (id) => {
        const state = get();
        if (id === "pcat-all") {
          return { ok: false, reason: "Cannot delete the 'All' category." };
        }
        const cat = state.posCategories.find((c) => c.id === id);
        if (!cat) return { ok: false, reason: "Category not found." };
        set((s) => ({
          posCategories: s.posCategories.filter((c) => c.id !== id),
        }));
        return { ok: true };
      },

      // ----- Transactions ------------------------------------------------------
      recordPosTransaction: ({ items, method, cashReceived, customer, notes }) => {
        const settings = get().settings;
        const vatRate = settings.enableVat ? settings.vatRate / 100 : 0;
        const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
        const vatAmount = Math.round(subtotal * vatRate);
        const total = subtotal;
        const change =
          method === "Cash" && cashReceived != null
            ? Math.max(0, cashReceived - total)
            : undefined;

        const txnItems: PosTransactionItem[] = items.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          qty: i.qty,
          lineTotal: i.price * i.qty,
          unitOfMeasure: i.unitOfMeasure,
        }));

        const txn: PosTransaction = {
          id: uid("ptxn"),
          ref: posRef(),
          items: txnItems,
          subtotal,
          vatAmount,
          total,
          cashReceived: method === "Cash" ? cashReceived : undefined,
          change,
          method,
          status: "COMPLETED",
          customer,
          notes,
          cashier: settings.cashier,
          date: new Date().toISOString(),
        };

        set((s) => ({ transactions: [txn, ...s.transactions] }));
        return txn;
      },

      voidTransaction: (id, reason) => {
        const state = get();
        const txn = state.transactions.find((t) => t.id === id);
        if (!txn) return { ok: false, reason: "Transaction not found." };
        if (txn.status !== "COMPLETED") {
          return { ok: false, reason: `Transaction is already ${txn.status.toLowerCase()}.` };
        }
        const now = new Date().toISOString();
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id
              ? { ...t, status: "VOIDED", voidedAt: now, voidReason: reason }
              : t,
          ),
        }));
        return { ok: true };
      },

      // ----- Settings ----------------------------------------------------------
      updateReceiptSettings: (patch) => {
        set((s) => ({
          settings: {
            ...s.settings,
            receipt: { ...s.settings.receipt, ...patch },
          },
        }));
      },

      updateBrandingSettings: (patch) => {
        set((s) => ({
          settings: {
            ...s.settings,
            branding: { ...s.settings.branding, ...patch },
          },
        }));
      },

      updatePosSettings: (patch) => {
        set((s) => ({
          settings: { ...s.settings, ...patch },
        }));
      },

      resetPos: () => set(initial()),
    }),
    {
      name: "solaris-pos",
      partialize: (s) => ({
        posProducts: s.posProducts,
        posCategories: s.posCategories,
        transactions: s.transactions,
        settings: s.settings,
      }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export interface PosStats {
  totalTransactions: number;
  completedTransactions: number;
  voidedTransactions: number;
  totalRevenue: number;
  todayRevenue: number;
  todayTransactions: number;
  averageTransactionValue: number;
}

export function computePosStats(state: PosState): PosStats {
  const completed = state.transactions.filter((t) => t.status === "COMPLETED");
  const voided = state.transactions.filter((t) => t.status === "VOIDED");
  const totalRevenue = completed.reduce((s, t) => s + t.total, 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTxns = completed.filter(
    (t) => new Date(t.date) >= todayStart,
  );

  return {
    totalTransactions: state.transactions.length,
    completedTransactions: completed.length,
    voidedTransactions: voided.length,
    totalRevenue,
    todayRevenue: todayTxns.reduce((s, t) => s + t.total, 0),
    todayTransactions: todayTxns.length,
    averageTransactionValue: completed.length
      ? Math.round(totalRevenue / completed.length)
      : 0,
  };
}

export function filterPosTransactions(
  transactions: PosTransaction[],
  opts: {
    search?: string;
    status?: PosTransactionStatus | "all";
    method?: PosPaymentMethod | "all";
    from?: Date;
    to?: Date;
  },
): PosTransaction[] {
  return transactions.filter((t) => {
    if (opts.search) {
      const q = opts.search.toLowerCase();
      if (
        !t.ref.toLowerCase().includes(q) &&
        !t.items.some((i) => i.name.toLowerCase().includes(q)) &&
        !(t.customer ?? "").toLowerCase().includes(q)
      )
        return false;
    }
    if (opts.status && opts.status !== "all" && t.status !== opts.status)
      return false;
    if (opts.method && opts.method !== "all" && t.method !== opts.method)
      return false;
    if (opts.from && new Date(t.date) < opts.from) return false;
    if (opts.to && new Date(t.date) > opts.to) return false;
    return true;
  });
}