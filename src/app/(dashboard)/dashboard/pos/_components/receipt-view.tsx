"use client";

import { Printer, Receipt, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fmtMoney } from "@/lib/pos/client";
import { buildReceiptHtml, openPrintWindow } from "@/lib/pos/exports";
import type { PosReceiptSnapshot } from "@/lib/pos/types";

const Divider = () => <div className="my-3 border-t border-dashed border-border" />;

/** On-screen rendering of a receipt snapshot — mirrors the printed layout. */
export function ReceiptView({ receipt }: { receipt: PosReceiptSnapshot }) {
  const when = new Date(receipt.completedAt);
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-5 font-mono text-xs leading-relaxed">
      <div className="text-center">
        {receipt.business.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={receipt.business.logoUrl}
            alt=""
            className="mx-auto mb-2 max-h-14 max-w-[120px] object-contain"
          />
        )}
        <p className="text-sm font-semibold">{receipt.business.name}</p>
        {receipt.business.address && (
          <p className="text-muted-foreground">{receipt.business.address}</p>
        )}
        {receipt.business.contactNumber && (
          <p className="text-muted-foreground">{receipt.business.contactNumber}</p>
        )}
        {receipt.headerMessage && (
          <p className="mt-1 text-muted-foreground">{receipt.headerMessage}</p>
        )}
      </div>
      <Divider />
      <p>
        Receipt #: <strong>{receipt.receiptNo}</strong>
      </p>
      <p>Txn #: {receipt.ref}</p>
      <p>
        {when.toLocaleDateString("en-PH", { dateStyle: "medium" })} ·{" "}
        {when.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
      </p>
      <p>Cashier: {receipt.cashier}</p>
      {receipt.customer && <p>Customer: {receipt.customer}</p>}
      <Divider />
      {receipt.lines.map((l, i) => (
        <div key={i} className="flex justify-between gap-2 py-0.5">
          <span className="min-w-0 flex-1 truncate">
            {l.qty}× {l.name}
          </span>
          <span className="shrink-0 text-muted-foreground">{fmtMoney(l.price)}</span>
          <span className="w-16 shrink-0 text-right">{fmtMoney(l.lineTotal)}</span>
        </div>
      ))}
      <Divider />
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{fmtMoney(receipt.subtotal)}</span>
      </div>
      {receipt.discount > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>Discount</span>
          <span>−{fmtMoney(receipt.discount)}</span>
        </div>
      )}
      {receipt.tax && (
        <div className="flex justify-between text-muted-foreground">
          <span>
            {receipt.tax.label}
            {receipt.tax.included ? " incl." : ""}
          </span>
          <span>{fmtMoney(receipt.tax.amount)}</span>
        </div>
      )}
      <div className="mt-1 flex justify-between text-sm font-semibold">
        <span>TOTAL</span>
        <span>{fmtMoney(receipt.total)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Paid via</span>
        <span>{receipt.method}</span>
      </div>
      {receipt.cashReceived != null && (
        <div className="flex justify-between text-muted-foreground">
          <span>Cash received</span>
          <span>{fmtMoney(receipt.cashReceived)}</span>
        </div>
      )}
      {receipt.change != null && (
        <div className="flex justify-between text-muted-foreground">
          <span>Change</span>
          <span>{fmtMoney(receipt.change)}</span>
        </div>
      )}
      <Divider />
      <div className="text-center">
        {receipt.thankYouMessage && <p>{receipt.thankYouMessage}</p>}
        {receipt.footerMessage && (
          <p className="mt-1 text-muted-foreground">{receipt.footerMessage}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Receipt dialog — used right after checkout (with change callout + new sale)
 * and from history (view / reprint).
 */
export function ReceiptDialog({
  receipt,
  open,
  onOpenChange,
  onNewSale,
  celebrate = false,
}: {
  receipt: PosReceiptSnapshot | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onNewSale?: () => void;
  celebrate?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {celebrate ? (
              <Sparkles className="size-5 text-accent" />
            ) : (
              <Receipt className="size-5 text-accent" />
            )}
            {celebrate ? "Payment complete" : "Receipt"}
          </DialogTitle>
        </DialogHeader>

        {receipt && (
          <>
            {celebrate && receipt.change != null && receipt.change > 0 && (
              <div className="rounded-xl bg-success/10 px-4 py-3 text-center">
                <p className="text-xs font-medium uppercase tracking-widest text-success">
                  Change due
                </p>
                <p className="font-display mt-1 text-4xl tabular-nums text-success">
                  {fmtMoney(receipt.change)}
                </p>
              </div>
            )}
            <div className="max-h-80 overflow-y-auto">
              <ReceiptView receipt={receipt} />
            </div>
            <div className="flex gap-2">
              <Button
                variant={onNewSale ? "outline" : "accent"}
                className="flex-1"
                onClick={() => openPrintWindow(buildReceiptHtml(receipt))}
              >
                <Printer className="size-4" /> Print / PDF
              </Button>
              {onNewSale ? (
                <Button variant="accent" className="flex-1" onClick={onNewSale}>
                  New sale
                </Button>
              ) : (
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
