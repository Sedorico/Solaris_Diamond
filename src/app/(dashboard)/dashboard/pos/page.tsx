"use client";

import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Check,
  Printer,
  Receipt,
  History,
  Settings,
  Lock,
  Shield,
  X,
  Ban,
  LayoutGrid,
  List,
  Pencil,
  Banknote,
  ImageIcon,
  Package,
} from "lucide-react";
import { ModuleGate } from "@/components/dashboard/module-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/auth/hooks";
import {
  usePosStore,
  computePosStats,
  filterPosTransactions,
  type PosCartItem,
  type PosTransaction,
  type PosPaymentMethod,
  type PosProduct,
  type PosProductDraft,
} from "@/lib/store/pos-store";
import { formatCurrency, cn } from "@/lib/utils";

export default function PosPage() {
  return (
    <ModuleGate serviceId="pos">
      <PosModule />
    </ModuleGate>
  );
}

const PAYMENT_METHODS: PosPaymentMethod[] = ["Cash", "GCash", "Maya", "Card", "Bank"];

// ---------------------------------------------------------------------------
// Admin Password Gate
// ---------------------------------------------------------------------------

function AdminPinDialog({
  open,
  onOpenChange,
  onSuccess,
  title = "Admin verification required",
  description = "Enter your Solaris account password to access this area.",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}) {
  const verifyAccountPassword = (_candidate: string) => false;
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    if (verifyAccountPassword(pin)) {
      setPin("");
      setError("");
      onOpenChange(false);
      onSuccess();
    } else {
      setError("Incorrect password. Please try again.");
      setPin("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setPin(""); setError(""); onOpenChange(o); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="size-5 text-accent" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Account password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setPin(""); setError(""); onOpenChange(false); }}>Cancel</Button>
          <Button variant="accent" onClick={handleSubmit} disabled={pin.length < 1}>Verify</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Receipt Print
// ---------------------------------------------------------------------------

function printReceipt(txn: PosTransaction, settings: ReturnType<typeof usePosStore.getState>["settings"]) {
  const win = window.open("", "_blank");
  if (!win) return;
  const { receipt } = settings;
  const vatRate = settings.enableVat ? settings.vatRate : 0;
  const vatAmount = Math.round(txn.subtotal * (vatRate / 100));
  const now = new Date(txn.date).toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" });
  const rows = txn.items.map((i) => `
    <tr>
      <td>${i.qty}× ${i.name}</td>
      <td style="text-align:right">${formatCurrency(i.price)}</td>
      <td style="text-align:right">${formatCurrency(i.lineTotal)}</td>
    </tr>`).join("");

  win.document.write(`<!DOCTYPE html><html><head><title>Receipt ${txn.ref}</title>
  <style>
    * { margin:0;padding:0;box-sizing:border-box; }
    body { font-family:'Courier New',monospace;font-size:12px;color:#000;padding:16px;max-width:320px;margin:0 auto; }
    .center { text-align:center; }
    .divider { border-top:1px dashed #000;margin:8px 0; }
    table { width:100%;border-collapse:collapse; }
    td { padding:2px 0; }
    .bold { font-weight:700; }
    .total-row td { font-weight:700;font-size:14px;padding-top:4px; }
    @media print { body { padding:0; } }
  </style></head><body>
  <div class="center">
    <p class="bold" style="font-size:16px">${receipt.companyName}</p>
    <p>${receipt.address}</p>
    <p>${receipt.contactNumber}</p>
    ${receipt.headerMessage ? `<p style="margin-top:4px">${receipt.headerMessage}</p>` : ""}
  </div>
  <div class="divider"></div>
  <p>Receipt #: <strong>${txn.ref}</strong></p>
  <p>Date: ${now}</p>
  <p>Cashier: ${txn.cashier}</p>
  ${txn.customer ? `<p>Customer: ${txn.customer}</p>` : ""}
  <div class="divider"></div>
  <table>
    <thead><tr><td class="bold">Item</td><td class="bold" style="text-align:right">Price</td><td class="bold" style="text-align:right">Total</td></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="divider"></div>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">${formatCurrency(txn.subtotal)}</td></tr>
    ${vatRate > 0 ? `<tr><td>VAT (${vatRate}%)</td><td style="text-align:right">${formatCurrency(vatAmount)}</td></tr>` : ""}
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right">${formatCurrency(txn.total)}</td></tr>
    <tr><td>Paid via</td><td style="text-align:right">${txn.method}</td></tr>
    ${txn.cashReceived != null ? `<tr><td>Cash received</td><td style="text-align:right">${formatCurrency(txn.cashReceived)}</td></tr>` : ""}
    ${txn.change != null ? `<tr><td>Change</td><td style="text-align:right">${formatCurrency(txn.change)}</td></tr>` : ""}
  </table>
  <div class="divider"></div>
  <div class="center">
    <p>${receipt.thankYouMessage}</p>
    ${receipt.footerMessage ? `<p style="margin-top:4px;font-size:11px">${receipt.footerMessage}</p>` : ""}
  </div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
  </body></html>`);
  win.document.close();
}

// ---------------------------------------------------------------------------
// Main POS Module
// ---------------------------------------------------------------------------

function PosModule() {
  const posStore = usePosStore();
  const {
    posProducts,
    posCategories,
    transactions,
    settings,
    recordPosTransaction,
    voidTransaction,
    updateReceiptSettings,
    updateBrandingSettings,
    updatePosSettings,
  } = posStore;

  const stats = computePosStats(posStore);

  // Register state
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("pcat-all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [method, setMethod] = useState<PosPaymentMethod>(settings.defaultPaymentMethod);
  const [cashReceived, setCashReceived] = useState("");
  const [customer, setCustomer] = useState("");

  // Receipt dialog
  const [receiptTxn, setReceiptTxn] = useState<PosTransaction | null>(null);

  // History state
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState<"all" | "COMPLETED" | "VOIDED">("all");
  const [historyMethod, setHistoryMethod] = useState<PosPaymentMethod | "all">("all");
  const [voidTarget, setVoidTarget] = useState<PosTransaction | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [pinForVoid, setPinForVoid] = useState(false);

  // Settings state
  const [settingsTab, setSettingsTab] = useState("receipt");
  const [pinForSettings, setPinForSettings] = useState(false);
  const [settingsUnlocked, setSettingsUnlocked] = useState(false);
  const [pinForReports, setPinForReports] = useState(false);
  const [reportsUnlocked, setReportsUnlocked] = useState(false);

  // Local settings draft
  const [receiptDraft, setReceiptDraft] = useState(settings.receipt);
  const [brandingDraft, setBrandingDraft] = useState(settings.branding);

  // Products filtering — from pos-store only
  const activeProducts = useMemo(() =>
    posProducts.filter((p) => p.isActive),
    [posProducts]
  );

  const filtered = useMemo(() => {
    return activeProducts.filter((p) => {
      const matchesQuery =
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.sku ?? "").toLowerCase().includes(query.toLowerCase());
      const matchesCat =
        selectedCategory === "pcat-all" || p.categoryId === selectedCategory;
      return matchesQuery && matchesCat;
    });
  }, [activeProducts, query, selectedCategory]);

  // Cart calculations
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const vatRate = settings.enableVat ? settings.vatRate : 0;
  const vatAmount = Math.round(subtotal * (vatRate / 100));
  const total = subtotal;
  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const change = method === "Cash" && cashReceivedNum >= total ? cashReceivedNum - total : 0;

  // History filtering
  const filteredHistory = useMemo(() =>
    filterPosTransactions(transactions, {
      search: historySearch || undefined,
      status: historyStatus,
      method: historyMethod,
    }).slice(0, 50),
    [transactions, historySearch, historyStatus, historyMethod]
  );

  const brandingVars = {
    "--pos-primary": settings.branding.primaryColor,
    "--pos-secondary": settings.branding.secondaryColor,
  } as React.CSSProperties;

  // Cart actions
  function addToCart(productId: string, name: string, price: number, unitOfMeasure: string) {
    setCart((c) => {
      const found = c.find((i) => i.productId === productId);
      if (found) return c.map((i) => i.productId === productId ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { productId, name, price, qty: 1, unitOfMeasure }];
    });
  }

  function changeQty(productId: string, delta: number) {
    setCart((c) =>
      c.map((i) => i.productId === productId ? { ...i, qty: i.qty + delta } : i)
        .filter((i) => i.qty > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((c) => c.filter((i) => i.productId !== productId));
  }

  function checkout() {
    if (cart.length === 0) return;
    if (method === "Cash" && cashReceivedNum < total) {
      toast.error("Cash received is less than the total amount.");
      return;
    }
    const txn = recordPosTransaction({
      items: cart,
      method,
      cashReceived: method === "Cash" ? cashReceivedNum : undefined,
      customer: customer.trim() || undefined,
    });
    setReceiptTxn(txn);
    setCart([]);
    setCashReceived("");
    setCustomer("");
    toast.success("Payment successful", { description: `${txn.ref} · ${formatCurrency(txn.total)}` });
  }

  function handleVoid() {
    if (!voidTarget) return;
    const result = voidTransaction(voidTarget.id, voidReason.trim() || undefined);
    if (result.ok) toast.success("Transaction voided");
    else toast.error(result.reason ?? "Cannot void transaction");
    setVoidTarget(null);
    setVoidReason("");
  }

  function saveReceiptSettings() {
    updateReceiptSettings(receiptDraft);
    toast.success("Receipt settings saved");
  }

  function saveBrandingSettings() {
    updateBrandingSettings(brandingDraft);
    toast.success("Branding settings saved");
  }

  return (
    <div className="mx-auto max-w-7xl">
      <Tabs defaultValue="register">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">
              <span className="h-px w-8 bg-accent/50" />
              <span>Module</span>
            </div>
            <h2 className="font-display mt-3 text-3xl font-normal tracking-tight sm:text-4xl">
              {settings.branding.companyName} — POS
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Today: {stats.todayTransactions} transactions · {formatCurrency(stats.todayRevenue)}
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="register"><ShoppingCart className="size-4" /> Register</TabsTrigger>
            <TabsTrigger value="history"><History className="size-4" /> History</TabsTrigger>
            <TabsTrigger value="settings" onClick={() => { if (!settingsUnlocked && settings.requirePinForSettings) setPinForSettings(true); }}>
              <Settings className="size-4" /> Settings
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── REGISTER ── */}
        <TabsContent value="register">
          <div
            className={cn("pos-scope rounded-3xl", settings.branding.theme === "dark" && "pos-scope-dark")}
            style={brandingVars}
          >
            <div className="grid gap-4 p-4 lg:grid-cols-[1.6fr_1fr]">
              {/* Left: Products */}
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 pos-text-muted" />
                    <Input placeholder="Search products or SKU…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 pos-input" />
                  </div>
                  <Button variant="outline" size="icon-sm" className="size-9 shrink-0 pos-border" onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")}>
                    {viewMode === "grid" ? <List className="size-4" /> : <LayoutGrid className="size-4" />}
                  </Button>
                </div>

                {/* Category pills */}
                <div className="flex flex-wrap gap-2">
                  {posCategories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all pos-border",
                        selectedCategory === c.id ? "pos-pill-active" : "pos-text-muted hover:pos-text",
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>

                {/* Product grid / list */}
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                    <Package className="size-10 pos-text-muted opacity-40" />
                    <p className="text-sm pos-text-muted">
                      {posProducts.length === 0
                        ? "No products yet. Add products in Settings → Products."
                        : "No products match your search."}
                    </p>
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {filtered.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p.id, p.name, p.price, p.unitOfMeasure)}
                        className="group flex flex-col rounded-2xl border pos-border pos-card text-left transition-all hover:-translate-y-0.5 overflow-hidden"
                      >
                        {/* Product image */}
                        {p.imageUrl ? (
                          <div className="h-28 w-full overflow-hidden">
                            <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                          </div>
                        ) : (
                          <div className="flex h-28 w-full items-center justify-center" style={{ background: "var(--pos-input-bg)" }}>
                            <Package className="size-8 opacity-20 pos-text-muted" />
                          </div>
                        )}
                        <div className="p-3">
                          <p className="line-clamp-2 text-sm font-medium pos-text">{p.name}</p>
                          <p className="mt-1 font-semibold pos-accent-text">{formatCurrency(p.price)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border pos-border pos-card">
                    {filtered.map((p, i) => (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p.id, p.name, p.price, p.unitOfMeasure)}
                        className={cn(
                          "flex w-full items-center gap-4 px-4 py-3 text-left text-sm transition-colors pos-row-hover",
                          i !== 0 && "border-t pos-border",
                        )}
                      >
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="size-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="flex size-10 items-center justify-center rounded-lg shrink-0" style={{ background: "var(--pos-input-bg)" }}>
                            <Package className="size-4 opacity-30 pos-text-muted" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium pos-text">{p.name}</p>
                          <p className="text-xs pos-text-muted font-mono">{p.sku || "—"}</p>
                        </div>
                        <span className="font-semibold pos-accent-text">{formatCurrency(p.price)}</span>
                        <Plus className="size-4 shrink-0 pos-text-muted" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Cart */}
              <div className="flex h-fit flex-col rounded-2xl border pos-border pos-card lg:sticky lg:top-20">
                <div className="flex items-center gap-2 border-b pos-border px-5 py-4">
                  <ShoppingCart className="size-4 pos-accent-text" />
                  <span className="font-semibold pos-text">Current order</span>
                  {cart.length > 0 && (
                    <Badge variant="accent" className="ml-auto">
                      {cart.reduce((s, i) => s + i.qty, 0)}
                    </Badge>
                  )}
                </div>

                <div className="max-h-64 flex-1 overflow-y-auto">
                  {cart.length === 0 ? (
                    <p className="px-5 py-12 text-center text-sm pos-text-muted">Tap a product to add it to the order.</p>
                  ) : (
                    cart.map((item) => (
                      <div key={item.productId} className="flex items-center gap-3 border-b pos-border px-4 py-3 last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium pos-text">{item.name}</p>
                          <p className="text-xs pos-text-muted">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon-sm" className="size-6 pos-border" onClick={() => changeQty(item.productId, -1)}><Minus className="size-3" /></Button>
                          <span className="w-6 text-center text-sm font-medium tabular-nums pos-text">{item.qty}</span>
                          <Button variant="outline" size="icon-sm" className="size-6 pos-border" onClick={() => changeQty(item.productId, 1)}><Plus className="size-3" /></Button>
                        </div>
                        <span className="w-14 text-right text-sm font-medium tabular-nums pos-text">{formatCurrency(item.price * item.qty)}</span>
                        <button onClick={() => removeFromCart(item.productId)} className="pos-text-muted hover:text-destructive transition-colors">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t pos-border p-5">
                  <Input placeholder="Customer name (optional)" value={customer} onChange={(e) => setCustomer(e.target.value)} className="mb-4 h-8 text-xs pos-input" />
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex justify-between pos-text-muted"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                    {vatRate > 0 && <div className="flex justify-between pos-text-muted"><span>VAT ({vatRate}%)</span><span>{formatCurrency(vatAmount)}</span></div>}
                    <div className="mt-1 flex justify-between text-base font-semibold pos-text"><span>Total</span><span>{formatCurrency(total)}</span></div>
                  </div>
                  <div className="mt-4 grid grid-cols-5 gap-1">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMethod(m)}
                        className={cn("rounded-lg border px-1 py-1.5 text-[10px] font-medium transition-colors pos-border", method === m ? "pos-pill-active" : "pos-text-muted hover:pos-text")}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  {method === "Cash" && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      <div className="relative flex-1">
                        <Banknote className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 pos-text-muted" />
                        <Input type="number" placeholder="Cash received" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className="h-9 pl-9 text-sm pos-input" min={0} />
                      </div>
                      {cashReceivedNum >= total && total > 0 && (
                        <div className="flex justify-between rounded-lg bg-success/10 px-3 py-2 text-sm">
                          <span className="text-success font-medium">Change</span>
                          <span className="font-semibold text-success tabular-nums">{formatCurrency(change)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <Button size="lg" className="mt-4 w-full pos-charge-button" disabled={cart.length === 0 || (method === "Cash" && cashReceivedNum < total && cashReceivedNum > 0)} onClick={checkout}>
                    <Check className="size-4" />
                    {method === "Cash" && cashReceivedNum < total && total > 0 ? `Short ${formatCurrency(total - cashReceivedNum)}` : `Charge ${formatCurrency(total)}`}
                  </Button>
                  {cart.length > 0 && (
                    <Button variant="ghost" size="sm" className="mt-1 w-full pos-text-muted" onClick={() => setCart([])}>
                      <Trash2 className="size-3.5" /> Clear order
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── HISTORY ── */}
        <TabsContent value="history">
          <div className={cn("pos-scope rounded-3xl p-4", settings.branding.theme === "dark" && "pos-scope-dark")} style={brandingVars}>
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Today's revenue", value: formatCurrency(stats.todayRevenue) },
                { label: "Today's transactions", value: String(stats.todayTransactions) },
                { label: "Avg. transaction value", value: formatCurrency(stats.averageTransactionValue) },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border pos-border pos-card px-5 py-4">
                  <p className="text-xs pos-text-muted">{s.label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums pos-text">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 pos-text-muted" />
                <Input placeholder="Search ref, customer, item…" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="pl-9 h-9 pos-input" />
              </div>
              <Select value={historyStatus} onValueChange={(v) => setHistoryStatus(v as typeof historyStatus)}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="VOIDED">Voided</SelectItem>
                </SelectContent>
              </Select>
              <Select value={historyMethod} onValueChange={(v) => setHistoryMethod(v as typeof historyMethod)}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-hidden rounded-2xl border pos-border pos-card">
              <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b pos-border px-5 py-3 text-xs font-medium uppercase tracking-wider pos-text-muted sm:grid">
                <span>Reference</span><span>Date</span><span>Method</span><span>Status</span><span className="text-right">Total</span><span />
              </div>
              {filteredHistory.length === 0 && <div className="py-16 text-center text-sm pos-text-muted">No transactions found.</div>}
              {filteredHistory.map((t) => (
                <div key={t.id} className="grid grid-cols-2 items-center gap-3 border-b pos-border px-5 py-3.5 text-sm last:border-0 sm:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]">
                  <div>
                    <p className="font-medium font-mono text-xs pos-text">{t.ref}</p>
                    {t.customer && <p className="text-xs pos-text-muted">{t.customer}</p>}
                  </div>
                  <span className="hidden text-xs pos-text-muted sm:block">{new Date(t.date).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</span>
                  <span className="hidden sm:block"><Badge variant="secondary">{t.method}</Badge></span>
                  <span className="hidden sm:block"><Badge variant={t.status === "COMPLETED" ? "success" : "muted"} className="capitalize">{t.status.toLowerCase()}</Badge></span>
                  <span className="text-right font-medium tabular-nums pos-text">{formatCurrency(t.total)}</span>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon-sm" onClick={() => setReceiptTxn(t)} title="View receipt"><Receipt className="size-4" /></Button>
                    {t.status === "COMPLETED" && (
                      <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" title="Void transaction" onClick={() => { if (settings.requirePinForVoid) { setVoidTarget(t); setPinForVoid(true); } else setVoidTarget(t); }}>
                        <Ban className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── SETTINGS ── */}
        <TabsContent value="settings">
          {!settingsUnlocked && settings.requirePinForSettings ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <div className="flex size-16 items-center justify-center rounded-full border border-border bg-secondary">
                <Lock className="size-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">Admin access required</p>
                <p className="mt-1 text-sm text-muted-foreground">Enter your Solaris account password to access POS settings.</p>
              </div>
              <Button variant="accent" onClick={() => setPinForSettings(true)}>
                <Shield className="size-4" /> Enter password
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
              <div className="flex flex-col gap-1">
                {[
                  { id: "products", label: "Products" },
                  { id: "receipt", label: "Receipt" },
                  { id: "branding", label: "Branding" },
                  { id: "categories", label: "POS Categories" },
                  { id: "security", label: "Security" },
                  { id: "general", label: "General" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSettingsTab(item.id)}
                    className={cn(
                      "rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors",
                      settingsTab === item.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">

                {/* ── PRODUCTS ── */}
                {settingsTab === "products" && <PosProductManager />}

                {/* ── RECEIPT ── */}
                {settingsTab === "receipt" && (
                  <div className="grid gap-4">
                    <h3 className="font-semibold">Receipt Settings</h3>
                    {[
                      { label: "Company Name", key: "companyName" as const },
                      { label: "Address", key: "address" as const },
                      { label: "Contact Number", key: "contactNumber" as const },
                      { label: "Header Message", key: "headerMessage" as const },
                      { label: "Footer Message", key: "footerMessage" as const },
                      { label: "Thank You Message", key: "thankYouMessage" as const },
                    ].map((f) => (
                      <div key={f.key} className="grid gap-1.5">
                        <Label>{f.label}</Label>
                        <Input value={receiptDraft[f.key]} onChange={(e) => setReceiptDraft({ ...receiptDraft, [f.key]: e.target.value })} />
                      </div>
                    ))}
                    <div className="flex items-center gap-3 mt-2">
                      <input type="checkbox" id="showVat" checked={receiptDraft.showVat} onChange={(e) => setReceiptDraft({ ...receiptDraft, showVat: e.target.checked })} className="size-4" />
                      <Label htmlFor="showVat">Show VAT breakdown on receipt</Label>
                    </div>
                    <Button variant="accent" className="w-fit" onClick={saveReceiptSettings}>Save receipt settings</Button>
                  </div>
                )}

                {/* ── BRANDING ── */}
                {settingsTab === "branding" && (
                  <div className="grid gap-4">
                    <h3 className="font-semibold">POS Branding</h3>
                    <p className="text-sm text-muted-foreground">These apply only to the Register and History screens.</p>
                    <div className="grid gap-1.5">
                      <Label>Company Name</Label>
                      <Input value={brandingDraft.companyName} onChange={(e) => setBrandingDraft({ ...brandingDraft, companyName: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-1.5">
                        <Label>Primary Color</Label>
                        <div className="flex gap-2">
                          <input type="color" value={brandingDraft.primaryColor} onChange={(e) => setBrandingDraft({ ...brandingDraft, primaryColor: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1" />
                          <Input value={brandingDraft.primaryColor} onChange={(e) => setBrandingDraft({ ...brandingDraft, primaryColor: e.target.value })} className="font-mono text-sm" />
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Secondary Color</Label>
                        <div className="flex gap-2">
                          <input type="color" value={brandingDraft.secondaryColor} onChange={(e) => setBrandingDraft({ ...brandingDraft, secondaryColor: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1" />
                          <Input value={brandingDraft.secondaryColor} onChange={(e) => setBrandingDraft({ ...brandingDraft, secondaryColor: e.target.value })} className="font-mono text-sm" />
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Theme</Label>
                      <Select value={brandingDraft.theme} onValueChange={(v) => setBrandingDraft({ ...brandingDraft, theme: v as "light" | "dark" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="accent" className="w-fit" onClick={saveBrandingSettings}>Save branding settings</Button>
                  </div>
                )}

                {/* ── CATEGORIES ── */}
                {settingsTab === "categories" && <PosCategoryManager />}

                {/* ── SECURITY ── */}
                {settingsTab === "security" && (
                  <div className="grid gap-6">
                    <div>
                      <h3 className="font-semibold">Admin Verification</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Sensitive POS actions are protected using your main Solaris account password.</p>
                    </div>
                    <div className="border-t border-border pt-6">
                      <h3 className="font-semibold">Verification Requirements</h3>
                      <div className="mt-4 grid gap-3">
                        {[
                          { label: "Require password for Settings", key: "requirePinForSettings" as const },
                          { label: "Require password for Void", key: "requirePinForVoid" as const },
                          { label: "Require password for Reports", key: "requirePinForReports" as const },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center gap-3">
                            <input type="checkbox" id={item.key} checked={settings[item.key]} onChange={(e) => updatePosSettings({ [item.key]: e.target.checked })} className="size-4" />
                            <Label htmlFor={item.key}>{item.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── GENERAL ── */}
                {settingsTab === "general" && (
                  <div className="grid gap-4">
                    <h3 className="font-semibold">General Settings</h3>
                    <div className="grid gap-1.5 max-w-xs">
                      <Label>Cashier Name</Label>
                      <Input value={settings.cashier} onChange={(e) => updatePosSettings({ cashier: e.target.value })} placeholder="e.g. Juan dela Cruz" />
                    </div>
                    <div className="grid gap-1.5 max-w-xs">
                      <Label>Default Payment Method</Label>
                      <Select value={settings.defaultPaymentMethod} onValueChange={(v) => updatePosSettings({ defaultPaymentMethod: v as PosPaymentMethod })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="enableVat" checked={settings.enableVat} onChange={(e) => updatePosSettings({ enableVat: e.target.checked })} className="size-4" />
                      <Label htmlFor="enableVat">Enable VAT</Label>
                    </div>
                    {settings.enableVat && (
                      <div className="grid gap-1.5 max-w-xs">
                        <Label>VAT Rate (%)</Label>
                        <Input type="number" min={0} max={100} value={settings.vatRate} onChange={(e) => updatePosSettings({ vatRate: Math.min(100, Math.max(0, Number(e.target.value))) })} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Receipt Dialog ── */}
      <Dialog open={!!receiptTxn} onOpenChange={(o) => !o && setReceiptTxn(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="size-5 text-accent" /> Receipt</DialogTitle>
          </DialogHeader>
          {receiptTxn && (
            <div className="max-h-96 overflow-y-auto rounded-xl border border-dashed border-border p-5 font-mono text-xs">
              <div className="text-center">
                <p className="text-sm font-semibold">{settings.receipt.companyName}</p>
                <p className="text-muted-foreground">{settings.receipt.address}</p>
                <p className="text-muted-foreground">{settings.receipt.contactNumber}</p>
                {settings.receipt.headerMessage && <p className="mt-1 text-muted-foreground">{settings.receipt.headerMessage}</p>}
              </div>
              <div className="my-3 border-t border-dashed border-border" />
              <p>Ref: <strong>{receiptTxn.ref}</strong></p>
              <p>{new Date(receiptTxn.date).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</p>
              {receiptTxn.customer && <p>Customer: {receiptTxn.customer}</p>}
              <div className="my-3 border-t border-dashed border-border" />
              {receiptTxn.items.map((i, idx) => (
                <div key={idx} className="flex justify-between gap-2 py-0.5">
                  <span className="truncate">{i.qty}× {i.name}</span>
                  <span>{formatCurrency(i.lineTotal)}</span>
                </div>
              ))}
              <div className="my-3 border-t border-dashed border-border" />
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(receiptTxn.subtotal)}</span></div>
              {settings.enableVat && <div className="flex justify-between text-muted-foreground"><span>VAT ({settings.vatRate}%)</span><span>{formatCurrency(receiptTxn.vatAmount)}</span></div>}
              <div className="flex justify-between font-semibold mt-1"><span>TOTAL</span><span>{formatCurrency(receiptTxn.total)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Paid via</span><span>{receiptTxn.method}</span></div>
              {receiptTxn.cashReceived != null && <div className="flex justify-between text-muted-foreground"><span>Cash received</span><span>{formatCurrency(receiptTxn.cashReceived)}</span></div>}
              {receiptTxn.change != null && <div className="flex justify-between text-muted-foreground"><span>Change</span><span>{formatCurrency(receiptTxn.change)}</span></div>}
              <div className="my-3 border-t border-dashed border-border" />
              <p className="text-center">{settings.receipt.thankYouMessage}</p>
              {settings.receipt.footerMessage && <p className="mt-1 text-center text-muted-foreground">{settings.receipt.footerMessage}</p>}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="accent" className="flex-1" onClick={() => receiptTxn && printReceipt(receiptTxn, settings)}>
              <Printer className="size-4" /> Print receipt
            </Button>
            <Button variant="outline" onClick={() => setReceiptTxn(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Void Confirm Dialog ── */}
      <Dialog open={!!voidTarget && !pinForVoid} onOpenChange={(o) => !o && setVoidTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Ban className="size-5 text-destructive" /> Void Transaction</DialogTitle>
            <DialogDescription>Are you sure you want to void <strong>{voidTarget?.ref}</strong>? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label>Reason <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="e.g. Customer request" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleVoid}>Yes, void it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Admin Password Dialogs ── */}
      <AdminPinDialog open={pinForSettings} onOpenChange={setPinForSettings} onSuccess={() => setSettingsUnlocked(true)} title="Settings access" description="Enter your Solaris account password to unlock POS settings." />
      <AdminPinDialog open={pinForVoid} onOpenChange={(o) => { setPinForVoid(o); if (!o) setVoidTarget(null); }} onSuccess={() => setPinForVoid(false)} title="Void verification" description="Enter your Solaris account password to void this transaction." />
      <AdminPinDialog open={pinForReports} onOpenChange={setPinForReports} onSuccess={() => setReportsUnlocked(true)} title="Reports access" description="Enter your Solaris account password to access sales reports." />
    </div>
  );
}

// ---------------------------------------------------------------------------
// POS Product Manager
// ---------------------------------------------------------------------------

const EMPTY_DRAFT: PosProductDraft = {
  name: "",
  sku: "",
  price: 0,
  categoryId: null,
  imageUrl: undefined,
  unitOfMeasure: "pc",
};

function PosProductManager() {
  const { posProducts, posCategories, addPosProduct, updatePosProduct, deletePosProduct, togglePosProductActive } = usePosStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PosProduct | null>(null);
  const [draft, setDraft] = useState<PosProductDraft>(EMPTY_DRAFT);
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  function openAdd() {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setImagePreview(undefined);
    setDialogOpen(true);
  }

  function openEdit(p: PosProduct) {
    setEditing(p);
    setDraft({
      name: p.name,
      sku: p.sku ?? "",
      price: p.price,
      categoryId: p.categoryId,
      imageUrl: p.imageUrl,
      unitOfMeasure: p.unitOfMeasure,
    });
    setImagePreview(p.imageUrl);
    setDialogOpen(true);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImagePreview(result);
      setDraft((d) => ({ ...d, imageUrl: result }));
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!draft.name.trim()) { toast.error("Product name is required"); return; }
    if (!draft.price || draft.price <= 0) { toast.error("Price must be greater than zero"); return; }
    if (editing) {
      updatePosProduct(editing.id, draft);
      toast.success("Product updated");
    } else {
      addPosProduct(draft);
      toast.success("Product added");
    }
    setDialogOpen(false);
  }

  function handleDelete(id: string) {
    const res = deletePosProduct(id);
    if (res.ok) toast.success("Product deleted");
    else toast.error(res.reason ?? "Cannot delete product");
  }

  const nonAllCategories = posCategories.filter((c) => c.id !== "pcat-all");

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">POS Products</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{posProducts.length} product{posProducts.length === 1 ? "" : "s"}</p>
        </div>
        <Button variant="accent" size="sm" onClick={openAdd}>
          <Plus className="size-4" /> Add product
        </Button>
      </div>

      {posProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Package className="size-10 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">No products yet. Add your first product to get started.</p>
          <Button variant="accent" size="sm" onClick={openAdd}><Plus className="size-4" /> Add product</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {posProducts.map((p) => {
            const cat = nonAllCategories.find((c) => c.id === p.categoryId);
            return (
              <div key={p.id} className={cn("rounded-2xl border border-border bg-card overflow-hidden", !p.isActive && "opacity-50")}>
                {p.imageUrl ? (
                  <div className="h-32 w-full overflow-hidden">
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-32 w-full items-center justify-center bg-secondary">
                    <Package className="size-10 text-muted-foreground opacity-20" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      {p.sku && <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>}
                    </div>
                    <p className="shrink-0 font-semibold text-accent">{formatCurrency(p.price)}</p>
                  </div>
                  {cat && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: cat.color }} />
                      <span className="text-xs text-muted-foreground">{cat.name}</span>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => openEdit(p)}>
                      <Pencil className="size-3" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => togglePosProductActive(p.id)}>
                      {p.isActive ? "Hide" : "Show"}
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>Fill in the product details. Image is optional.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {/* Image upload */}
            <div className="grid gap-1.5">
              <Label>Product image <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <div
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "relative flex h-36 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-border bg-secondary/40 transition-colors hover:border-accent hover:bg-accent/5",
                )}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="absolute inset-0 h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setImagePreview(undefined); setDraft((d) => ({ ...d, imageUrl: undefined })); if (fileRef.current) fileRef.current.value = ""; }}
                      className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <X className="size-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <ImageIcon className="size-8 text-muted-foreground opacity-40" />
                    <p className="text-xs text-muted-foreground">Click to upload image</p>
                    <p className="text-[10px] text-muted-foreground">Max 2MB · JPG, PNG, WEBP</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>

            {/* Name */}
            <div className="grid gap-1.5">
              <Label>Product name *</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Sisig Rice" autoFocus />
            </div>

            {/* Price + UoM */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Price (₱) *</Label>
                <Input type="number" min={0} step="0.01" value={draft.price || ""} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) || 0 })} placeholder="e.g. 120" />
              </div>
              <div className="grid gap-1.5">
                <Label>Unit</Label>
                <Input value={draft.unitOfMeasure} onChange={(e) => setDraft({ ...draft, unitOfMeasure: e.target.value })} placeholder="pc, kg, cup…" />
              </div>
            </div>

            {/* SKU */}
            <div className="grid gap-1.5">
              <Label>SKU <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input value={draft.sku ?? ""} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} placeholder="e.g. SISIG-001" className="font-mono" />
            </div>

            {/* Category */}
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={draft.categoryId ?? "__none__"} onValueChange={(v) => setDraft({ ...draft, categoryId: v === "__none__" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No category</SelectItem>
                  {nonAllCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={handleSave}>{editing ? "Save changes" : "Add product"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// POS Category Manager
// ---------------------------------------------------------------------------

function PosCategoryManager() {
  const { posCategories, addPosCategory, updatePosCategory, deletePosCategory } = usePosStore();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#C98A3C");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#C98A3C");

  function handleAdd() {
    if (!newName.trim()) return;
    addPosCategory({ name: newName.trim(), color: newColor });
    toast.success("Category added");
    setNewName("");
    setNewColor("#C98A3C");
  }

  function handleSaveEdit() {
    if (!editingId || !editName.trim()) return;
    updatePosCategory(editingId, { name: editName.trim(), color: editColor });
    toast.success("Category updated");
    setEditingId(null);
  }

  function handleDelete(id: string) {
    const result = deletePosCategory(id);
    if (result.ok) toast.success("Category deleted");
    else toast.error(result.reason ?? "Cannot delete category");
  }

  return (
    <div className="grid gap-4">
      <h3 className="font-semibold">POS Categories</h3>
      <p className="text-sm text-muted-foreground">Add or remove your own categories — these power the filter pills on the register screen.</p>
      <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
        {posCategories.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-2.5">
            <span className="size-3 shrink-0 rounded-full" style={{ background: c.color ?? "#888" }} />
            {editingId === c.id ? (
              <>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 flex-1 text-sm" />
                <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5" />
                <Button size="sm" variant="accent" className="h-7" onClick={handleSaveEdit}>Save</Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingId(null)}>Cancel</Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium">{c.name}</span>
                {c.id !== "pcat-all" && (
                  <>
                    <Button variant="ghost" size="icon-sm" onClick={() => { setEditingId(c.id); setEditName(c.name); setEditColor(c.color ?? "#888"); }}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-4">
        <p className="mb-3 text-sm font-medium">Add new category</p>
        <div className="flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Desserts" className="flex-1" onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1" />
          <Button variant="accent" onClick={handleAdd} disabled={!newName.trim()}><Plus className="size-4" /> Add</Button>
        </div>
      </div>
    </div>
  );
}