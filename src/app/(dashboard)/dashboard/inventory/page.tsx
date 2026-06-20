"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Boxes,
  PackageCheck,
  AlertTriangle,
  Wallet,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  Tag,
  TrendingUp,
  TrendingDown,
  History,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
} from "lucide-react";
import { ModuleGate } from "@/components/dashboard/module-gate";
import { ModuleHeader, StatCard } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useBusinessStore,
  type Product,
  type InventoryTransaction,
  type Category,
  computeInventoryStats,
} from "@/lib/store/business-store";
import { formatCurrency, cn } from "@/lib/utils";

export default function InventoryPage() {
  return (
    <ModuleGate serviceId="inventory">
      <InventoryModule />
    </ModuleGate>
  );
}

const emptyProductDraft = {
  name: "",
  sku: "",
  categoryId: null as string | null,
  unitOfMeasure: "pc",
  price: 0,
  cost: 0,
  openingStock: 0,
  reorderPoint: 10,
  reorderQty: 20,
  description: "",
};

const emptyCategoryDraft = {
  name: "",
  description: "",
  color: "#C98A3C",
};

function InventoryModule() {
  const store = useBusinessStore();
  const {
    products,
    inventoryCategories,
    transactions,
    addProduct,
    updateProduct,
    archiveProduct,
    restoreProduct,
    deleteProduct,
    stockIn,
    stockOut,
    addInventoryCategory,
    updateInventoryCategory,
    deleteInventoryCategory,
  } = store;

  const stats = computeInventoryStats(store);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusTab, setStatusTab] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productDraft, setProductDraft] = useState(emptyProductDraft);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<typeof emptyCategoryDraft & { id?: string } | null>(null);
  const [categoryDraft, setCategoryDraft] = useState(emptyCategoryDraft);

  const [stockTarget, setStockTarget] = useState<{ product: Product; mode: "in" | "out" } | null>(null);
  const [stockQty, setStockQty] = useState("1");
  const [stockReason, setStockReason] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [allHistoryOpen, setAllHistoryOpen] = useState(false);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesStatus = p.status === statusTab;
      const matchesQuery =
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku.toLowerCase().includes(query.toLowerCase());
      const matchesCat = categoryFilter === "all" || p.categoryId === categoryFilter;
      return matchesStatus && matchesQuery && matchesCat;
    });
  }, [products, statusTab, query, categoryFilter]);

  const lowStockProducts = products.filter(
    (p) => p.status === "ACTIVE" && p.onHand <= p.reorderPoint,
  );

  const productHistory = useMemo(() => {
    if (!historyProduct) return [];
    return transactions
      .filter((t) => t.productId === historyProduct.id)
      .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  }, [transactions, historyProduct]);

  const allHistory = useMemo(() => {
    return [...transactions].sort(
      (a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt),
    );
  }, [transactions]);

  function openCreate() {
    setEditingProduct(null);
    setProductDraft(emptyProductDraft);
    setProductDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditingProduct(p);
    setProductDraft({
      name: p.name,
      sku: p.sku,
      categoryId: p.categoryId,
      unitOfMeasure: p.unitOfMeasure,
      price: p.price,
      cost: p.cost,
      openingStock: p.onHand,
      reorderPoint: p.reorderPoint,
      reorderQty: p.reorderQty,
      description: p.description ?? "",
    });
    setProductDialogOpen(true);
  }

  function saveProduct() {
    if (!productDraft.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: productDraft.name,
        sku: productDraft.sku,
        categoryId: productDraft.categoryId,
        unitOfMeasure: productDraft.unitOfMeasure,
        price: productDraft.price,
        cost: productDraft.cost,
        reorderPoint: productDraft.reorderPoint,
        reorderQty: productDraft.reorderQty,
        description: productDraft.description,
      });
      toast.success("Product updated");
    } else {
      addProduct({
        name: productDraft.name,
        sku: productDraft.sku,
        categoryId: productDraft.categoryId,
        unitOfMeasure: productDraft.unitOfMeasure,
        price: productDraft.price,
        cost: productDraft.cost,
        reorderPoint: productDraft.reorderPoint,
        reorderQty: productDraft.reorderQty,
        description: productDraft.description,
        openingStock: productDraft.openingStock,
      });
      toast.success("Product added");
    }
    setProductDialogOpen(false);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const result = deleteProduct(deleteTarget.id);
    if (result.ok) {
      toast.success("Product deleted");
    } else {
      toast.error(result.reason ?? "Cannot delete product");
    }
    setDeleteTarget(null);
  }

  function confirmStock() {
    if (!stockTarget) return;
    const qty = parseInt(stockQty) || 0;
    if (qty <= 0) {
      toast.error("Quantity must be at least 1");
      return;
    }
    const result =
      stockTarget.mode === "in"
        ? stockIn(stockTarget.product.id, qty, { reason: stockReason || "Manual stock in" })
        : stockOut(stockTarget.product.id, qty, { reason: stockReason || "Manual stock out" });

    if (result.ok) {
      toast.success(
        `${stockTarget.mode === "in" ? "Stocked in" : "Stocked out"} ${qty} × ${stockTarget.product.name}`,
      );
    } else {
      toast.error(result.reason ?? "Stock movement failed");
    }
    setStockTarget(null);
    setStockQty("1");
    setStockReason("");
  }

  function openCreateCategory() {
    setEditingCategory(null);
    setCategoryDraft(emptyCategoryDraft);
    setCategoryDialogOpen(true);
  }

  function openEditCategory(c: Category) {
    setEditingCategory({ id: c.id, name: c.name, description: c.description ?? "", color: c.color ?? "#C98A3C" });
    setCategoryDraft({ name: c.name, description: c.description ?? "", color: c.color ?? "#C98A3C" });
  }

  function saveCategory() {
    if (!categoryDraft.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    if (editingCategory?.id) {
      updateInventoryCategory(editingCategory.id, categoryDraft);
      toast.success("Category updated");
    } else {
      addInventoryCategory(categoryDraft);
      toast.success("Category added");
    }
    setEditingCategory(null);
    setCategoryDraft(emptyCategoryDraft);
  }

  function handleDeleteCategory(id: string) {
    const result = deleteInventoryCategory(id);
    if (result.ok) {
      toast.success("Category deleted");
    } else {
      toast.error(result.reason ?? "Cannot delete category");
    }
  }

  function handlePrintInventory() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const activeProducts = products.filter((p) => p.status === "ACTIVE");
    const now = new Date().toLocaleString("en-PH", {
      dateStyle: "long",
      timeStyle: "short",
    });

    const rows = activeProducts.map((p) => {
      const cat = inventoryCategories.find((c) => c.id === p.categoryId);
      const low = p.onHand <= p.reorderPoint;
      return `
        <tr>
          <td>${p.name}</td>
          <td>${p.sku || "—"}</td>
          <td>${cat?.name ?? "—"}</td>
          <td style="text-align:right">${p.onHand} ${p.unitOfMeasure}</td>
          <td style="text-align:right">${formatCurrency(p.price)}</td>
          <td style="text-align:right">${formatCurrency(p.cost * p.onHand)}</td>
          <td style="text-align:center;color:${low ? "#d97706" : "#16a34a"}">${low ? "⚠ Low" : "OK"}</td>
        </tr>
      `;
    }).join("");

    const totalValue = activeProducts.reduce((s, p) => s + p.cost * p.onHand, 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Report — Solaris Diamond</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', system-ui, sans-serif; color: #1a1a1a; padding: 40px; font-size: 13px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; }
          .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
          .brand span { color: #C98A3C; }
          .meta { text-align: right; color: #666; font-size: 11px; line-height: 1.6; }
          h2 { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #f5f5f5; text-align: left; padding: 8px 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #666; border-bottom: 1px solid #e0e0e0; }
          td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
          tr:last-child td { border-bottom: none; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
          .stat { border: 1px solid #e0e0e0; padding: 14px 16px; border-radius: 8px; }
          .stat-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
          .stat-value { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
          .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e0e0e0; font-size: 11px; color: #999; text-align: center; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">Solaris <span>Diamond</span></div>
            <div style="color:#666;font-size:12px;margin-top:4px;">Inventory Management System</div>
          </div>
          <div class="meta">
            <div><strong>Inventory Report</strong></div>
            <div>Generated: ${now}</div>
            <div>Status: Active Products Only</div>
          </div>
        </div>
        <div class="summary">
          <div class="stat">
            <div class="stat-label">Total Products</div>
            <div class="stat-value">${activeProducts.length}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Total Units</div>
            <div class="stat-value">${activeProducts.reduce((s, p) => s + p.onHand, 0).toLocaleString()}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Inventory Value</div>
            <div class="stat-value">${formatCurrency(totalValue)}</div>
          </div>
        </div>
        <h2>Product Inventory</h2>
        <table>
          <thead>
            <tr>
              <th>Product</th><th>SKU</th><th>Category</th>
              <th style="text-align:right">On Hand</th>
              <th style="text-align:right">Unit Price</th>
              <th style="text-align:right">Total Value</th>
              <th style="text-align:center">Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="font-weight:600;padding-top:12px">Total Inventory Value</td>
              <td style="text-align:right;font-weight:700;padding-top:12px">${formatCurrency(totalValue)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        <div class="footer">Solaris Diamond — Confidential. · Generated ${now}</div>
        <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  function handlePrintProductHistory(p: Product, history: InventoryTransaction[]) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const now = new Date().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" });
    const rows = history.map((t) => {
      const isIn = t.type === "STOCK_IN";
      const isAdj = t.type === "ADJUSTMENT";
      const color = isIn ? "#16a34a" : isAdj ? "#2563eb" : "#dc2626";
      const sign = t.signedQty > 0 ? "+" : "";
      return `<tr>
        <td>${new Date(t.occurredAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</td>
        <td><span style="color:${color};font-weight:600">${t.type.replace("_", " ")}</span></td>
        <td style="color:${color};font-weight:600;text-align:right">${sign}${t.signedQty} ${p.unitOfMeasure}</td>
        <td>${t.reason ?? "—"}</td><td>${t.reference ?? "—"}</td>
        <td style="text-align:right">${formatCurrency(t.totalCost)}</td>
        <td>${t.user}</td>
      </tr>`;
    }).join("");
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${p.name} — Movement History</title>
      <style>* { margin:0;padding:0;box-sizing:border-box; } body { font-family:'Inter',system-ui,sans-serif;color:#1a1a1a;padding:40px;font-size:13px; }
      .header { display:flex;justify-content:space-between;margin-bottom:32px;border-bottom:2px solid #1a1a1a;padding-bottom:16px; }
      .brand { font-size:20px;font-weight:700; } .brand span { color:#C98A3C; }
      table { width:100%;border-collapse:collapse; } th { background:#f5f5f5;text-align:left;padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#666;border-bottom:1px solid #e0e0e0; }
      td { padding:8px 10px;border-bottom:1px solid #f0f0f0; } .footer { margin-top:32px;padding-top:12px;border-top:1px solid #e0e0e0;font-size:11px;color:#999;text-align:center; }
      </style></head><body>
      <div class="header"><div><div class="brand">Solaris <span>Diamond</span></div></div>
      <div style="text-align:right;font-size:11px;color:#666"><strong>${p.name}</strong><br>Generated: ${now}<br>${history.length} transactions</div></div>
      <table><thead><tr><th>Date & Time</th><th>Type</th><th style="text-align:right">Qty</th><th>Reason</th><th>Reference</th><th style="text-align:right">Value</th><th>By</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">Solaris Diamond — Confidential. · Generated ${now}</div>
      <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
      </body></html>`);
    printWindow.document.close();
  }

  const getCategoryName = (id: string | null) =>
    id ? inventoryCategories.find((c) => c.id === id)?.name ?? null : null;

  const getCategoryColor = (id: string | null) =>
    id ? inventoryCategories.find((c) => c.id === id)?.color ?? null : null;

  return (
    <div className="mx-auto max-w-6xl">
      <ModuleHeader
        title="Inventory"
        description="Track products, stock movement and low-stock alerts."
      >
        <Button variant="outline" onClick={handlePrintInventory}>
          <Printer className="size-4" /> Print Report
        </Button>
        <Button variant="outline" onClick={() => setAllHistoryOpen(true)}>
          <History className="size-4" /> All History
        </Button>
        <Button variant="outline" onClick={openCreateCategory}>
          <Tag className="size-4" /> Manage Categories
        </Button>
        <Button variant="accent" onClick={openCreate}>
          <Plus className="size-4" /> Add Product
        </Button>
      </ModuleHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Products" value={String(stats.totalProducts)} icon={Boxes} index={0} />
        <StatCard label="Units in Stock" value={stats.totalUnits.toLocaleString()} icon={PackageCheck} index={1} />
        <StatCard label="Inventory Value" value={formatCurrency(stats.inventoryValue)} icon={Wallet} index={2} />
        <StatCard label="Low Stock" value={String(stats.lowStockCount)} icon={AlertTriangle} hint="need reorder" index={3} />
      </div>

      {lowStockProducts.length > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="flex-1 text-sm">
            <span className="font-medium">
              {lowStockProducts.length} product{lowStockProducts.length > 1 ? "s are" : " is"} low on stock:
            </span>{" "}
            <span className="text-muted-foreground">
              {lowStockProducts.map((p) => p.name).join(", ")}
            </span>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as "ACTIVE" | "ARCHIVED")}>
          <TabsList>
            <TabsTrigger value="ACTIVE">Active</TabsTrigger>
            <TabsTrigger value="ARCHIVED">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products or SKU…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {inventoryCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid">
          <span>Product</span>
          <span>Category</span>
          <span>Price</span>
          <span>Stock</span>
          <span>Quick Stock</span>
          <span className="text-right">Actions</span>
        </div>

        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No products found.
          </div>
        )}

        {filtered.map((p) => {
          const low = p.onHand <= p.reorderPoint;
          const catName = getCategoryName(p.categoryId);
          const catColor = getCategoryColor(p.categoryId);
          return (
            <div
              key={p.id}
              className="grid grid-cols-2 items-center gap-3 border-b border-border px-5 py-3.5 text-sm last:border-0 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] md:gap-4"
            >
              <div className="col-span-2 md:col-span-1">
                <p className="font-medium">{p.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{p.sku || "—"}</p>
                {p.status === "ARCHIVED" && (
                  <Badge variant="muted" className="mt-1 text-[10px]">Archived</Badge>
                )}
              </div>
              <div className="hidden md:block">
                {catName ? (
                  <Badge variant="secondary" className="gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: catColor ?? "#888" }} />
                    {catName}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
              <div className="font-medium">{formatCurrency(p.price)}</div>
              <div className="flex items-center gap-2">
                <span className={cn("font-medium tabular-nums", low && p.status === "ACTIVE" && "text-warning")}>
                  {p.onHand}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">{p.unitOfMeasure}</span>
                </span>
                {low && p.status === "ACTIVE" && (
                  <Badge variant="warning" className="text-[10px]">Low</Badge>
                )}
              </div>
              <div className="hidden items-center gap-1.5 md:flex">
                {p.status === "ACTIVE" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs text-success hover:border-success/40 hover:bg-success/10 hover:text-success"
                      onClick={() => { setStockTarget({ product: p, mode: "in" }); setStockQty("1"); setStockReason(""); }}
                    >
                      <TrendingUp className="size-3" /> In
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs text-destructive hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => { setStockTarget({ product: p, mode: "out" }); setStockQty("1"); setStockReason(""); }}
                    >
                      <TrendingDown className="size-3" /> Out
                    </Button>
                  </>
                )}
              </div>
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setHistoryProduct(p)}>
                      <History className="size-4" /> View History
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {p.status === "ACTIVE" && (
                      <>
                        <DropdownMenuItem onClick={() => { setStockTarget({ product: p, mode: "in" }); setStockQty("1"); setStockReason(""); }}>
                          <ArrowUp className="size-4" /> Stock in
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setStockTarget({ product: p, mode: "out" }); setStockQty("1"); setStockReason(""); }}>
                          <ArrowDown className="size-4" /> Stock out
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          <Pencil className="size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { archiveProduct(p.id); toast.success("Product archived"); }}>
                          <Archive className="size-4" /> Archive
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {p.status === "ARCHIVED" && (
                      <>
                        <DropdownMenuItem onClick={() => { restoreProduct(p.id); toast.success("Product restored"); }}>
                          <RotateCcw className="size-4" /> Restore
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(p)}
                    >
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      {/* All History Drawer */}
      <Sheet open={allHistoryOpen} onOpenChange={setAllHistoryOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-2xl" side="right">
          <SheetHeader className="border-b border-border pb-4">
            <SheetTitle>All Stock Movement</SheetTitle>
            <SheetDescription>
              {allHistory.length} total transaction{allHistory.length !== 1 ? "s" : ""} across all products
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {allHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
                <History className="size-8 opacity-30" />
                <p>No transactions yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0 px-6">
                {allHistory.map((t, i) => {
                  const isIn = t.type === "STOCK_IN";
                  const isAdj = t.type === "ADJUSTMENT";
                  const sign = t.signedQty > 0 ? "+" : "";
                  const product = products.find((p) => p.id === t.productId);
                  return (
                    <div key={t.id} className="relative flex gap-4 pb-6 last:pb-0">
                      {i < allHistory.length - 1 && (
                        <div className="absolute left-[19px] top-8 h-full w-px bg-border" />
                      )}
                      <div className={cn(
                        "relative flex size-10 shrink-0 items-center justify-center rounded-full border",
                        isAdj
                          ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400"
                          : isIn
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-destructive/30 bg-destructive/10 text-destructive",
                      )}>
                        {isAdj ? <SlidersHorizontal className="size-4" /> : isIn ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                      </div>
                      <div className="flex-1 pt-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{product?.name ?? "Unknown Product"}</p>
                            <p className="text-xs text-muted-foreground">
                              {t.type === "STOCK_IN" ? "Stock In" : t.type === "STOCK_OUT" ? "Stock Out" : "Adjustment"}
                              {t.reason && ` · ${t.reason}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={cn("text-sm font-semibold tabular-nums", isAdj ? "text-blue-600 dark:text-blue-400" : isIn ? "text-success" : "text-destructive")}>
                              {sign}{t.signedQty} {product?.unitOfMeasure ?? ""}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(t.totalCost)}</p>
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{new Date(t.occurredAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</span>
                          <span>·</span>
                          <span>{t.user}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Per-Product History Drawer */}
      <Sheet open={!!historyProduct} onOpenChange={(o) => !o && setHistoryProduct(null)}>
        <SheetContent className="flex w-full flex-col sm:max-w-xl" side="right">
          <SheetHeader className="border-b border-border pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SheetTitle className="text-base">{historyProduct?.name}</SheetTitle>
                <SheetDescription className="mt-0.5 font-mono text-xs">
                  {historyProduct?.sku || "No SKU"} · {historyProduct?.onHand} {historyProduct?.unitOfMeasure} on hand
                </SheetDescription>
              </div>
              {historyProduct && (
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => handlePrintProductHistory(historyProduct, productHistory)}>
                  <Printer className="size-3.5" /> Print
                </Button>
              )}
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {productHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
                <History className="size-8 opacity-30" />
                <p>No movement history yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0 px-6">
                {productHistory.map((t, i) => {
                  const isIn = t.type === "STOCK_IN";
                  const isAdj = t.type === "ADJUSTMENT";
                  const sign = t.signedQty > 0 ? "+" : "";
                  return (
                    <div key={t.id} className="relative flex gap-4 pb-6 last:pb-0">
                      {i < productHistory.length - 1 && (
                        <div className="absolute left-[19px] top-8 h-full w-px bg-border" />
                      )}
                      <div className={cn(
                        "relative flex size-10 shrink-0 items-center justify-center rounded-full border",
                        isAdj
                          ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400"
                          : isIn
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-destructive/30 bg-destructive/10 text-destructive",
                      )}>
                        {isAdj ? <SlidersHorizontal className="size-4" /> : isIn ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                      </div>
                      <div className="flex-1 pt-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">
                              {t.type === "STOCK_IN" ? "Stock In" : t.type === "STOCK_OUT" ? "Stock Out" : "Adjustment"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t.reason ?? "—"}
                              {t.reference && <span className="ml-1.5 font-mono opacity-60">{t.reference}</span>}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={cn("text-sm font-semibold tabular-nums", isAdj ? "text-blue-600 dark:text-blue-400" : isIn ? "text-success" : "text-destructive")}>
                              {sign}{t.signedQty} {historyProduct?.unitOfMeasure}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(t.totalCost)}</p>
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{new Date(t.occurredAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</span>
                          <span>·</span>
                          <span>{t.user}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add / Edit Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
            <DialogDescription>
              {editingProduct ? "Update product details." : "Create a new product in your catalogue."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Product name</Label>
              <Input value={productDraft.name} onChange={(e) => setProductDraft({ ...productDraft, name: e.target.value })} placeholder="e.g. Single-Origin Beans 250g" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>SKU <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                <Input value={productDraft.sku} onChange={(e) => setProductDraft({ ...productDraft, sku: e.target.value })} placeholder="COF-SO-250" />
              </div>
              <div className="grid gap-1.5">
                <Label>Unit of Measure</Label>
                <Input value={productDraft.unitOfMeasure} onChange={(e) => setProductDraft({ ...productDraft, unitOfMeasure: e.target.value })} placeholder="pc, kg, btl…" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={productDraft.categoryId ?? "none"} onValueChange={(v) => setProductDraft({ ...productDraft, categoryId: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {inventoryCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: c.color ?? "#888" }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Description <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
              <Input value={productDraft.description} onChange={(e) => setProductDraft({ ...productDraft, description: e.target.value })} placeholder="Short product description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Price (₱)" value={productDraft.price} onChange={(v) => setProductDraft({ ...productDraft, price: v })} />
              <NumberField label="Cost (₱)" value={productDraft.cost} onChange={(v) => setProductDraft({ ...productDraft, cost: v })} />
            </div>
            <div className={cn("grid gap-3", !editingProduct ? "grid-cols-3" : "grid-cols-2")}>
              {!editingProduct && (
                <NumberField label="Opening Stock" value={productDraft.openingStock} onChange={(v) => setProductDraft({ ...productDraft, openingStock: v })} />
              )}
              <NumberField label="Reorder Point" value={productDraft.reorderPoint} onChange={(v) => setProductDraft({ ...productDraft, reorderPoint: v })} />
              <NumberField label="Reorder Qty" value={productDraft.reorderQty} onChange={(v) => setProductDraft({ ...productDraft, reorderQty: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={saveProduct}>{editingProduct ? "Save changes" : "Add product"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock In / Out Dialog */}
      <Dialog open={!!stockTarget} onOpenChange={(o) => !o && setStockTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {stockTarget?.mode === "in" ? <TrendingUp className="size-5 text-success" /> : <TrendingDown className="size-5 text-destructive" />}
              Stock {stockTarget?.mode === "in" ? "In" : "Out"}
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{stockTarget?.product.name}</span><br />
              Current stock: <span className="font-medium text-foreground">{stockTarget?.product.onHand} {stockTarget?.product.unitOfMeasure}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Quantity</Label>
              <Input inputMode="numeric" value={stockQty} onChange={(e) => setStockQty(e.target.value.replace(/[^0-9]/g, ""))} onFocus={(e) => e.target.select()} placeholder="Enter quantity" />
            </div>
            <div className="grid gap-1.5">
              <Label>Reason <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
              <Input value={stockReason} onChange={(e) => setStockReason(e.target.value)} placeholder={stockTarget?.mode === "in" ? "e.g. Restock delivery" : "e.g. Sale, damage…"} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockTarget(null)}>Cancel</Button>
            <Button variant="accent" onClick={confirmStock} className={cn(stockTarget?.mode === "in" ? "bg-success hover:bg-success/90" : "bg-destructive hover:bg-destructive/90")}>
              Confirm {stockTarget?.mode === "in" ? "Stock In" : "Stock Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
              This cannot be undone. If it has stock history, consider archiving it instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Yes, delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Manager Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
            <DialogDescription>Add, edit or delete your inventory categories.</DialogDescription>
          </DialogHeader>
          <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
            {inventoryCategories.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No categories yet.</p>}
            {inventoryCategories.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-2.5">
                <span className="size-3 shrink-0 rounded-full" style={{ background: c.color ?? "#888" }} />
                <span className="flex-1 text-sm font-medium">{c.name}</span>
                <Button variant="ghost" size="icon-sm" onClick={() => openEditCategory(c)}><Pencil className="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteCategory(c.id)}><Trash2 className="size-3.5" /></Button>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-sm font-medium">{editingCategory?.id ? "Edit category" : "New category"}</p>
            <div className="grid gap-3">
              <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                <div className="grid gap-1.5">
                  <Label>Name</Label>
                  <Input value={categoryDraft.name} onChange={(e) => setCategoryDraft({ ...categoryDraft, name: e.target.value })} placeholder="e.g. Beverages" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Color</Label>
                  <input type="color" value={categoryDraft.color} onChange={(e) => setCategoryDraft({ ...categoryDraft, color: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Description <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                <Input value={categoryDraft.description} onChange={(e) => setCategoryDraft({ ...categoryDraft, description: e.target.value })} placeholder="Short description" />
              </div>
            </div>
          </div>
          <DialogFooter>
            {editingCategory?.id && (
              <Button variant="ghost" onClick={() => { setEditingCategory(null); setCategoryDraft(emptyCategoryDraft); }}>Cancel edit</Button>
            )}
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Close</Button>
            <Button variant="accent" onClick={saveCategory}>{editingCategory?.id ? "Update category" : "Add category"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NumberField({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  const [raw, setRaw] = useState(String(value));
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input
        inputMode="decimal"
        value={raw}
        onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); setRaw(v); const num = parseFloat(v); if (!isNaN(num)) onChange(Math.max(min, num)); }}
        onFocus={(e) => e.target.select()}
        onBlur={() => { const num = parseFloat(raw); const clamped = isNaN(num) ? min : Math.max(min, num); setRaw(String(clamped)); onChange(clamped); }}
        placeholder="0"
      />
    </div>
  );
}