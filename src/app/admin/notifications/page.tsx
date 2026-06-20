"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/ui";

const TYPES = [
  { id: "SYSTEM_ANNOUNCEMENT", label: "System announcement" },
  { id: "MAINTENANCE", label: "Maintenance" },
  { id: "PROMOTIONAL", label: "Promotional" },
] as const;

export default function AdminNotificationsPage() {
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>(
    "SYSTEM_ANNOUNCEMENT",
  );
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      toast.success(`Sent to ${data.sent} users`);
      setTitle("");
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description="Broadcast announcements to every user on the platform."
      />

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Notification type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Scheduled maintenance window"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Message</Label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="The platform will be unavailable from 02:00 to 04:00 PHT…"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <Button
            variant="accent"
            size="lg"
            className="mt-2"
            onClick={send}
            disabled={sending}
          >
            {sending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Send className="size-4" /> Send to all users
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
