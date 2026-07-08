"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  Banknote,
  LayoutGrid,
  List,
  Minus,
  Package,
  Percent,
  Plus,
  Search,
  ShoppingBag,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { apiGet, apiSend, fmtMoney } from "@/lib/pos/client";
import { POS_PAYMENT_METHODS } from "@/lib/pos/types";
import type {
  PosCartItem,
  PosCategoryDTO,
  PosDiscountType,
  PosPaymentMethod,
  PosProductDTO,
  PosReceiptSnapshot,
  PosSettingsDTO,
} from "@/lib/pos/types";
import { ReceiptDialog } from "./receipt-view";

interface Bootstrap {
  settings: PosSettingsDTO;
  categories: PosCategoryDTO[];
  products: PosProductDTO[];
  cart: PosCartItem[];
}

const cents = (pesos: number) => Math.round(pesos * 100);

function computeTotals(
  items: PosCartItem[],
  discount: { type: PosDiscountType; value: number } | null,
  settings: PosSettingsDTO | null,
) {
  const subtotalC = items.reduce((s, i) => s + cents(i.price) * i.qty, 0);
  let discountC = 0;
  if (discount && discount.value > 0) {
    discountC =
      discount.type === "percent"
        ? Math.round((subtotalC * Math.min(discount.value, 100)) / 100)
        : Math.min(subtotalC, cents(discount.value));
  }
  const netC = subtotalC - discountC;
  const rate = settings?.vatEnabled ? settings.vatRate / 100 : 0;
  const inclusive = settings?.vatInclusive ?? true;
  const taxC =
    rate <= 0 ? 0 : inclusive ? Math.round((netC * rate) / (1 + rate)) : Math.round(netC * rate);
  const totalC = inclusive ? netC : netC + taxC;
  return {
    subtotal: subtotalC / 100,
    discount: discountC / 100,
    tax: taxC / 100,
    total: totalC / 100,
    rate,
    inclusive,
  };
}

/** Sensible quick-tender amounts for the current total. */
function quickTenders(total: number): number[] {
  if (total <= 0) return [];
  const opts = new Set<number>();
  opts.add(Math.ceil(total));
  for (const bill of [100, 200, 500, 1000]) {
    const next = Math.ceil(total / bill) * bill;
    if (next >= total) opts.add(next);
  }
  return [...opts].sort((a, b) => a - b).slice(0, 4);
}

export function RegisterTab({
  refreshKey,
  onGoToSettings,
}: {
  refreshKey: number;
  onGoToSettings: () => void;
}) {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);

  // Register state
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [method, setMethod] = useState<PosPaymentMethod>("Cash");
  const [cashInput, setCashInput] = useState("");
  const [customer, setCustomer] = useState("");
  const [discount, setDiscount] = useState<{ type: PosDiscountType; value: number } | null>(null);
  const [charging, setCharging] = useState(false);
  const [receipt, setReceipt] = useState<PosReceiptSnapshot | null>(null);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const cartLoaded = useRef(false);

  // --- Bootstrap ---------------------------------------------------------------
  useEffect(() => {
    let active = true;
    setLoading(true);
    apiGet<Bootstrap>("/api/pos/catalog")
      .then((d) => {
        if (!active) return;
        setData(d);
        setMethod(d.settings.defaultMethod);
        if (!cartLoaded.current) {
          // Resume an in-progress sale after refresh/crash.
          setCart(d.cart);
          cartLoaded.current = true;
        }
      })
      .catch((e) => active && toast.error(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  // --- Debounced cart persistence ------------------------------------------------
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
    if (!cartLoaded.current) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      apiSend("/api/pos/cart", "PUT", { items: cart }).catch(() => null);
    }, 800);
  }, [cart]);
  useEffect(
    () => () => {
      // Flush pending sync when leaving the register.
      if (syncTimer.current) {
        clearTimeout(syncTimer.current);
        apiSend("/api/pos/cart", "PUT", { items: cartRef.current }).catch(() => null);
      }
    },
    [],
  );

  // --- Derived -------------------------------------------------------------------
  const settings = data?.settings ?? null;
  const products = useMemo(() => {
    const available = (data?.products ?? []).filter((p) => p.available);
    const q = query.trim().toLowerCase();
    return available.filter((p) => {
      const matchesQuery =
        !q || p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q);
      const matchesCat = category === "all" || p.categoryId === category;
      return matchesQuery && matchesCat;
    });
  }, [data?.products, query, category]);

  const categories = data?.categories ?? [];
  const totals = computeTotals(cart, discount, settings);
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);
  const cash = parseFloat(cashInput) || 0;
  const change = method === "Cash" && cash >= totals.total ? cash - totals.total : 0;
  const cashShort = method === "Cash" && cash > 0 && cash < totals.total;
  const canCharge =
    cart.length > 0 && !charging && (method !== "Cash" || cash >= totals.total);

  // --- Cart actions -----------------------------------------------------------------
  const addToCart = useCallback((p: PosProductDTO) => {
    setCart((c) => {
      const found = c.find((i) => i.productId === p.id);
      if (found)
        return c.map((i) =>
          i.productId === p.id ? { ...i, qty: Math.min(999, i.qty + 1) } : i,
        );
      return [...c, { productId: p.id, name: p.name, price: p.price, qty: 1, imageUrl: p.imageUrl }];
    });
  }, []);

  const changeQty = (productId: string, delta: number) =>
    setCart((c) =>
      c
        .map((i) => (i.productId === productId ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0),
    );

  const clearSale = useCallback(() => {
    setCart([]);
    setCashInput("");
    setCustomer("");
    setDiscount(null);
  }, []);

  // --- Checkout ----------------------------------------------------------------------
  const charge = useCallback(async () => {
    if (!canCharge) return;
    setCharging(true);
    try {
      const res = await apiSend<{ receipt: PosReceiptSnapshot }>(
        "/api/pos/checkout",
        "POST",
        {
          items: cart.map((i) => ({ productId: i.productId, qty: i.qty })),
          method,
          cashReceived: method === "Cash" ? cash : undefined,
          discountType: discount?.type,
          discountValue: discount?.value,
          customer: customer.trim() || undefined,
        },
      );
      setReceipt(res.receipt);
      setCartSheetOpen(false);
      clearSale();
      toast.success("Payment successful", {
        description: `${res.receipt.receiptNo} · ${fmtMoney(res.receipt.total)}`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setCharging(false);
    }
  }, [canCharge, cart, method, cash, discount, customer, clearSale]);

  // --- Keyboard shortcuts ---------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        charge();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [charge]);

  // --- Branding ---------------------------------------------------------------------------
  const brandingVars = {
    "--pos-primary": settings?.primaryColor ?? "#C98A3C",
    "--pos-secondary": settings?.secondaryColor ?? "#1A1A1A",
  } as React.CSSProperties;

  if (loading && !data) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <div className="space-y-4">
          <Skeleton className="h-11 rounded-xl" />
          <Skeleton className="h-9 w-2/3 rounded-full" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const cartPanel = (
    <CartPanel
      cart={cart}
      totals={totals}
      itemCount={itemCount}
      settings={settings}
      method={method}
      setMethod={setMethod}
      cashInput={cashInput}
      setCashInput={setCashInput}
      customer={customer}
      setCustomer={setCustomer}
      discount={discount}
      setDiscount={setDiscount}
      change={change}
      cashShort={cashShort}
      canCharge={canCharge}
      charging={charging}
      onChangeQty={changeQty}
      onRemove={(id) => setCart((c) => c.filter((i) => i.productId !== id))}
      onClear={clearSale}
      onCharge={charge}
    />
  );

  return (
    <div
      className={cn(
        "pos-scope rounded-3xl",
        settings?.theme === "dark" && "pos-scope-dark",
      )}
      style={brandingVars}
    >
      <div className="grid gap-4 p-4 lg:grid-cols-[1.65fr_1fr]">
        {/* ── Products ── */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 pos-text-muted" />
              <Input
                ref={searchRef}
                placeholder="Search products or SKU…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                className="pos-input h-11 rounded-xl pl-9 pr-10"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border pos-border px-1.5 py-0.5 font-mono text-[10px] pos-text-muted sm:block">
                /
              </kbd>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="size-11 shrink-0 rounded-xl pos-border"
              onClick={() => setView((v) => (v === "grid" ? "list" : "grid"))}
              title={view === "grid" ? "List view" : "Grid view"}
            >
              {view === "grid" ? <List className="size-4" /> : <LayoutGrid className="size-4" />}
            </Button>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <CategoryPill
              active={category === "all"}
              onClick={() => setCategory("all")}
              label="All"
            />
            {categories.map((c) => (
              <CategoryPill
                key={c.id}
                active={category === c.id}
                onClick={() => setCategory(c.id)}
                label={c.name}
                color={c.color}
              />
            ))}
          </div>

          {/* Product grid / list */}
          {products.length === 0 ? (
            (data?.products.length ?? 0) === 0 ? (
              <EmptyState
                title="No products yet"
                description="Add your first products to start selling."
              >
                <Button variant="accent" onClick={onGoToSettings}>
                  <Plus className="size-4" /> Add products
                </Button>
              </EmptyState>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <Package className="size-10 pos-text-muted opacity-40" />
                <p className="text-sm pos-text-muted">No products match your search.</p>
              </div>
            )
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-3 pb-20 sm:grid-cols-3 lg:pb-0 xl:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} onAdd={() => addToCart(p)} />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border pos-border pos-card pb-0 mb-20 lg:mb-0">
              {products.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={cn(
                    "flex w-full items-center gap-4 px-4 py-3.5 text-left text-sm transition-colors pos-row-hover active:scale-[0.995]",
                    i !== 0 && "border-t pos-border",
                  )}
                >
                  <ProductThumb product={p} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium pos-text">{p.name}</p>
                    {p.sku && <p className="font-mono text-xs pos-text-muted">{p.sku}</p>}
                  </div>
                  <span className="font-semibold tabular-nums pos-accent-text">
                    {fmtMoney(p.price)}
                  </span>
                  <Plus className="size-4 shrink-0 pos-text-muted" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Cart (desktop rail) ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">{cartPanel}</div>
        </aside>
      </div>

      {/* ── Cart (mobile bottom bar + sheet) ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t pos-border p-3 backdrop-blur-xl lg:hidden"
        style={{ background: "color-mix(in oklch, var(--pos-bg) 88%, transparent)" }}
      >
        <Button
          size="lg"
          className="pos-charge-button w-full justify-between rounded-xl"
          onClick={() => setCartSheetOpen(true)}
        >
          <span className="flex items-center gap-2">
            <ShoppingBag className="size-4" />
            {itemCount === 0 ? "Order" : `${itemCount} item${itemCount === 1 ? "" : "s"}`}
          </span>
          <span className="tabular-nums">{fmtMoney(totals.total)}</span>
        </Button>
      </div>
      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent
          side="bottom"
          className={cn(
            "pos-scope max-h-[88dvh] overflow-y-auto rounded-t-3xl p-4",
            settings?.theme === "dark" && "pos-scope-dark",
          )}
          style={brandingVars}
        >
          <SheetHeader className="mb-2">
            <SheetTitle className="pos-text">Current order</SheetTitle>
          </SheetHeader>
          {cartPanel}
        </SheetContent>
      </Sheet>

      {/* ── Post-checkout receipt ── */}
      <ReceiptDialog
        receipt={receipt}
        open={!!receipt}
        onOpenChange={(o) => !o && setReceipt(null)}
        onNewSale={() => setReceipt(null)}
        celebrate
      />
    </div>
  );
}

// --- Pieces --------------------------------------------------------------------

function CategoryPill({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string | null;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-all pos-border active:scale-95",
        active ? "pos-pill-active shadow-sm" : "pos-text-muted hover:pos-text",
      )}
    >
      {color && !active && (
        <span className="size-2 rounded-full" style={{ background: color }} />
      )}
      {label}
    </button>
  );
}

function ProductThumb({
  product,
  size = "md",
}: {
  product: PosProductDTO;
  size?: "sm" | "md";
}) {
  if (product.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.imageUrl}
        alt={product.name}
        className={cn(
          "shrink-0 object-cover",
          size === "sm" ? "size-11 rounded-lg" : "h-full w-full",
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center",
        size === "sm" ? "size-11 rounded-lg" : "h-full w-full",
      )}
      style={{ background: "var(--pos-input-bg)" }}
    >
      <span
        className="font-display text-xl"
        style={{ color: "color-mix(in oklch, var(--pos-primary) 55%, transparent)" }}
      >
        {product.name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

function ProductCard({
  product,
  onAdd,
}: {
  product: PosProductDTO;
  onAdd: () => void;
}) {
  return (
    <button
      onClick={onAdd}
      className="group flex flex-col overflow-hidden rounded-2xl border pos-border pos-card text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
    >
      <div className="relative h-28 w-full overflow-hidden sm:h-32">
        <ProductThumb product={product} />
        <span className="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-full text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
          style={{ background: "var(--pos-primary)" }}
        >
          <Plus className="size-4" />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug pos-text">
          {product.name}
        </p>
        <p className="mt-auto pt-1.5 font-semibold tabular-nums pos-accent-text">
          {fmtMoney(product.price)}
        </p>
      </div>
    </button>
  );
}

function CartPanel({
  cart,
  totals,
  itemCount,
  settings,
  method,
  setMethod,
  cashInput,
  setCashInput,
  customer,
  setCustomer,
  discount,
  setDiscount,
  change,
  cashShort,
  canCharge,
  charging,
  onChangeQty,
  onRemove,
  onClear,
  onCharge,
}: {
  cart: PosCartItem[];
  totals: ReturnType<typeof computeTotals>;
  itemCount: number;
  settings: PosSettingsDTO | null;
  method: PosPaymentMethod;
  setMethod: (m: PosPaymentMethod) => void;
  cashInput: string;
  setCashInput: (v: string) => void;
  customer: string;
  setCustomer: (v: string) => void;
  discount: { type: PosDiscountType; value: number } | null;
  setDiscount: (d: { type: PosDiscountType; value: number } | null) => void;
  change: number;
  cashShort: boolean;
  canCharge: boolean;
  charging: boolean;
  onChangeQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCharge: () => void;
}) {
  const [discountOpen, setDiscountOpen] = useState(false);
  const tenders = quickTenders(totals.total);

  return (
    <div className="flex flex-col rounded-2xl border pos-border pos-card">
      <div className="flex items-center gap-2 border-b pos-border px-5 py-4">
        <ShoppingBag className="size-4 pos-accent-text" />
        <span className="font-semibold pos-text">Current order</span>
        {itemCount > 0 && (
          <span
            className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold text-white tabular-nums"
            style={{ background: "var(--pos-primary)" }}
          >
            {itemCount}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="max-h-72 flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm pos-text-muted">
            Tap a product to start the order.
          </p>
        ) : (
          cart.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-3 border-b pos-border px-4 py-3 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium pos-text">{item.name}</p>
                <p className="text-xs tabular-nums pos-text-muted">{fmtMoney(item.price)}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <QtyButton onClick={() => onChangeQty(item.productId, -1)}>
                  <Minus className="size-3.5" />
                </QtyButton>
                <span className="w-7 text-center text-sm font-semibold tabular-nums pos-text">
                  {item.qty}
                </span>
                <QtyButton onClick={() => onChangeQty(item.productId, 1)}>
                  <Plus className="size-3.5" />
                </QtyButton>
              </div>
              <span className="w-16 text-right text-sm font-medium tabular-nums pos-text">
                {fmtMoney(item.price * item.qty)}
              </span>
              <button
                onClick={() => onRemove(item.productId)}
                className="pos-text-muted transition-colors hover:text-destructive"
                aria-label={`Remove ${item.name}`}
              >
                <X className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="border-t pos-border p-5">
        <Input
          placeholder="Customer name (optional)"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          className="pos-input mb-4 h-9 text-sm"
        />

        {/* Totals */}
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between pos-text-muted">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmtMoney(totals.subtotal)}</span>
          </div>

          {/* Discount */}
          {discountOpen || discount ? (
            <div className="flex items-center gap-1.5">
              <div className="flex overflow-hidden rounded-lg border pos-border">
                {(["amount", "percent"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      setDiscount({ type: t, value: discount?.value ?? 0 })
                    }
                    className={cn(
                      "px-2 py-1.5 text-xs font-medium transition-colors",
                      (discount?.type ?? "amount") === t
                        ? "pos-pill-active"
                        : "pos-text-muted",
                    )}
                  >
                    {t === "amount" ? "₱" : <Percent className="size-3" />}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={discount?.value || ""}
                onChange={(e) =>
                  setDiscount({
                    type: discount?.type ?? "amount",
                    value: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="pos-input h-8 flex-1 text-sm"
              />
              <span className="tabular-nums text-xs pos-text-muted">
                −{fmtMoney(totals.discount)}
              </span>
              <button
                onClick={() => {
                  setDiscount(null);
                  setDiscountOpen(false);
                }}
                className="pos-text-muted hover:text-destructive"
                aria-label="Remove discount"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDiscountOpen(true)}
              className="flex w-fit items-center gap-1.5 text-xs font-medium pos-accent-text transition-opacity hover:opacity-75"
            >
              <Tag className="size-3" /> Add discount
            </button>
          )}

          {totals.rate > 0 && (
            <div className="flex justify-between pos-text-muted">
              <span>
                VAT ({settings ? settings.vatRate : 12}%{totals.inclusive ? ", incl." : ""})
              </span>
              <span className="tabular-nums">{fmtMoney(totals.tax)}</span>
            </div>
          )}
          <div className="mt-1 flex items-baseline justify-between border-t pos-border pt-2">
            <span className="text-base font-semibold pos-text">Total</span>
            <span className="font-display text-2xl tabular-nums pos-text">
              {fmtMoney(totals.total)}
            </span>
          </div>
        </div>

        {/* Payment method */}
        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {POS_PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={cn(
                "rounded-lg border px-1 py-2 text-[11px] font-medium transition-all pos-border active:scale-95",
                method === m ? "pos-pill-active" : "pos-text-muted hover:pos-text",
              )}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Cash tendering */}
        {method === "Cash" && (
          <div className="mt-3 flex flex-col gap-2">
            <div className="relative">
              <Banknote className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 pos-text-muted" />
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="Cash received"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                className="pos-input h-11 pl-9 text-base tabular-nums"
              />
            </div>
            {tenders.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tenders.map((t) => (
                  <button
                    key={t}
                    onClick={() => setCashInput(String(t))}
                    className="rounded-lg border px-2.5 py-1.5 text-xs font-medium tabular-nums transition-all pos-border pos-text-muted hover:pos-text active:scale-95"
                  >
                    {fmtMoney(t)}
                  </button>
                ))}
              </div>
            )}
            {change > 0 && (
              <div className="flex items-baseline justify-between rounded-xl bg-success/10 px-4 py-2.5">
                <span className="text-sm font-medium text-success">Change</span>
                <span className="font-display text-xl tabular-nums text-success">
                  {fmtMoney(change)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Charge */}
        <Button
          size="lg"
          className="pos-charge-button mt-4 h-13 w-full rounded-xl text-base"
          disabled={!canCharge}
          onClick={onCharge}
        >
          {charging
            ? "Processing…"
            : cashShort
              ? `Short ${fmtMoney(totals.total - (parseFloat(cashInput) || 0))}`
              : `Charge ${fmtMoney(totals.total)}`}
        </Button>
        {cart.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1.5 w-full pos-text-muted"
            onClick={onClear}
          >
            <Trash2 className="size-3.5" /> Clear order
          </Button>
        )}
      </div>
    </div>
  );
}

function QtyButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg border pos-border pos-text transition-all hover:pos-text active:scale-90"
    >
      {children}
    </button>
  );
}
