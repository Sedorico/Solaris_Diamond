"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 60000);
    return () => window.clearInterval(interval);
  }, [load]);

  async function markAll() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markAllRead" }),
    });
    load();
  }

  async function markOne(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    load();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          {unread > 0 && (
            <button
              onClick={markAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.read && markOne(n.id)}
                className={cn(
                  "flex w-full items-start gap-2 border-b border-border p-3 text-left last:border-0",
                  !n.read && "bg-accent-soft/30",
                )}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {n.message}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {relative(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-accent" />
                )}
                {n.read && (
                  <Check className="mt-1 size-3 shrink-0 text-muted-foreground" />
                )}
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
