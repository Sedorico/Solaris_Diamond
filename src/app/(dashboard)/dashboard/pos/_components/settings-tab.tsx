"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ImageIcon,
  KeyRound,
  Lock,
  Package,
  Palette,
  Pencil,
  Plus,
  ReceiptText,
  ShieldCheck,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiGet, apiSend, fmtMoney } from "@/lib/pos/client";
import { POS_PAYMENT_METHODS } from "@/lib/pos/types";
import type {
  PosCategoryDTO,
  PosPaymentMethod,
  PosProductDTO,
  PosReceiptSnapshot,
  PosSettingsDTO,
  PosSettingsPatch,
} from "@/lib/pos/types";
import { LockedPanel, usePinGate } from "./pin-gate";
import { ReceiptView } from "./receipt-view";

type Section = "products" | "categories" | "receipt" | "branding" | "security";

const SECTIONS: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "receipt", label: "Receipt", icon: ReceiptText },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "security", label: "Security", icon: KeyRound },
];

interface CatalogData {
  settings: PosSettingsDTO;
  categories: PosCategoryDTO[];
  products: PosProductDTO[];
}

export function SettingsTab({
  refreshKey,
  onChanged,
}: {
  refreshKey: number;
  onChanged: () => void;
}) {
  const [section, setSection] = useState<Section>("products");
  const [data, setData] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = () =>
    apiGet<CatalogData>("/api/pos/catalog").then(setData);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiGet<CatalogData>("/api/pos/catalog")
      .then((d) => active && setData(d))
      .catch((e) => active && toast.error(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (loading || !data) {
    return (
      <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const changed = async () => {
    await reload();
    onChanged();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
      {/* Section nav */}
      <div className="flex gap-1 overflow-x-auto lg:flex-col">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors",
              section === s.id
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <s.icon className="size-4" />
            {s.label}
          </button>
        ))}
      </div>

      <div className="min-w-0 rounded-2xl border border-border bg-card p-6">
        {section === "products" && (
          <ProductsSection data={data} onChanged={changed} />
        )}
        {section === "categories" && (
          <CategoriesSection data={data} onChanged={changed} />
        )}
        {section === "receipt" && (
          <GatedSection
            title="Receipt branding is protected"
            description="Enter the admin PIN to customise the receipt header, footer and business details."
          >
            <ReceiptSection settings={data.settings} onChanged={changed} />
          </GatedSection>
        )}
        {section === "branding" && (
          <GatedSection
            title="POS branding is protected"
            description="Enter the admin PIN to change colors, theme and register defaults."
          >
            <BrandingSection settings={data.settings} onChanged={changed} />
          </GatedSection>
        )}
        {section === "security" && (
          <SecuritySection settings={data.settings} onChanged={changed} />
        )}
      </div>
    </div>
  );
}

/** Wraps PIN-protected settings sections with the shared locked panel. */
function GatedSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { status } = usePinGate();
  const locked = !!status && status.pinRequired && status.pinSet && !status.unlocked;
  if (locked) {
    return (
      <LockedPanel title={title} description={description} onUnlocked={() => undefined} />
    );
  }
  return <>{children}</>;
}

// --- Products -------------------------------------------------------------------

interface ProductDraft {
  name: string;
  sku: string;
  price: string;
  categoryId: string | null;
  imageUrl: string | null;
  available: boolean;
}

const EMPTY_PRODUCT: ProductDraft = {
  name: "",
  sku: "",
  price: "",
  categoryId: null,
  imageUrl: null,
  available: true,
};

function ProductsSection({
  data,
  onChanged,
}: {
  data: CatalogData;
  onChanged: () => Promise<void>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PosProductDTO | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_PRODUCT);
  const [busy, setBusy] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openAdd = () => {
    setEditing(null);
    setDraft(EMPTY_PRODUCT);
    setDialogOpen(true);
  };
  const openEdit = (p: PosProductDTO) => {
    setEditing(p);
    setDraft({
      name: p.name,
      sku: p.sku ?? "",
      price: String(p.price),
      categoryId: p.categoryId,
      imageUrl: p.imageUrl,
      available: p.available,
    });
    setDialogOpen(true);
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) =>
      setDraft((d) => ({ ...d, imageUrl: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    const price = parseFloat(draft.price);
    if (!draft.name.trim()) return toast.error("Product name is required");
    if (!Number.isFinite(price) || price <= 0)
      return toast.error("Price must be greater than zero");
    setBusy(true);
    try {
      const payload = {
        name: draft.name,
        sku: draft.sku || null,
        price,
        categoryId: draft.categoryId,
        imageUrl: draft.imageUrl,
        available: draft.available,
      };
      if (editing) {
        await apiSend(`/api/pos/products/${editing.id}`, "PATCH", payload);
        toast.success("Product updated");
      } else {
        await apiSend("/api/pos/products", "POST", payload);
        toast.success("Product added");
      }
      setDialogOpen(false);
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleAvailable = async (p: PosProductDTO) => {
    try {
      await apiSend(`/api/pos/products/${p.id}`, "PATCH", { available: !p.available });
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const remove = async (id: string) => {
    try {
      await apiSend(`/api/pos/products/${id}`, "DELETE");
      toast.success("Product deleted");
      setConfirmingId(null);
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Products</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {data.products.length} product{data.products.length === 1 ? "" : "s"} on the register
          </p>
        </div>
        <Button variant="accent" size="sm" onClick={openAdd}>
          <Plus className="size-4" /> Add product
        </Button>
      </div>

      {data.products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Package className="size-10 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">
            No products yet. Add your first product to start selling.
          </p>
          <Button variant="accent" size="sm" onClick={openAdd}>
            <Plus className="size-4" /> Add product
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.products.map((p) => {
            const cat = data.categories.find((c) => c.id === p.categoryId);
            return (
              <div
                key={p.id}
                className={cn(
                  "overflow-hidden rounded-2xl border border-border bg-card transition-opacity",
                  !p.available && "opacity-55",
                )}
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="h-32 w-full object-cover" />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center bg-secondary">
                    <Package className="size-10 text-muted-foreground opacity-20" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      {p.sku && (
                        <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                      )}
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums text-accent">
                      {fmtMoney(p.price)}
                    </p>
                  </div>
                  {cat && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: cat.color ?? "#888" }}
                      />
                      <span className="text-xs text-muted-foreground">{cat.name}</span>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 flex-1 text-xs"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="size-3" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => toggleAvailable(p)}
                      title={p.available ? "Hide from register" : "Show on register"}
                    >
                      {p.available ? "Hide" : "Show"}
                    </Button>
                    {confirmingId === p.id ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => remove(p.id)}
                      >
                        Confirm
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setConfirmingId(p.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>
              Products appear on the register the moment you save.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>
                Product image{" "}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <div
                onClick={() => fileRef.current?.click()}
                className="relative flex h-36 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-border bg-secondary/40 transition-colors hover:border-accent hover:bg-accent/5"
              >
                {draft.imageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={draft.imageUrl}
                      alt="Preview"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDraft((d) => ({ ...d, imageUrl: null }));
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <X className="size-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <ImageIcon className="size-8 text-muted-foreground opacity-40" />
                    <p className="text-xs text-muted-foreground">Click to upload image</p>
                    <p className="text-[10px] text-muted-foreground">
                      Max 2MB · JPG, PNG, WEBP
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImage}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Product name *</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Iced Latte"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Price (₱) *</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                  placeholder="e.g. 120"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>
                  SKU <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  value={draft.sku}
                  onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                  placeholder="e.g. LATTE-01"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select
                value={draft.categoryId ?? "__none__"}
                onValueChange={(v) =>
                  setDraft({ ...draft, categoryId: v === "__none__" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No category</SelectItem>
                  {data.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Available on register</p>
                <p className="text-xs text-muted-foreground">
                  Hidden products stay in history but can’t be sold.
                </p>
              </div>
              <Switch
                checked={draft.available}
                onCheckedChange={(v) => setDraft({ ...draft, available: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="accent" onClick={save} disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Categories -------------------------------------------------------------------

function CategoriesSection({
  data,
  onChanged,
}: {
  data: CatalogData;
  onChanged: () => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#C98A3C");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#C98A3C");

  const add = async () => {
    if (!newName.trim()) return;
    try {
      await apiSend("/api/pos/categories", "POST", { name: newName, color: newColor });
      toast.success("Category added");
      setNewName("");
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Add failed");
    }
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await apiSend(`/api/pos/categories/${editingId}`, "PATCH", {
        name: editName,
        color: editColor,
      });
      toast.success("Category updated");
      setEditingId(null);
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const remove = async (id: string) => {
    try {
      await apiSend(`/api/pos/categories/${id}`, "DELETE");
      toast.success("Category deleted");
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="font-semibold">Categories</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Categories power the filter pills on the register.
        </p>
      </div>
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
        {data.categories.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-xl border border-border px-4 py-2.5"
          >
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ background: c.color ?? "#888" }}
            />
            {editingId === c.id ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 flex-1 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                />
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
                <Button size="sm" variant="accent" className="h-8" onClick={saveEdit}>
                  <Check className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => setEditingId(null)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  {c.productCount} product{c.productCount === 1 ? "" : "s"}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setEditingId(c.id);
                    setEditName(c.name);
                    setEditColor(c.color ?? "#C98A3C");
                  }}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => remove(c.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            )}
          </div>
        ))}
        {data.categories.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No categories yet.
          </p>
        )}
      </div>
      <div className="border-t border-border pt-4">
        <p className="mb-3 text-sm font-medium">Add new category</p>
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Desserts"
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-11 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1"
          />
          <Button variant="accent" onClick={add} disabled={!newName.trim()}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Receipt branding -------------------------------------------------------------

function ReceiptSection({
  settings,
  onChanged,
}: {
  settings: PosSettingsDTO;
  onChanged: () => Promise<void>;
}) {
  const { guard } = usePinGate();
  const [draft, setDraft] = useState<PosSettingsDTO>(settings);
  const [busy, setBusy] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("Logo must be under 500KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) =>
      setDraft((d) => ({ ...d, logoUrl: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setBusy(true);
    try {
      const patch: PosSettingsPatch = {
        companyName: draft.companyName,
        address: draft.address,
        contactNumber: draft.contactNumber,
        logoUrl: draft.logoUrl,
        headerMessage: draft.headerMessage,
        footerMessage: draft.footerMessage,
        thankYouMessage: draft.thankYouMessage,
        vatEnabled: draft.vatEnabled,
        vatRate: draft.vatRate,
        vatInclusive: draft.vatInclusive,
      };
      await guard(() => apiSend("/api/pos/settings", "PATCH", patch));
      toast.success("Receipt settings saved — future receipts use the new branding");
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const preview: PosReceiptSnapshot = {
    receiptNo: "OR-000042",
    ref: "TXN-000042",
    business: {
      name: draft.companyName || "My Business",
      address: draft.address || null,
      contactNumber: draft.contactNumber || null,
      logoUrl: draft.logoUrl,
    },
    headerMessage: draft.headerMessage || null,
    footerMessage: draft.footerMessage || null,
    thankYouMessage: draft.thankYouMessage || null,
    cashier: draft.cashierName || "Cashier",
    customer: null,
    completedAt: new Date().toISOString(),
    lines: [
      { name: "Iced Latte", qty: 2, price: 120, lineTotal: 240 },
      { name: "Butter Croissant", qty: 1, price: 95, lineTotal: 95 },
    ],
    subtotal: 335,
    discount: 0,
    tax: draft.vatEnabled
      ? {
          label: `VAT (${draft.vatRate}%)`,
          amount: draft.vatInclusive
            ? Math.round((335 * (draft.vatRate / 100)) / (1 + draft.vatRate / 100) * 100) / 100
            : Math.round(335 * (draft.vatRate / 100) * 100) / 100,
          included: draft.vatInclusive,
        }
      : null,
    total: draft.vatEnabled && !draft.vatInclusive
      ? 335 + Math.round(335 * (draft.vatRate / 100) * 100) / 100
      : 335,
    method: "Cash",
    cashReceived: 500,
    change: null,
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="grid gap-4">
        <div>
          <h3 className="font-semibold">Receipt branding</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Changes apply automatically to all future receipts. Past receipts keep the
            branding they were issued with.
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label>Company logo</Label>
          <div className="flex items-center gap-3">
            <div
              onClick={() => logoRef.current?.click()}
              className="flex h-16 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-secondary/40 transition-colors hover:border-accent"
            >
              {draft.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <ImageIcon className="size-6 text-muted-foreground opacity-40" />
              )}
            </div>
            {draft.logoUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDraft((d) => ({ ...d, logoUrl: null }))}
              >
                <X className="size-3.5" /> Remove
              </Button>
            )}
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogo}
            />
          </div>
        </div>

        {(
          [
            ["Company name", "companyName"],
            ["Address", "address"],
            ["Contact number", "contactNumber"],
            ["Receipt header", "headerMessage"],
            ["Receipt footer", "footerMessage"],
            ["Thank you message", "thankYouMessage"],
          ] as const
        ).map(([label, key]) => (
          <div key={key} className="grid gap-1.5">
            <Label>{label}</Label>
            <Input
              value={draft[key] ?? ""}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            />
          </div>
        ))}

        <div className="grid gap-3 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Show VAT on receipts</p>
              <p className="text-xs text-muted-foreground">
                Adds a VAT line to totals and receipts.
              </p>
            </div>
            <Switch
              checked={draft.vatEnabled}
              onCheckedChange={(v) => setDraft({ ...draft, vatEnabled: v })}
            />
          </div>
          {draft.vatEnabled && (
            <div className="grid grid-cols-2 items-end gap-3">
              <div className="grid gap-1.5">
                <Label>VAT rate (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.vatRate}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      vatRate: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <span className="text-sm">VAT-inclusive pricing</span>
                <Switch
                  checked={draft.vatInclusive}
                  onCheckedChange={(v) => setDraft({ ...draft, vatInclusive: v })}
                />
              </div>
            </div>
          )}
        </div>

        <Button variant="accent" className="w-fit" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save receipt settings"}
        </Button>
      </div>

      {/* Live preview */}
      <div className="hidden xl:block">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Live preview
        </p>
        <ReceiptView receipt={preview} />
      </div>
    </div>
  );
}

// --- POS branding -------------------------------------------------------------------

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-14 cursor-pointer rounded-lg border border-border bg-transparent p-1"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}

function BrandingSection({
  settings,
  onChanged,
}: {
  settings: PosSettingsDTO;
  onChanged: () => Promise<void>;
}) {
  const { guard } = usePinGate();
  const [draft, setDraft] = useState(settings);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const patch: PosSettingsPatch = {
        companyName: draft.companyName,
        primaryColor: draft.primaryColor,
        secondaryColor: draft.secondaryColor,
        theme: draft.theme,
        cashierName: draft.cashierName,
        defaultMethod: draft.defaultMethod,
      };
      await guard(() => apiSend("/api/pos/settings", "PATCH", patch));
      toast.success("Branding saved");
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid max-w-xl gap-5">
      <div>
        <h3 className="font-semibold">POS branding</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Personalise how the register looks for your team. The premium layout stays —
          your colors and theme apply on top.
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label>Company name</Label>
        <Input
          value={draft.companyName}
          onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ColorField
          label="Primary color"
          value={draft.primaryColor}
          onChange={(v) => setDraft({ ...draft, primaryColor: v })}
        />
        <ColorField
          label="Secondary color"
          value={draft.secondaryColor}
          onChange={(v) => setDraft({ ...draft, secondaryColor: v })}
        />
      </div>

      <div className="grid gap-1.5">
        <Label>Register theme</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setDraft({ ...draft, theme: t })}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm font-medium capitalize transition-all",
                draft.theme === t
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Mini preview */}
      <div
        className={cn("pos-scope rounded-2xl border pos-border p-4", draft.theme === "dark" && "pos-scope-dark")}
        style={
          {
            "--pos-primary": draft.primaryColor,
            "--pos-secondary": draft.secondaryColor,
          } as React.CSSProperties
        }
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold pos-text">
            {draft.companyName || "My Business"}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
            style={{ background: "var(--pos-primary)" }}
          >
            3
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          <span className="pos-pill-active rounded-full border px-3 py-1 text-xs font-medium">
            Drinks
          </span>
          <span className="rounded-full border pos-border px-3 py-1 text-xs pos-text-muted">
            Food
          </span>
        </div>
        <button className="pos-charge-button mt-3 w-full rounded-lg py-2 text-sm font-medium">
          Charge ₱335
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-border pt-5">
        <div className="grid gap-1.5">
          <Label>Cashier name</Label>
          <Input
            value={draft.cashierName}
            onChange={(e) => setDraft({ ...draft, cashierName: e.target.value })}
            placeholder="Shown on receipts"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Default payment method</Label>
          <Select
            value={draft.defaultMethod}
            onValueChange={(v) =>
              setDraft({ ...draft, defaultMethod: v as PosPaymentMethod })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POS_PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button variant="accent" className="w-fit" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save branding"}
      </Button>
    </div>
  );
}

// --- Security --------------------------------------------------------------------

function SecuritySection({
  settings,
  onChanged,
}: {
  settings: PosSettingsDTO;
  onChanged: () => Promise<void>;
}) {
  const { status, refreshStatus, lockNow } = usePinGate();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (remove: boolean) => {
    if (!remove) {
      if (!/^\d{4,8}$/.test(newPin)) return toast.error("PIN must be 4–8 digits");
      if (newPin !== confirmPin) return toast.error("PINs do not match");
    }
    setBusy(true);
    try {
      await apiSend("/api/pos/pin", "PATCH", {
        currentPin: settings.pinSet ? currentPin : undefined,
        newPin: remove ? null : newPin,
      });
      toast.success(remove ? "Admin PIN removed" : "Admin PIN saved");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      await refreshStatus();
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update PIN");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid max-w-xl gap-6">
      <div>
        <h3 className="font-semibold">Admin PIN</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The PIN protects Transaction History, Reports, Exports, Receipt Reprints and
          Branding. Regular selling never asks for it.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-full",
              settings.pinSet ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground",
            )}
          >
            {settings.pinSet ? <ShieldCheck className="size-4" /> : <Lock className="size-4" />}
          </div>
          <div>
            <p className="text-sm font-medium">
              {settings.pinSet ? "PIN protection is on" : "No PIN configured"}
            </p>
            <p className="text-xs text-muted-foreground">
              {settings.pinSet
                ? "Admin areas ask for the PIN and stay unlocked for 15 minutes."
                : "Anyone using this account can open admin areas."}
            </p>
          </div>
        </div>
        {settings.pinSet && status?.unlocked && (
          <Button variant="outline" size="sm" onClick={lockNow}>
            <Lock className="size-3.5" /> Lock now
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        {settings.pinSet && (
          <div className="grid gap-1.5">
            <Label>Current PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="max-w-40 font-mono tracking-[0.3em]"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>{settings.pinSet ? "New PIN" : "PIN (4–8 digits)"}</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="font-mono tracking-[0.3em]"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Confirm PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="font-mono tracking-[0.3em]"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="accent"
            disabled={busy || newPin.length < 4}
            onClick={() => submit(false)}
          >
            {busy ? "Saving…" : settings.pinSet ? "Change PIN" : "Set PIN"}
          </Button>
          {settings.pinSet && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={busy || currentPin.length < 4}
              onClick={() => submit(true)}
            >
              Remove PIN
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
