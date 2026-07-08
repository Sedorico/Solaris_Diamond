"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X, Clock3, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/ui";
import { initials } from "@/lib/utils";
import { apiGet, apiSend, fmtDateTime, PUNCH_LABEL } from "@/lib/attendance/client";
import type { PendingRequestDTO } from "@/lib/attendance/types";

export function ApprovalsTab({
  refreshKey,
  onChanged,
}: {
  refreshKey: number;
  onChanged: () => void;
}) {
  const [requests, setRequests] = useState<PendingRequestDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiGet<{ requests: PendingRequestDTO[] }>("/api/attendance/requests")
      .then((d) => setRequests(d.requests))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function review(id: string, decision: "APPROVE" | "REJECT" | "LATE") {
    setBusy(id);
    try {
      await apiSend(`/api/attendance/requests/${id}`, "POST", { decision });
      toast.success(
        decision === "APPROVE"
          ? "Marked present"
          : decision === "LATE"
            ? "Marked late"
            : "Rejected",
      );
      setRequests((rs) => rs.filter((r) => r.id !== id));
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        title="No pending requests"
        description="Time-in and time-out submissions from employees will appear here for your review."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((r) => (
        <div
          key={r.id}
          className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-premium"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Avatar className="size-11">
                <AvatarFallback>{initials(r.employeeName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{r.employeeName}</p>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {r.employeeCode}
                  </Badge>
                  <Badge variant={r.type === "TIME_IN" ? "accent" : "secondary"}>
                    {PUNCH_LABEL[r.type]}
                  </Badge>
                  {r.suggestLate && (
                    <Badge variant="warning" className="gap-1">
                      <Clock3 className="size-3" /> Looks late
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[r.departmentName, r.position].filter(Boolean).join(" · ") || "—"}
                </p>
                <p className="mt-1.5 text-sm">
                  <span className="text-muted-foreground">Submitted: </span>
                  <span className="font-medium tabular-nums">
                    {fmtDateTime(r.submittedAt)}
                  </span>
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground/80">
                  {r.device === "Mobile" || r.device === "Tablet" ? (
                    <Smartphone className="size-3" />
                  ) : (
                    <Monitor className="size-3" />
                  )}
                  {[r.browser, r.device, r.ipAddress].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="accent"
                disabled={busy === r.id}
                onClick={() => review(r.id, "APPROVE")}
              >
                <Check className="size-4" /> Approve
              </Button>
              {r.type === "TIME_IN" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === r.id}
                  onClick={() => review(r.id, "LATE")}
                >
                  <Clock3 className="size-4" /> Mark late
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                disabled={busy === r.id}
                onClick={() => review(r.id, "REJECT")}
              >
                <X className="size-4" /> Reject
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
