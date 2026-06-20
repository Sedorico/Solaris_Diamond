"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/ui";
import { formatCurrency } from "@/lib/utils";

interface AdminPayment {
  id: string;
  amountCents: number;
  currency: string;
  method: string;
  status: string;
  paymongoIntentId: string | null;
  createdAt: string;
  tenant: { name: string };
}

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/payments")
      .then((r) => r.json())
      .then((d) => setRows(d.payments ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Payments"
        description="Every payment transaction across the platform."
      />

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Tenant</th>
                <th className="px-4 py-3 text-left font-medium">Method</th>
                <th className="px-4 py-3 text-left font-medium">Reference</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString("en-PH")}
                  </td>
                  <td className="px-4 py-3 font-medium">{p.tenant.name}</td>
                  <td className="px-4 py-3 capitalize">{p.method}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.paymongoIntentId ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        p.status === "PAID"
                          ? "success"
                          : p.status === "PENDING"
                            ? "accent"
                            : "warning"
                      }
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(p.amountCents / 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
