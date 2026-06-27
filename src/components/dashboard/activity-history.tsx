"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  History,
  Printer,
  Plus,
  Archive,
  RotateCcw,
  Trash2,
  Pencil,
  ArrowUp,
  ArrowDown,
  Activity,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ActivityEntry {
  id: string;
  action: string; // raw enum, e.g. "PRODUCT_ARCHIVED"
  label?: string; // entity label (name / ref)
  user?: string;
  createdAt: string;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function prettyAction(a: string) {
  const s = a.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function actionMeta(a: string): { icon: LucideIcon; color: string; ring: string } {
  if (a.includes("CREATED")) return { icon: Plus, color: "text-success", ring: "bg-success/15" };
  if (a.includes("RESTORED")) return { icon: RotateCcw, color: "text-accent", ring: "bg-accent/15" };
  if (a.includes("ARCHIVED")) return { icon: Archive, color: "text-warning", ring: "bg-warning/15" };
  if (a.includes("DELETED")) return { icon: Trash2, color: "text-destructive", ring: "bg-destructive/15" };
  if (a.includes("UPDATED")) return { icon: Pencil, color: "text-foreground/70", ring: "bg-secondary" };
  if (a.includes("STOCK_IN")) return { icon: ArrowUp, color: "text-success", ring: "bg-success/15" };
  if (a.includes("STOCK_OUT")) return { icon: ArrowDown, color: "text-destructive", ring: "bg-destructive/15" };
  return { icon: Activity, color: "text-muted-foreground", ring: "bg-secondary" };
}

/** Opens a print window with the full history for saving as PDF. */
export function printActivityHistory(title: string, entries: ActivityEntry[]) {
  const w = window.open("", "_blank");
  if (!w) return;
  const now = new Date().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" });
  const rows = entries
    .map(
      (e) => `<tr>
        <td>${fmtDateTime(e.createdAt)}</td>
        <td><strong>${prettyAction(e.action)}</strong></td>
        <td>${e.label ?? "—"}</td>
        <td>${e.user ?? "—"}</td>
      </tr>`,
    )
    .join("");
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>* { margin:0;padding:0;box-sizing:border-box; }
    body { font-family:'Inter',system-ui,sans-serif;color:#1a1a1a;padding:40px;font-size:13px; }
    .header { display:flex;justify-content:space-between;margin-bottom:32px;border-bottom:2px solid #1a1a1a;padding-bottom:16px; }
    .brand { font-size:20px;font-weight:700; } .brand span { color:#C98A3C; }
    table { width:100%;border-collapse:collapse; }
    th { background:#f5f5f5;text-align:left;padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#666;border-bottom:1px solid #e0e0e0; }
    td { padding:8px 10px;border-bottom:1px solid #f0f0f0; }
    .footer { margin-top:32px;padding-top:12px;border-top:1px solid #e0e0e0;font-size:11px;color:#999;text-align:center; }
    </style></head><body>
    <div class="header"><div class="brand">Solaris <span>Diamond</span></div>
    <div style="text-align:right;font-size:11px;color:#666"><strong>${title}</strong><br>Generated: ${now}<br>${entries.length} entries</div></div>
    <table><thead><tr><th>Date &amp; Time</th><th>Action</th><th>Item</th><th>By</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="footer">Solaris Diamond — Confidential. · Generated ${now}</div>
    <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
    </body></html>`);
  w.document.close();
}

/** Glass timeline of read-only activity entries. */
function ActivityTimeline({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
        <History className="size-8 opacity-25" />
        No history yet.
      </div>
    );
  }
  return (
    <ol className="flex flex-col">
      {entries.map((e, i) => {
        const m = actionMeta(e.action);
        const Icon = m.icon;
        const last = i === entries.length - 1;
        return (
          <li key={e.id} className="relative flex gap-3 pb-3 last:pb-0">
            {!last && (
              <span className="absolute left-[15px] top-9 bottom-1 w-px bg-border/70" />
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full",
                m.ring,
              )}
            >
              <Icon className={cn("size-4", m.color)} />
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-border/50 bg-card/50 px-3.5 py-2.5 backdrop-blur-md transition-colors hover:bg-card/80">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{prettyAction(e.action)}</p>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {fmtDateTime(e.createdAt)}
                </span>
              </div>
              {(e.label || e.user) && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {e.label && <span className="font-mono">{e.label}</span>}
                  {e.label && e.user ? " · " : ""}
                  {e.user}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function HistoryHeader({
  count,
  onPrint,
}: {
  count: number;
  onPrint: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent/12 text-accent">
          <History className="size-4" />
        </span>
        <div>
          <p className="text-sm font-medium">Activity history</p>
          <p className="text-xs text-muted-foreground">
            {count} entr{count === 1 ? "y" : "ies"} · read-only
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onPrint} disabled={count === 0}>
        <Printer className="size-4" /> Print PDF
      </Button>
    </div>
  );
}

/** Read-only activity history as a DRAWER (button → Sheet). */
export function ActivityHistory({
  title,
  triggerLabel = "History",
  entries,
}: {
  title: string;
  triggerLabel?: string;
  entries: ActivityEntry[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <History className="size-4" /> {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="glass-strong flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <HistoryHeader
          count={entries.length}
          onPrint={() => printActivityHistory(title, entries)}
        />
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ActivityTimeline entries={entries} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Read-only activity history as an INLINE PANEL — for embedding inside a tab or
 * card. Glass styling, read-only, with a Print-to-PDF button.
 */
export function ActivityHistoryPanel({
  title,
  entries,
}: {
  title: string;
  entries: ActivityEntry[];
}) {
  return (
    <div>
      <HistoryHeader
        count={entries.length}
        onPrint={() => printActivityHistory(title, entries)}
      />
      <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
        <ActivityTimeline entries={entries} />
      </div>
    </div>
  );
}
