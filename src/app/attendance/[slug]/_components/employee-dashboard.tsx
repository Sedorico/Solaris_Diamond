"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { LogIn, LogOut, Power, History as HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiSend, fmtDate, fmtTime, fmtHours } from "@/lib/attendance/client";
import { ATTENDANCE_STATUS_META } from "@/lib/attendance/client";
import { cn } from "@/lib/utils";
import type { PortalMeDTO } from "@/lib/attendance/types";
import { PortalShell } from "./portal-shell";

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function EmployeeDashboard({
  slug,
  businessName,
  logoUrl,
  onLogout,
}: {
  slug: string;
  businessName: string;
  logoUrl: string | null;
  onLogout: () => void;
}) {
  const [me, setMe] = useState<PortalMeDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const now = useClock();

  const load = useCallback(() => {
    apiGet<PortalMeDTO>(`/api/attendance/portal/${slug}/me`)
      .then(setMe)
      .catch((e) => {
        toast.error((e as Error).message);
        onLogout();
      })
      .finally(() => setLoading(false));
  }, [slug, onLogout]);

  useEffect(() => {
    load();
  }, [load]);

  async function punch(type: "TIME_IN" | "TIME_OUT") {
    setBusy(true);
    try {
      await apiSend(`/api/attendance/portal/${slug}/punch`, "POST", { type });
      toast.success(
        type === "TIME_IN" ? "Timed in — pending approval" : "Timed out — pending approval",
      );
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await apiSend(`/api/attendance/portal/${slug}/logout`, "POST");
    } catch {
      /* ignore */
    }
    onLogout();
  }

  if (loading || !me) {
    return (
      <PortalShell>
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
      </PortalShell>
    );
  }

  const today = me.today;
  const hasTimeIn = !!today?.timeIn && today.status !== "REJECTED";
  const hasTimeOut = !!today?.timeOut;
  const meta = today ? ATTENDANCE_STATUS_META[today.status] : null;

  return (
    <PortalShell>
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="size-10 shrink-0 rounded-xl border border-border bg-card object-contain p-1"
              />
            )}
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
                {businessName}
              </p>
              <h1 className="font-display truncate text-2xl font-normal tracking-tight">
                Hi, {me.employee.fullName.split(" ")[0]}
              </h1>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Log out">
            <Power className="size-5" />
          </Button>
        </div>

        {/* Clock */}
        <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-premium">
          <p className="text-sm text-muted-foreground">
            {now?.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            }) ?? "—"}
          </p>
          <p className="font-display mt-1 text-5xl font-normal tabular-nums tracking-tight">
            {now?.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }) ?? "—:—"}
          </p>
        </div>

        {/* Today's status */}
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Today
            </p>
            {meta ? (
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  meta.className ??
                    (meta.variant === "success"
                      ? "border-transparent bg-success/15 text-success"
                      : meta.variant === "warning"
                        ? "border-transparent bg-warning/15 text-warning"
                        : "border-transparent bg-muted text-muted-foreground"),
                )}
              >
                {meta.label}
              </span>
            ) : (
              <span className="rounded-full border border-transparent bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Not started
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl border border-border/70 py-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Time in
              </p>
              <p className="mt-1 text-lg font-medium tabular-nums">
                {fmtTime(today?.timeIn ?? null)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 py-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Time out
              </p>
              <p className="mt-1 text-lg font-medium tabular-nums">
                {fmtTime(today?.timeOut ?? null)}
              </p>
            </div>
          </div>
        </div>

        {/* Big action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="accent"
            className="h-20 flex-col gap-1 rounded-3xl text-base"
            disabled={busy || hasTimeIn}
            onClick={() => punch("TIME_IN")}
          >
            <LogIn className="size-6" />
            Time In
          </Button>
          <Button
            variant="default"
            className="h-20 flex-col gap-1 rounded-3xl text-base"
            disabled={busy || !hasTimeIn || hasTimeOut}
            onClick={() => punch("TIME_OUT")}
          >
            <LogOut className="size-6" />
            Time Out
          </Button>
        </div>

        {/* History */}
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <HistoryIcon className="size-4 text-muted-foreground" />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Attendance history
            </p>
          </div>
          {me.history.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No records yet.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {me.history.map((h) => {
                const hMeta = ATTENDANCE_STATUS_META[h.status];
                return (
                  <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{fmtDate(h.workDate)}</p>
                      <p className="font-mono text-xs text-muted-foreground tabular-nums">
                        {fmtTime(h.timeIn)} – {fmtTime(h.timeOut)} · {fmtHours(h.workingHours)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        hMeta.className ??
                          (hMeta.variant === "success"
                            ? "border-transparent bg-success/15 text-success"
                            : hMeta.variant === "warning"
                              ? "border-transparent bg-warning/15 text-warning"
                              : "border-transparent bg-muted text-muted-foreground"),
                      )}
                    >
                      {hMeta.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
