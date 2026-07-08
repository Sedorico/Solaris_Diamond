"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  UserCheck,
  Clock3,
  Hourglass,
  UserX,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, fmtDateTime, PUNCH_LABEL } from "@/lib/attendance/client";
import type { OverviewDTO } from "@/lib/attendance/types";
import { ApprovalStatusBadge } from "./status-badge";

export function OverviewTab({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<OverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiGet<OverviewDTO>("/api/attendance/overview")
      .then((d) => active && setData(d))
      .catch((e) => active && toast.error(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  const copyPortal = () => {
    navigator.clipboard.writeText(data.portalUrl);
    toast.success("Portal link copied");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total employees" value={String(data.totalEmployees)} icon={Users} index={0} />
        <StatCard label="Present today" value={String(data.presentToday)} icon={UserCheck} index={1} />
        <StatCard label="Late today" value={String(data.lateToday)} icon={Clock3} index={2} />
        <StatCard label="Pending requests" value={String(data.pendingRequests)} icon={Hourglass} index={3} />
        <StatCard label="Absent today" value={String(data.absentToday)} icon={UserX} index={4} />
        <StatCard label="Approved today" value={String(data.approvedToday)} icon={CheckCircle2} index={5} />
        <StatCard label="Rejected today" value={String(data.rejectedToday)} icon={XCircle} index={6} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        {/* Portal link */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Employee attendance portal
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Share this private link with your team. Employees sign in here to time
            in and out — it is not listed anywhere on your public website.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3.5 py-2.5">
            <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
              {data.portalUrl}
            </code>
            <Button variant="ghost" size="icon-sm" onClick={copyPortal} title="Copy link">
              <Copy className="size-4" />
            </Button>
            <Button asChild variant="ghost" size="icon-sm" title="Open portal">
              <a href={data.portalUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Recent activity
          </p>
          {data.recentActivity.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {data.recentActivity.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.employeeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {PUNCH_LABEL[a.type]} · {fmtDateTime(a.submittedAt)}
                    </p>
                  </div>
                  <ApprovalStatusBadge status={a.approvalStatus} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
