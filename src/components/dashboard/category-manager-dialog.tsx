"use client";

import { useState } from "react";
import { Plus, Tag, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ManagedCategory {
  id: string;
  name: string;
  color?: string;
  isDefault?: boolean;
}

const PALETTE = [
  "#5E81AC", "#BF616A", "#A3BE8C", "#D08770",
  "#88C0D0", "#EBCB8B", "#B48EAD", "#9ca3af",
];

/**
 * Shared "Manage categories" dialog — the Expenses-style layout (dashed
 * add/edit row with a colour palette, then a card list with edit/delete).
 * Used by Sales and Inventory so all three modules look identical.
 */
export function CategoryManagerDialog({
  open,
  onOpenChange,
  categories,
  onAdd,
  onUpdate,
  onDelete,
  usageCount,
  usageNoun = "item",
  placeholder = "e.g. Software",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  categories: ManagedCategory[];
  onAdd: (name: string, color: string) => void;
  onUpdate: (id: string, name: string, color: string) => void;
  onDelete: (id: string) => void;
  usageCount?: (cat: ManagedCategory) => number;
  usageNoun?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState<ManagedCategory | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);

  function reset() {
    setEditing(null);
    setName("");
    setColor(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
  }
  function openEdit(cat: ManagedCategory) {
    setEditing(cat);
    setName(cat.name);
    setColor(cat.color ?? PALETTE[0]);
  }
  function save() {
    const val = name.trim();
    if (!val) return;
    if (editing) onUpdate(editing.id, val, color);
    else onAdd(val, color);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage categories</DialogTitle>
          <DialogDescription>
            Defaults are seeded; add your own, edit, or delete any not in use.
          </DialogDescription>
        </DialogHeader>

        {/* Add / edit form */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-card/50 p-3">
          <Tag className="size-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
            className="h-9 max-w-xs text-sm"
          />
          <div className="flex items-center gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "size-5 rounded-full border-2 transition-all",
                  color === c ? "border-foreground scale-110" : "border-transparent",
                )}
                style={{ backgroundColor: c }}
                aria-label={`Pick color ${c}`}
              />
            ))}
          </div>
          <Button onClick={save} variant="accent" size="sm">
            <Plus className="size-4" /> {editing ? "Update" : "Add category"}
          </Button>
          {editing && (
            <Button onClick={reset} variant="ghost" size="sm">
              Cancel
            </Button>
          )}
        </div>

        {/* Category list */}
        <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {categories.map((cat) => {
            const n = usageCount?.(cat) ?? 0;
            return (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color ?? "#9ca3af" }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {n} {usageNoun}
                      {n === 1 ? "" : "s"}
                      {cat.isDefault && " · default"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(cat)} title="Edit">
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDelete(cat.id)}
                    title="Delete"
                  >
                    <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
          {categories.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
              No categories yet — add one above.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
