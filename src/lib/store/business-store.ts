"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProductStatus = "ACTIVE" | "ARCHIVED";

export type InventoryTransactionType =
  | "STOCK_IN"
  | "STOCK_OUT"
  | "ADJUSTMENT";

export type AuditActionType =
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_ARCHIVED"
  | "PRODUCT_RESTORED"
  | "PRODUCT_DELETED"
  | "INVENTORY_CATEGORY_CREATED"
  | "INVENTORY_CATEGORY_UPDATED"
  | "INVENTORY_CATEGORY_DELETED"
  | "SALES_CATEGORY_CREATED"
  | "SALES_CATEGORY_UPDATED"
  | "SALES_CATEGORY_DELETED"
  | "STOCK_IN"
  | "STOCK_OUT"
  | "STOCK_ADJUSTMENT";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  imageUrl?: string;
  unitOfMeasure: string;
  categoryId: string | null;
  onHand: number;
  reorderPoint: number;
  reorderQty: number;
  cost: number;
  price: number;
  status: ProductStatus;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  type: InventoryTransactionType;
  quantity: number;
  signedQty: number;
  reason?: string;
  reference?: string;
  notes?: string;
  unitCost: number;
  totalCost: number;
  user: string;
  occurredAt: string;
}

export interface StockLedgerEntry {
  id: string;
  productId: string;
  transactionId: string;
  qtyChange: number;
  balanceAfter: number;
  valueChange: number;
  postedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: AuditActionType;
  entityType: "product" | "inventoryCategory" | "salesCategory" | "transaction";
  entityId: string;
  entityLabel: string;
  user: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  categoryId: string | null;
  amount: number;
  vendor?: string;
  description?: string;
  notes?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  deletedAt?: string | null;
}

export type ExpenseAuditAction =
  | "EXPENSE_CREATED"
  | "EXPENSE_UPDATED"
  | "EXPENSE_DELETED"
  | "EXPENSE_RESTORED"
  | "EXPENSE_CATEGORY_CREATED"
  | "EXPENSE_CATEGORY_UPDATED"
  | "EXPENSE_CATEGORY_DELETED";

export interface ExpenseAuditEntry {
  id: string;
  action: ExpenseAuditAction;
  entityType: "expense" | "expenseCategory";
  entityId: string;
  entityLabel: string;
  user: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type ExpenseReportKind =
  | "DASHBOARD_VIEW"
  | "EXPORT_CSV"
  | "EXPORT_XLSX"
  | "EXPORT_PDF";

export interface ExpenseReportLog {
  id: string;
  kind: ExpenseReportKind;
  rangeFrom: string;
  rangeTo: string;
  filters?: Record<string, unknown>;
  rowCount?: number;
  total?: number;
  exportedFile?: string;
  user: string;
  createdAt: string;
}

export type SaleStatus = "COMPLETED" | "REFUNDED" | "VOIDED";
export type SaleChannel = "POS" | "ONLINE" | "MANUAL" | "OTHER";
export type SaleMethod = "Cash" | "GCash" | "Maya" | "Card" | "Bank";

export interface SaleItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  cost?: number;
  salesCategoryId?: string | null;
}

export interface Sale {
  id: string;
  ref: string;
  items: SaleItem[];
  total: number;
  cost?: number;
  method: SaleMethod;
  channel: SaleChannel;
  status: SaleStatus;
  customer?: string;
  notes?: string;
  date: string;
  refundedAt?: string | null;
  archivedAt?: string | null;
}

export type SaleAuditAction =
  | "SALE_CREATED"
  | "SALE_ARCHIVED"
  | "SALE_RESTORED"
  | "SALE_DELETED";

export interface SaleAuditEntry {
  id: string;
  action: SaleAuditAction;
  entityId: string;
  entityLabel: string;
  user: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type SalesReportKind =
  | "DASHBOARD_VIEW"
  | "KPI_QUERY"
  | "TREND_QUERY"
  | "PRODUCT_QUERY"
  | "EXPORT_CSV"
  | "EXPORT_XLSX";

export interface SalesReportLog {
  id: string;
  kind: SalesReportKind;
  rangeFrom: string;
  rangeTo: string;
  filters?: Record<string, unknown>;
  rowCount?: number;
  exportedFile?: string;
  user: string;
  createdAt: string;
}

export interface AttendanceLog {
  id: string;
  employee: string;
  date: string;
  timeIn: string;
  timeOut: string | null;
}

export const DEFAULT_EXPENSE_CATEGORIES: ReadonlyArray<{
  slug: string;
  name: string;
  color: string;
}> = [
  { slug: "utilities", name: "Utilities", color: "#5E81AC" },
  { slug: "rent", name: "Rent", color: "#BF616A" },
  { slug: "payroll", name: "Payroll", color: "#A3BE8C" },
  { slug: "supplies", name: "Supplies", color: "#D08770" },
  { slug: "transportation", name: "Transportation", color: "#88C0D0" },
  { slug: "marketing", name: "Marketing", color: "#EBCB8B" },
  { slug: "other", name: "Other", color: "#9ca3af" },
];

/** @deprecated Use expenseCategories from store instead */
export const expenseCategories = DEFAULT_EXPENSE_CATEGORIES.map((c) => c.name);

// ---------------------------------------------------------------------------
// utils
// ---------------------------------------------------------------------------

let counter = 0;
const uid = (p: string) =>
  `${p}_${Date.now().toString(36)}_${(counter++).toString(36)}`;
const txnRef = () => "TXN-" + Math.floor(100000 + Math.random() * 900000);

function isoDaysAgo(days: number, hour = 12, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "category";

const DEMO_USER = "Maria Santos";

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const seedInventoryCategories: Category[] = [
  { id: "icat-bev", name: "Beverages", slug: "beverages", color: "#C98A3C", createdAt: isoDaysAgo(40) },
  { id: "icat-cof", name: "Coffee", slug: "coffee", color: "#7A4422", createdAt: isoDaysAgo(40) },
  { id: "icat-eq", name: "Equipment", slug: "equipment", color: "#5C5C5E", createdAt: isoDaysAgo(40) },
  { id: "icat-merch", name: "Merch", slug: "merch", color: "#A6A6A4", createdAt: isoDaysAgo(40) },
  { id: "icat-food", name: "Food", slug: "food", color: "#E8B84B", createdAt: isoDaysAgo(40) },
  { id: "icat-sup", name: "Supplies", slug: "supplies", color: "#161618", createdAt: isoDaysAgo(40) },
];

const seedSalesCategories: Category[] = [
  { id: "scat-drinks", name: "Drinks", slug: "drinks", color: "#C98A3C", createdAt: isoDaysAgo(40) },
  { id: "scat-food", name: "Food", slug: "food", color: "#E8B84B", createdAt: isoDaysAgo(40) },
  { id: "scat-merch", name: "Merchandise", slug: "merchandise", color: "#A6A6A4", createdAt: isoDaysAgo(40) },
  { id: "scat-other", name: "Other", slug: "other", color: "#5C5C5E", createdAt: isoDaysAgo(40) },
];

function seedProducts(): Product[] {
  const t = isoDaysAgo(35);
  const base: Array<Omit<Product, "createdAt" | "updatedAt" | "status">> = [
    { id: "p1", sku: "BEV-CB-1L", name: "Artisan Cold Brew 1L", categoryId: "icat-bev", unitOfMeasure: "btl", price: 220, cost: 95, onHand: 48, reorderPoint: 20, reorderQty: 40, description: "Slow-steeped 18hr cold brew." },
    { id: "p2", sku: "COF-SO-250", name: "Single-Origin Beans 250g", categoryId: "icat-cof", unitOfMeasure: "bag", price: 480, cost: 240, onHand: 12, reorderPoint: 15, reorderQty: 30, description: "Ethiopia Yirgacheffe, light roast." },
    { id: "p3", sku: "EQ-V60-CR", name: "Ceramic Pour-Over V60", categoryId: "icat-eq", unitOfMeasure: "pc", price: 950, cost: 520, onHand: 7, reorderPoint: 10, reorderQty: 12 },
    { id: "p4", sku: "BEV-OAT-1L", name: "Oat Milk 1L", categoryId: "icat-bev", unitOfMeasure: "btl", price: 180, cost: 88, onHand: 64, reorderPoint: 24, reorderQty: 48 },
    { id: "p5", sku: "MER-TUM-16", name: "Branded Tumbler 16oz", categoryId: "icat-merch", unitOfMeasure: "pc", price: 650, cost: 280, onHand: 31, reorderPoint: 12, reorderQty: 24 },
    { id: "p6", sku: "FOO-CRS-12", name: "Croissant (frozen, 12pk)", categoryId: "icat-food", unitOfMeasure: "pack", price: 540, cost: 300, onHand: 5, reorderPoint: 8, reorderQty: 16 },
    { id: "p7", sku: "COF-ES-1K", name: "Espresso Blend 1kg", categoryId: "icat-cof", unitOfMeasure: "bag", price: 1450, cost: 760, onHand: 22, reorderPoint: 10, reorderQty: 20 },
    { id: "p8", sku: "SUP-CUP-8", name: "Paper Cups 8oz (50pk)", categoryId: "icat-sup", unitOfMeasure: "pack", price: 160, cost: 70, onHand: 90, reorderPoint: 30, reorderQty: 50 },
  ];
  return base.map((p) => ({
    ...p,
    status: "ACTIVE" as const,
    archivedAt: null,
    createdAt: t,
    updatedAt: t,
  }));
}

function seedInventoryHistory(products: Product[]) {
  const transactions: InventoryTransaction[] = [];
  const ledger: StockLedgerEntry[] = [];
  const audit: AuditLogEntry[] = [];

  for (const p of products) {
    const openingQty = p.onHand + Math.floor(Math.random() * 20) + 10;
    const opened = isoDaysAgo(34, 9, 0);
    const tIn: InventoryTransaction = {
      id: uid("itx"),
      productId: p.id,
      productName: p.name,
      type: "STOCK_IN",
      quantity: openingQty,
      signedQty: openingQty,
      reason: "Opening stock",
      reference: "OPENING",
      unitCost: p.cost,
      totalCost: p.cost * openingQty,
      user: DEMO_USER,
      occurredAt: opened,
    };
    transactions.push(tIn);
    ledger.push({
      id: uid("sle"),
      productId: p.id,
      transactionId: tIn.id,
      qtyChange: openingQty,
      balanceAfter: openingQty,
      valueChange: p.cost * openingQty,
      postedAt: opened,
    });
    audit.push({
      id: uid("aud"),
      action: "PRODUCT_CREATED",
      entityType: "product",
      entityId: p.id,
      entityLabel: p.name,
      user: DEMO_USER,
      createdAt: opened,
    });
    audit.push({
      id: uid("aud"),
      action: "STOCK_IN",
      entityType: "product",
      entityId: p.id,
      entityLabel: p.name,
      user: DEMO_USER,
      metadata: { qtyChange: openingQty, balanceAfter: openingQty, reason: "Opening stock" },
      createdAt: opened,
    });

    let bal = openingQty;
    const events = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < events; i++) {
      const day = 30 - Math.floor(Math.random() * 28);
      const out = Math.random() < 0.7;
      const qty = 1 + Math.floor(Math.random() * 6);
      const signed = out ? -qty : qty;
      if (bal + signed < 0) continue;
      const when = isoDaysAgo(day, 10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));
      const tx: InventoryTransaction = {
        id: uid("itx"),
        productId: p.id,
        productName: p.name,
        type: out ? "STOCK_OUT" : "STOCK_IN",
        quantity: qty,
        signedQty: signed,
        reason: out ? "Sale" : "Restock delivery",
        reference: out ? `SO-${100 + Math.floor(Math.random() * 900)}` : `PO-${200 + Math.floor(Math.random() * 800)}`,
        unitCost: p.cost,
        totalCost: p.cost * qty,
        user: DEMO_USER,
        occurredAt: when,
      };
      bal += signed;
      transactions.push(tx);
      ledger.push({
        id: uid("sle"),
        productId: p.id,
        transactionId: tx.id,
        qtyChange: signed,
        balanceAfter: bal,
        valueChange: signed * p.cost,
        postedAt: when,
      });
      audit.push({
        id: uid("aud"),
        action: out ? "STOCK_OUT" : "STOCK_IN",
        entityType: "product",
        entityId: p.id,
        entityLabel: p.name,
        user: DEMO_USER,
        metadata: { qtyChange: signed, balanceAfter: bal, reason: tx.reason },
        createdAt: when,
      });
    }

    if (bal !== p.onHand) {
      const delta = p.onHand - bal;
      const when = isoDaysAgo(0, 8, 30);
      const tx: InventoryTransaction = {
        id: uid("itx"),
        productId: p.id,
        productName: p.name,
        type: "ADJUSTMENT",
        quantity: Math.abs(delta),
        signedQty: delta,
        reason: "Cycle count reconciliation",
        reference: txnRef(),
        unitCost: p.cost,
        totalCost: p.cost * Math.abs(delta),
        user: DEMO_USER,
        occurredAt: when,
      };
      bal = p.onHand;
      transactions.push(tx);
      ledger.push({
        id: uid("sle"),
        productId: p.id,
        transactionId: tx.id,
        qtyChange: delta,
        balanceAfter: bal,
        valueChange: delta * p.cost,
        postedAt: when,
      });
      audit.push({
        id: uid("aud"),
        action: "STOCK_ADJUSTMENT",
        entityType: "product",
        entityId: p.id,
        entityLabel: p.name,
        user: DEMO_USER,
        metadata: { qtyChange: delta, balanceAfter: bal, reason: tx.reason },
        createdAt: when,
      });
    }
  }

  transactions.sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  ledger.sort((a, b) => +new Date(b.postedAt) - +new Date(a.postedAt));
  audit.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return { transactions, ledger, audit };
}

function seedExpenseCategories(): ExpenseCategory[] {
  const t = isoDaysAgo(40);
  return DEFAULT_EXPENSE_CATEGORIES.map((d) => ({
    id: `exp-cat-${d.slug}`,
    name: d.name,
    slug: d.slug,
    color: d.color,
    isDefault: true,
    createdAt: t,
  }));
}

function seedSales(products: Product[]): Sale[] {
  const sales: Sale[] = [];
  const pick = () => products[Math.floor(Math.random() * products.length)];
  // Map each product's inventory category onto a sales category so the
  // Category breakdown widget renders real slices instead of "Uncategorised".
  const invToSalesCategory: Record<string, string> = {
    "icat-bev": "scat-drinks",
    "icat-cof": "scat-drinks",
    "icat-food": "scat-food",
    "icat-merch": "scat-merch",
    "icat-eq": "scat-other",
    "icat-sup": "scat-other",
  };
  const customers = [
    null, null, null, null,
    "Jane Cooper", "Marcus Ng", "Lia Reyes", "Daniel Park",
    "Ana Diaz", "Henry Tan", "Riya Patel",
  ];
  const channels: SaleChannel[] = ["POS", "POS", "POS", "ONLINE", "ONLINE", "MANUAL"];
  for (let day = 0; day < 365; day++) {
    const intensity = day < 7 ? 6 : day < 30 ? 4 : day < 90 ? 3 : 1;
    const count = Math.max(0, Math.floor(Math.random() * intensity) + (day < 30 ? 1 : 0));
    for (let n = 0; n < count; n++) {
      const items: SaleItem[] = Array.from(
        { length: 1 + Math.floor(Math.random() * 3) },
        () => {
          const p = pick();
          return {
            productId: p.id,
            name: p.name,
            qty: 1 + Math.floor(Math.random() * 3),
            price: p.price,
            cost: p.cost,
            salesCategoryId: invToSalesCategory[p.categoryId ?? ""] ?? "scat-other",
          };
        },
      );
      const total = items.reduce((s, i) => s + i.price * i.qty, 0);
      const cost = items.reduce((s, i) => s + (i.cost ?? 0) * i.qty, 0);
      const methods: SaleMethod[] = ["Cash", "GCash", "Maya", "Card"];
      const status: SaleStatus =
        Math.random() < 0.97 ? "COMPLETED" : Math.random() < 0.5 ? "REFUNDED" : "VOIDED";
      sales.push({
        id: uid("s"),
        ref: txnRef(),
        items,
        total,
        cost,
        method: methods[Math.floor(Math.random() * methods.length)],
        channel: channels[Math.floor(Math.random() * channels.length)],
        status,
        customer: customers[Math.floor(Math.random() * customers.length)] ?? undefined,
        date: isoDaysAgo(day, 9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60)),
      });
    }
  }
  return sales.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

const seedAttendance: AttendanceLog[] = [
  { id: "a1", employee: "Maria Santos", date: isoDaysAgo(0), timeIn: isoDaysAgo(0, 8, 2), timeOut: null },
  { id: "a2", employee: "David Cruz", date: isoDaysAgo(0), timeIn: isoDaysAgo(0, 8, 58), timeOut: null },
  { id: "a3", employee: "Aisha Rahman", date: isoDaysAgo(1), timeIn: isoDaysAgo(1, 9, 5), timeOut: isoDaysAgo(1, 17, 30) },
  { id: "a4", employee: "Liam O'Brien", date: isoDaysAgo(1), timeIn: isoDaysAgo(1, 8, 45), timeOut: isoDaysAgo(1, 18, 2) },
];

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export interface ProductDraft {
  sku: string;
  name: string;
  description?: string;
  imageUrl?: string;
  unitOfMeasure?: string;
  categoryId?: string | null;
  cost: number;
  price: number;
  reorderPoint?: number;
  reorderQty?: number;
  openingStock?: number;
}

export interface StockMovementDraft {
  productId: string;
  type: InventoryTransactionType;
  quantity: number;
  reason?: string;
  reference?: string;
  notes?: string;
}

export interface ExpenseDraft {
  title: string;
  categoryId?: string | null;
  amount: number;
  vendor?: string;
  description?: string;
  notes?: string;
  date?: string;
}

interface BusinessState {
  products: Product[];
  inventoryCategories: Category[];
  salesCategories: Category[];
  transactions: InventoryTransaction[];
  ledger: StockLedgerEntry[];
  auditLogs: AuditLogEntry[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  expenseAuditLogs: ExpenseAuditEntry[];
  expenseReports: ExpenseReportLog[];
  sales: Sale[];
  salesReports: SalesReportLog[];
  salesAuditLogs: SaleAuditEntry[];
  attendance: AttendanceLog[];
  team: string[];

  addProduct: (p: ProductDraft) => Product;
  updateProduct: (id: string, p: Partial<ProductDraft>) => void;
  archiveProduct: (id: string) => void;
  restoreProduct: (id: string) => void;
  deleteProduct: (id: string) => { ok: boolean; reason?: string };

  recordStockMovement: (m: StockMovementDraft) => { ok: boolean; reason?: string };
  stockIn: (id: string, qty: number, opts?: Partial<StockMovementDraft>) => { ok: boolean; reason?: string };
  stockOut: (id: string, qty: number, opts?: Partial<StockMovementDraft>) => { ok: boolean; reason?: string };
  adjustStock: (id: string, signedDelta: number, opts?: Partial<StockMovementDraft>) => { ok: boolean; reason?: string };

  addInventoryCategory: (c: { name: string; description?: string; color?: string }) => Category;
  updateInventoryCategory: (id: string, patch: Partial<Category>) => void;
  deleteInventoryCategory: (id: string) => { ok: boolean; reason?: string };

  addSalesCategory: (c: { name: string; description?: string; color?: string }) => Category;
  updateSalesCategory: (id: string, patch: Partial<Category>) => void;
  deleteSalesCategory: (id: string) => { ok: boolean; reason?: string };

  addExpense: (e: ExpenseDraft) => Expense;
  updateExpense: (id: string, patch: Partial<ExpenseDraft>) => void;
  deleteExpense: (id: string) => void;
  restoreExpense: (id: string) => void;
  purgeExpense: (id: string) => void;

  addExpenseCategory: (c: { name: string; description?: string; color?: string }) => ExpenseCategory;
  updateExpenseCategory: (id: string, patch: Partial<ExpenseCategory>) => void;
  deleteExpenseCategory: (id: string) => { ok: boolean; reason?: string };

  logExpenseReport: (entry: {
    kind: ExpenseReportKind;
    rangeFrom: string;
    rangeTo: string;
    filters?: Record<string, unknown>;
    rowCount?: number;
    total?: number;
    exportedFile?: string;
  }) => ExpenseReportLog;

  recordSale: (items: SaleItem[], method: Sale["method"], opts?: {
    channel?: SaleChannel;
    customer?: string;
    notes?: string;
  }) => Sale;
  archiveSale: (id: string) => void;
  restoreSale: (id: string) => void;
  deleteSale: (id: string) => void;

  logSalesReport: (entry: {
    kind: SalesReportKind;
    rangeFrom: string;
    rangeTo: string;
    filters?: Record<string, unknown>;
    rowCount?: number;
    exportedFile?: string;
  }) => SalesReportLog;

  clockIn: (employee: string) => void;
  clockOut: (id: string) => void;

  resetDemo: () => void;
}

const initial = () => {
  const products = seedProducts();
  const history = seedInventoryHistory(products);
  return {
    products,
    inventoryCategories: seedInventoryCategories,
    salesCategories: seedSalesCategories,
    transactions: history.transactions,
    ledger: history.ledger,
    auditLogs: history.audit,
    // Expenses start empty — subscriber enters their own data
    expenses: [] as Expense[],
    expenseCategories: seedExpenseCategories(),
    expenseAuditLogs: [] as ExpenseAuditEntry[],
    expenseReports: [] as ExpenseReportLog[],
    // Seeded demo sales so the Sales dashboard + charts render with data in
    // mock mode (matches the README: "all module data is seeded").
    sales: seedSales(products),
    salesReports: [] as SalesReportLog[],
    salesAuditLogs: [] as SaleAuditEntry[],
    attendance: seedAttendance,
    team: ["Maria Santos", "David Cruz", "Aisha Rahman", "Liam O'Brien", "Noah Kim"],
  };
};

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set, get) => ({
      ...initial(),

      // ----- Products ----------------------------------------------------------
      addProduct: (draft) => {
        const now = new Date().toISOString();
        const product: Product = {
          id: uid("p"),
          sku: draft.sku,
          name: draft.name,
          description: draft.description,
          imageUrl: draft.imageUrl,
          unitOfMeasure: draft.unitOfMeasure ?? "pc",
          categoryId: draft.categoryId ?? null,
          onHand: 0,
          reorderPoint: draft.reorderPoint ?? 10,
          reorderQty: draft.reorderQty ?? 20,
          cost: draft.cost,
          price: draft.price,
          status: "ACTIVE",
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          products: [product, ...s.products],
          auditLogs: [
            {
              id: uid("aud"),
              action: "PRODUCT_CREATED",
              entityType: "product",
              entityId: product.id,
              entityLabel: product.name,
              user: DEMO_USER,
              createdAt: now,
            },
            ...s.auditLogs,
          ],
        }));
        if (draft.openingStock && draft.openingStock > 0) {
          get().recordStockMovement({
            productId: product.id,
            type: "STOCK_IN",
            quantity: draft.openingStock,
            reason: "Opening stock",
            reference: "OPENING",
          });
        }
        return product;
      },

      updateProduct: (id, patch) => {
        const now = new Date().toISOString();
        set((s) => {
          const before = s.products.find((p) => p.id === id);
          if (!before) return s;
          if (before.status === "ARCHIVED") return s;
          const after: Product = { ...before, ...patch, updatedAt: now };
          return {
            products: s.products.map((p) => (p.id === id ? after : p)),
            auditLogs: [
              {
                id: uid("aud"),
                action: "PRODUCT_UPDATED",
                entityType: "product",
                entityId: id,
                entityLabel: after.name,
                user: DEMO_USER,
                metadata: { changes: patch },
                createdAt: now,
              },
              ...s.auditLogs,
            ],
          };
        });
      },

      archiveProduct: (id) => {
        const now = new Date().toISOString();
        set((s) => {
          const product = s.products.find((p) => p.id === id);
          if (!product) return s;
          return {
            products: s.products.map((p) =>
              p.id === id ? { ...p, status: "ARCHIVED", archivedAt: now } : p,
            ),
            auditLogs: [
              {
                id: uid("aud"),
                action: "PRODUCT_ARCHIVED",
                entityType: "product",
                entityId: id,
                entityLabel: product.name,
                user: DEMO_USER,
                createdAt: now,
              },
              ...s.auditLogs,
            ],
          };
        });
      },

      restoreProduct: (id) => {
        const now = new Date().toISOString();
        set((s) => {
          const product = s.products.find((p) => p.id === id);
          if (!product) return s;
          return {
            products: s.products.map((p) =>
              p.id === id ? { ...p, status: "ACTIVE", archivedAt: null } : p,
            ),
            auditLogs: [
              {
                id: uid("aud"),
                action: "PRODUCT_RESTORED",
                entityType: "product",
                entityId: id,
                entityLabel: product.name,
                user: DEMO_USER,
                createdAt: now,
              },
              ...s.auditLogs,
            ],
          };
        });
      },

      deleteProduct: (id) => {
        const state = get();
        const product = state.products.find((p) => p.id === id);
        if (!product) return { ok: false, reason: "Not found" };
        // Hard delete — remove the product and its stock history/ledger so no
        // orphaned records remain. (Archive-first flow means this only happens
        // from the Archived view.)
        const now = new Date().toISOString();
        set((s) => ({
          products: s.products.filter((p) => p.id !== id),
          transactions: s.transactions.filter((t) => t.productId !== id),
          ledger: s.ledger.filter((l) => l.productId !== id),
          auditLogs: [
            {
              id: uid("aud"),
              action: "PRODUCT_DELETED",
              entityType: "product",
              entityId: id,
              entityLabel: product.name,
              user: DEMO_USER,
              createdAt: now,
            },
            ...s.auditLogs,
          ],
        }));
        return { ok: true };
      },

      // ----- Stock movements ---------------------------------------------------
      recordStockMovement: (m) => {
        const state = get();
        const product = state.products.find((p) => p.id === m.productId);
        if (!product) return { ok: false, reason: "Product not found" };
        if (product.status === "ARCHIVED") {
          return { ok: false, reason: "Cannot move stock for an archived product" };
        }

        let signed: number;
        let magnitude: number;
        let action: AuditActionType;
        switch (m.type) {
          case "STOCK_IN":
            magnitude = Math.abs(m.quantity);
            signed = magnitude;
            action = "STOCK_IN";
            break;
          case "STOCK_OUT":
            magnitude = Math.abs(m.quantity);
            signed = -magnitude;
            action = "STOCK_OUT";
            break;
          case "ADJUSTMENT":
            signed = m.quantity;
            magnitude = Math.abs(m.quantity);
            action = "STOCK_ADJUSTMENT";
            break;
        }

        if (magnitude <= 0) return { ok: false, reason: "Quantity must be non-zero" };
        const newBalance = product.onHand + signed;
        if (newBalance < 0) {
          return { ok: false, reason: `Insufficient stock — only ${product.onHand} on hand` };
        }

        const now = new Date().toISOString();
        const txn: InventoryTransaction = {
          id: uid("itx"),
          productId: product.id,
          productName: product.name,
          type: m.type,
          quantity: magnitude,
          signedQty: signed,
          reason: m.reason,
          reference: m.reference ?? txnRef(),
          notes: m.notes,
          unitCost: product.cost,
          totalCost: product.cost * magnitude,
          user: DEMO_USER,
          occurredAt: now,
        };
        const sle: StockLedgerEntry = {
          id: uid("sle"),
          productId: product.id,
          transactionId: txn.id,
          qtyChange: signed,
          balanceAfter: newBalance,
          valueChange: signed * product.cost,
          postedAt: now,
        };
        const audit: AuditLogEntry = {
          id: uid("aud"),
          action,
          entityType: "product",
          entityId: product.id,
          entityLabel: product.name,
          user: DEMO_USER,
          metadata: {
            transactionId: txn.id,
            qtyChange: signed,
            balanceAfter: newBalance,
            reason: m.reason,
            reference: txn.reference,
          },
          createdAt: now,
        };

        set((s) => ({
          products: s.products.map((p) =>
            p.id === product.id ? { ...p, onHand: newBalance, updatedAt: now } : p,
          ),
          transactions: [txn, ...s.transactions],
          ledger: [sle, ...s.ledger],
          auditLogs: [audit, ...s.auditLogs],
        }));
        return { ok: true };
      },

      stockIn: (id, qty, opts) =>
        get().recordStockMovement({ productId: id, type: "STOCK_IN", quantity: qty, ...opts }),
      stockOut: (id, qty, opts) =>
        get().recordStockMovement({ productId: id, type: "STOCK_OUT", quantity: qty, ...opts }),
      adjustStock: (id, signedDelta, opts) =>
        get().recordStockMovement({ productId: id, type: "ADJUSTMENT", quantity: signedDelta, ...opts }),

      // ----- Inventory Categories ----------------------------------------------
      addInventoryCategory: ({ name, description, color }) => {
        const now = new Date().toISOString();
        const category: Category = {
          id: uid("icat"),
          name,
          slug: slugify(name),
          description,
          color,
          createdAt: now,
        };
        set((s) => ({
          inventoryCategories: [...s.inventoryCategories, category],
          auditLogs: [
            {
              id: uid("aud"),
              action: "INVENTORY_CATEGORY_CREATED",
              entityType: "inventoryCategory",
              entityId: category.id,
              entityLabel: category.name,
              user: DEMO_USER,
              createdAt: now,
            },
            ...s.auditLogs,
          ],
        }));
        return category;
      },

      updateInventoryCategory: (id, patch) => {
        const now = new Date().toISOString();
        set((s) => {
          const cat = s.inventoryCategories.find((c) => c.id === id);
          if (!cat) return s;
          const updated = { ...cat, ...patch, slug: patch.name ? slugify(patch.name) : cat.slug };
          return {
            inventoryCategories: s.inventoryCategories.map((c) => (c.id === id ? updated : c)),
            auditLogs: [
              {
                id: uid("aud"),
                action: "INVENTORY_CATEGORY_UPDATED",
                entityType: "inventoryCategory",
                entityId: id,
                entityLabel: updated.name,
                user: DEMO_USER,
                createdAt: now,
              },
              ...s.auditLogs,
            ],
          };
        });
      },

      deleteInventoryCategory: (id) => {
        const state = get();
        const cat = state.inventoryCategories.find((c) => c.id === id);
        if (!cat) return { ok: false, reason: "Not found" };
        const inUse = state.products.some((p) => p.categoryId === id);
        if (inUse) {
          return { ok: false, reason: `Category "${cat.name}" still has products. Reassign them first.` };
        }
        const now = new Date().toISOString();
        set((s) => ({
          inventoryCategories: s.inventoryCategories.filter((c) => c.id !== id),
          auditLogs: [
            {
              id: uid("aud"),
              action: "INVENTORY_CATEGORY_DELETED",
              entityType: "inventoryCategory",
              entityId: id,
              entityLabel: cat.name,
              user: DEMO_USER,
              createdAt: now,
            },
            ...s.auditLogs,
          ],
        }));
        return { ok: true };
      },

      // ----- Sales Categories --------------------------------------------------
      addSalesCategory: ({ name, description, color }) => {
        const now = new Date().toISOString();
        const category: Category = {
          id: uid("scat"),
          name,
          slug: slugify(name),
          description,
          color,
          createdAt: now,
        };
        set((s) => ({
          salesCategories: [...s.salesCategories, category],
          auditLogs: [
            {
              id: uid("aud"),
              action: "SALES_CATEGORY_CREATED",
              entityType: "salesCategory",
              entityId: category.id,
              entityLabel: category.name,
              user: DEMO_USER,
              createdAt: now,
            },
            ...s.auditLogs,
          ],
        }));
        return category;
      },

      updateSalesCategory: (id, patch) => {
        const now = new Date().toISOString();
        set((s) => {
          const cat = s.salesCategories.find((c) => c.id === id);
          if (!cat) return s;
          const updated = { ...cat, ...patch, slug: patch.name ? slugify(patch.name) : cat.slug };
          return {
            salesCategories: s.salesCategories.map((c) => (c.id === id ? updated : c)),
            auditLogs: [
              {
                id: uid("aud"),
                action: "SALES_CATEGORY_UPDATED",
                entityType: "salesCategory",
                entityId: id,
                entityLabel: updated.name,
                user: DEMO_USER,
                createdAt: now,
              },
              ...s.auditLogs,
            ],
          };
        });
      },

      deleteSalesCategory: (id) => {
        const state = get();
        const cat = state.salesCategories.find((c) => c.id === id);
        if (!cat) return { ok: false, reason: "Not found" };
        const inUse = state.sales.some((s) => s.items.some((i) => i.salesCategoryId === id));
        if (inUse) {
          return { ok: false, reason: `Category "${cat.name}" is used in existing sales. Reassign them first.` };
        }
        const now = new Date().toISOString();
        set((s) => ({
          salesCategories: s.salesCategories.filter((c) => c.id !== id),
          auditLogs: [
            {
              id: uid("aud"),
              action: "SALES_CATEGORY_DELETED",
              entityType: "salesCategory",
              entityId: id,
              entityLabel: cat.name,
              user: DEMO_USER,
              createdAt: now,
            },
            ...s.auditLogs,
          ],
        }));
        return { ok: true };
      },

      // ----- Expenses — fully STANDALONE ---------------------------------------
      addExpense: (draft) => {
        const now = new Date().toISOString();
        const expense: Expense = {
          id: uid("e"),
          title: draft.title.trim(),
          categoryId: draft.categoryId ?? null,
          amount: draft.amount,
          vendor: draft.vendor?.trim() || undefined,
          description: draft.description?.trim() || undefined,
          notes: draft.notes?.trim() || undefined,
          date: draft.date ?? now,
          createdAt: now,
          updatedAt: now,
          createdBy: DEMO_USER,
        };
        set((s) => ({
          expenses: [expense, ...s.expenses],
          expenseAuditLogs: [
            {
              id: uid("eaud"),
              action: "EXPENSE_CREATED",
              entityType: "expense",
              entityId: expense.id,
              entityLabel: expense.title,
              user: DEMO_USER,
              metadata: { amount: expense.amount, categoryId: expense.categoryId },
              createdAt: now,
            },
            ...s.expenseAuditLogs,
          ],
        }));
        return expense;
      },

      updateExpense: (id, patch) => {
        const now = new Date().toISOString();
        set((s) => {
          const before = s.expenses.find((e) => e.id === id);
          if (!before || before.deletedAt) return s;
          const after: Expense = {
            ...before,
            ...patch,
            title: patch.title?.trim() ?? before.title,
            categoryId: patch.categoryId === undefined ? before.categoryId : patch.categoryId,
            vendor: patch.vendor?.trim() ?? before.vendor,
            description: patch.description?.trim() ?? before.description,
            notes: patch.notes?.trim() ?? before.notes,
            updatedAt: now,
            updatedBy: DEMO_USER,
          };
          return {
            expenses: s.expenses.map((e) => (e.id === id ? after : e)),
            expenseAuditLogs: [
              {
                id: uid("eaud"),
                action: "EXPENSE_UPDATED",
                entityType: "expense",
                entityId: id,
                entityLabel: after.title,
                user: DEMO_USER,
                metadata: { changes: patch },
                createdAt: now,
              },
              ...s.expenseAuditLogs,
            ],
          };
        });
      },

      deleteExpense: (id) => {
        const now = new Date().toISOString();
        set((s) => {
          const expense = s.expenses.find((e) => e.id === id);
          if (!expense || expense.deletedAt) return s;
          return {
            expenses: s.expenses.map((e) =>
              e.id === id ? { ...e, deletedAt: now, updatedAt: now } : e,
            ),
            expenseAuditLogs: [
              {
                id: uid("eaud"),
                action: "EXPENSE_DELETED",
                entityType: "expense",
                entityId: id,
                entityLabel: expense.title,
                user: DEMO_USER,
                metadata: { amount: expense.amount },
                createdAt: now,
              },
              ...s.expenseAuditLogs,
            ],
          };
        });
      },

      restoreExpense: (id) => {
        const now = new Date().toISOString();
        set((s) => {
          const expense = s.expenses.find((e) => e.id === id);
          if (!expense || !expense.deletedAt) return s;
          return {
            expenses: s.expenses.map((e) =>
              e.id === id ? { ...e, deletedAt: null, updatedAt: now } : e,
            ),
            expenseAuditLogs: [
              {
                id: uid("eaud"),
                action: "EXPENSE_RESTORED",
                entityType: "expense",
                entityId: id,
                entityLabel: expense.title,
                user: DEMO_USER,
                createdAt: now,
              },
              ...s.expenseAuditLogs,
            ],
          };
        });
      },

      purgeExpense: (id) => {
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
      },

      addExpenseCategory: ({ name, description, color }) => {
        const now = new Date().toISOString();
        const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "category";
        const cat: ExpenseCategory = {
          id: uid("ecat"),
          name: name.trim(),
          slug,
          description,
          color: color ?? "#9ca3af",
          isDefault: false,
          createdAt: now,
        };
        set((s) => ({
          expenseCategories: [...s.expenseCategories, cat],
          expenseAuditLogs: [
            {
              id: uid("eaud"),
              action: "EXPENSE_CATEGORY_CREATED",
              entityType: "expenseCategory",
              entityId: cat.id,
              entityLabel: cat.name,
              user: DEMO_USER,
              createdAt: now,
            },
            ...s.expenseAuditLogs,
          ],
        }));
        return cat;
      },

      updateExpenseCategory: (id, patch) => {
        const now = new Date().toISOString();
        set((s) => {
          const cat = s.expenseCategories.find((c) => c.id === id);
          if (!cat) return s;
          const updated: ExpenseCategory = {
            ...cat,
            ...patch,
            id: cat.id,
            slug: patch.name
              ? patch.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
              : cat.slug,
          };
          return {
            expenseCategories: s.expenseCategories.map((c) => (c.id === id ? updated : c)),
            expenseAuditLogs: [
              {
                id: uid("eaud"),
                action: "EXPENSE_CATEGORY_UPDATED",
                entityType: "expenseCategory",
                entityId: id,
                entityLabel: updated.name,
                user: DEMO_USER,
                createdAt: now,
              },
              ...s.expenseAuditLogs,
            ],
          };
        });
      },

      deleteExpenseCategory: (id) => {
        const state = get();
        const cat = state.expenseCategories.find((c) => c.id === id);
        if (!cat) return { ok: false, reason: "Category not found" };
        const inUse = state.expenses.some((e) => !e.deletedAt && e.categoryId === id);
        if (inUse) {
          return { ok: false, reason: `Category "${cat.name}" is used by active expenses. Reassign them first.` };
        }
        const now = new Date().toISOString();
        set((s) => ({
          expenseCategories: s.expenseCategories.filter((c) => c.id !== id),
          expenseAuditLogs: [
            {
              id: uid("eaud"),
              action: "EXPENSE_CATEGORY_DELETED",
              entityType: "expenseCategory",
              entityId: id,
              entityLabel: cat.name,
              user: DEMO_USER,
              createdAt: now,
            },
            ...s.expenseAuditLogs,
          ],
        }));
        return { ok: true };
      },

      logExpenseReport: (entry) => {
        const now = new Date().toISOString();
        const log: ExpenseReportLog = {
          id: uid("erep"),
          kind: entry.kind,
          rangeFrom: entry.rangeFrom,
          rangeTo: entry.rangeTo,
          filters: entry.filters,
          rowCount: entry.rowCount,
          total: entry.total,
          exportedFile: entry.exportedFile,
          user: DEMO_USER,
          createdAt: now,
        };
        set((s) => ({ expenseReports: [log, ...s.expenseReports].slice(0, 200) }));
        return log;
      },

      // ----- Sales — fully independent -----------------------------------------
      recordSale: (items, method, opts) => {
        const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
        const cost = items.reduce((sum, i) => sum + (i.cost ?? 0) * i.qty, 0);
        const sale: Sale = {
          id: uid("s"),
          ref: txnRef(),
          items,
          total,
          cost,
          method,
          channel: opts?.channel ?? "POS",
          status: "COMPLETED",
          customer: opts?.customer,
          notes: opts?.notes,
          date: new Date().toISOString(),
          archivedAt: null,
        };
        set((s) => ({
          sales: [sale, ...s.sales],
          salesAuditLogs: [
            {
              id: uid("saud"),
              action: "SALE_CREATED",
              entityId: sale.id,
              entityLabel: sale.ref,
              user: DEMO_USER,
              createdAt: sale.date,
            },
            ...s.salesAuditLogs,
          ],
        }));
        return sale;
      },

      archiveSale: (id) => {
        const now = new Date().toISOString();
        set((s) => {
          const sale = s.sales.find((x) => x.id === id);
          if (!sale) return s;
          return {
            sales: s.sales.map((x) =>
              x.id === id ? { ...x, archivedAt: now } : x,
            ),
            salesAuditLogs: [
              { id: uid("saud"), action: "SALE_ARCHIVED", entityId: id, entityLabel: sale.ref, user: DEMO_USER, createdAt: now },
              ...s.salesAuditLogs,
            ],
          };
        });
      },

      restoreSale: (id) => {
        const now = new Date().toISOString();
        set((s) => {
          const sale = s.sales.find((x) => x.id === id);
          if (!sale) return s;
          return {
            sales: s.sales.map((x) =>
              x.id === id ? { ...x, archivedAt: null } : x,
            ),
            salesAuditLogs: [
              { id: uid("saud"), action: "SALE_RESTORED", entityId: id, entityLabel: sale.ref, user: DEMO_USER, createdAt: now },
              ...s.salesAuditLogs,
            ],
          };
        });
      },

      deleteSale: (id) => {
        const now = new Date().toISOString();
        set((s) => {
          const sale = s.sales.find((x) => x.id === id);
          if (!sale) return s;
          return {
            sales: s.sales.filter((x) => x.id !== id),
            salesAuditLogs: [
              { id: uid("saud"), action: "SALE_DELETED", entityId: id, entityLabel: sale.ref, user: DEMO_USER, createdAt: now },
              ...s.salesAuditLogs,
            ],
          };
        });
      },

      logSalesReport: (entry) => {
        const log: SalesReportLog = {
          id: uid("rep"),
          kind: entry.kind,
          rangeFrom: entry.rangeFrom,
          rangeTo: entry.rangeTo,
          filters: entry.filters,
          rowCount: entry.rowCount,
          exportedFile: entry.exportedFile,
          user: DEMO_USER,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ salesReports: [log, ...s.salesReports].slice(0, 200) }));
        return log;
      },

      // ----- Attendance --------------------------------------------------------
      clockIn: (employee) =>
        set((s) => ({
          attendance: [
            {
              id: uid("a"),
              employee,
              date: new Date().toISOString(),
              timeIn: new Date().toISOString(),
              timeOut: null,
            },
            ...s.attendance,
          ],
        })),

      clockOut: (id) =>
        set((s) => ({
          attendance: s.attendance.map((a) =>
            a.id === id ? { ...a, timeOut: new Date().toISOString() } : a,
          ),
        })),

      resetDemo: () => set(initial()),
    }),
    {
      name: "solaris-business",
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as BusinessState;
        // v0 persisted an empty sales list; backfill seeded demo sales so the
        // Sales dashboard and charts render with data for existing visitors.
        if (
          version < 1 &&
          state &&
          Array.isArray(state.products) &&
          (!state.sales || state.sales.length === 0)
        ) {
          state.sales = seedSales(state.products);
        }
        return state;
      },
    },
  ),
);

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export interface InventoryStats {
  totalProducts: number;
  totalUnits: number;
  inventoryValue: number;
  lowStockCount: number;
  recentMovements30d: number;
}

export function computeInventoryStats(state: BusinessState): InventoryStats {
  const active = state.products.filter((p) => p.status === "ACTIVE");
  const cutoff = Date.now() - 30 * 86400000;
  return {
    totalProducts: active.length,
    totalUnits: active.reduce((sum, p) => sum + p.onHand, 0),
    inventoryValue: active.reduce((sum, p) => sum + p.cost * p.onHand, 0),
    lowStockCount: active.filter((p) => p.onHand <= p.reorderPoint).length,
    recentMovements30d: state.transactions.filter(
      (t) => +new Date(t.occurredAt) >= cutoff,
    ).length,
  };
}