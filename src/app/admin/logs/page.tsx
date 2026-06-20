"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, ScrollText } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  createdAt: string;
  user: { fullName: string; email: string } | null;
  tenant: { name: string; businessName: string | null };
}

interface SystemRow {
  id: string;
  level: string;
  scope: string;
  message: string;
  createdAt: string;
}

type Source = "audit" | "system";

const ACTION_FILTERS = [
  { label: "All actions", value: "" },
  { label: "User events", value: "USER_SUSPENDED" },
  { label: "Subscriptions", value: "SUBSCRIPTION_CREATED" },
  { label: "Stock movement", value: "STOCK_IN" },
  { label: "POS", value: "POS_TRANSACTION_CREATED" },
];

function actionTone(action: string): "success" | "warning" | "accent" | "muted" {
  if (
    action.includes("CREATED") ||
    action.includes("ACTIVATED") ||
    action.includes("REACTIVATED") ||
    action.includes("RENEWED")
  ) {
    return "success";
  }
  if (
    action.includes("DELETED") ||
    action.includes("SUSPENDED") ||
    action.includes("EXPIRED") ||
    action.includes("FAILED") ||
    action.includes("CANCELED") ||
    action.includes("VOIDED")
  ) {
    return "warning";
  }
  if (action.includes("UPDATED") || action.includes("EDITED")) {
    return "accent";
  }
  return "muted";
}

export default function AdminLogsPage() {
  const [source, setSource] = useState<Source>("audit");
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [system, setSystem] = useState<SystemRow[]>([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ source });
    if (search) params.set("search", search);
    if (action) params.set("action", action);
    const res = await fetch(`/api/admin/logs?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.source === "audit") setAudit(data.logs ?? []);
      else setSystem(data.logs ?? []);
    }
    setLoading(false);
  }, [source, search, action]);

  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Audit Logs"
        description="Every important platform event — searchable and filterable."
      >
        <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-0.5 text-xs">
          {(["audit", "system"] as Source[]).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium capitalize transition-colors",
                source === s
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s} logs
            </button>
          ))}
        </div>
      </PageHeader>

      <SectionCard>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search entity, label…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {source === "audit" && (
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              {ACTION_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : source === "audit" ? (
          audit.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <ScrollText className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No audit events match those filters.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {audit.map((row) => (
                <li
                  key={row.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-t border-border py-3 first:border-0"
                >
                  <Badge variant={actionTone(row.action)}>
                    {row.action.toLowerCase().replace(/_/g, " ")}
                  </Badge>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {row.entityLabel ?? row.entityType}
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        · {row.entityType}#{row.entityId.slice(0, 8)}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.tenant.businessName ?? row.tenant.name}
                      {row.user && ` · by ${row.user.fullName}`}
                    </p>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : system.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <ScrollText className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No system events yet.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col">
            {system.map((row) => (
              <li
                key={row.id}
                className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 border-t border-border py-3 first:border-0"
              >
                <Badge
                  variant={
                    row.level === "error"
                      ? "warning"
                      : row.level === "warn"
                        ? "accent"
                        : "muted"
                  }
                >
                  {row.level}
                </Badge>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {row.scope}
                </span>
                <p className="min-w-0 truncate text-sm">{row.message}</p>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString("en-PH", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
