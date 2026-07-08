"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Loader2, Send, MessagesSquare, Check } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
import {
  subscribeSupportThread,
  type SupportChannel,
} from "@/lib/support/realtime";
import { cn } from "@/lib/utils";

type ThreadListItem = {
  id: string;
  status: "OPEN" | "CLOSED";
  subject: string | null;
  adminUnread: number;
  updatedAt: string;
  user: { name: string; email: string };
  business: string;
  lastMessage: { body: string; sender: "USER" | "ADMIN"; createdAt: string } | null;
};

type Message = {
  id: string;
  sender: "USER" | "ADMIN";
  body: string;
  createdAt: string;
};

type ThreadDetail = {
  id: string;
  status: "OPEN" | "CLOSED";
  user: { name: string; email: string };
  business: string;
  messages: Message[];
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

export default function AdminSupportPage() {
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<SupportChannel | null>(null);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/admin/support");
    if (res.ok) {
      const data = await res.json();
      setThreads(data.threads ?? []);
    }
    setLoading(false);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/support/${id}`);
    if (res.ok) {
      const data = await res.json();
      setDetail(data.thread ?? null);
    }
  }, []);

  // Initial + polling for the list.
  useEffect(() => {
    const run = () => void loadList();
    const first = window.setTimeout(run, 0);
    const t = window.setInterval(run, 8000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [loadList]);

  // Polling for the open conversation (fallback to realtime below).
  useEffect(() => {
    if (!selectedId) return;
    const run = () => void loadDetail(selectedId);
    const first = window.setTimeout(run, 0);
    const t = window.setInterval(run, 4000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [selectedId, loadDetail]);

  // Instant: receive the user's messages live for the open thread.
  useEffect(() => {
    if (!selectedId) return;
    const ch = subscribeSupportThread(selectedId, (msg) => {
      if (msg.sender !== "USER") return;
      setDetail((d) => {
        if (!d || d.id !== selectedId) return d;
        if (d.messages.some((m) => m.id === msg.id)) return d;
        return {
          ...d,
          messages: [
            ...d.messages,
            {
              id: msg.id,
              sender: "USER",
              body: msg.body,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      });
    });
    channelRef.current = ch;
    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, [selectedId]);

  // Keep the conversation pinned to the latest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [detail]);

  const open = (id: string) => {
    setSelectedId(id);
    setDetail(null);
  };

  const sendReply = async (e: FormEvent) => {
    e.preventDefault();
    const message = draft.trim();
    if (!message || !selectedId || sending) return;
    setSending(true);
    setDraft("");
    try {
      const res = await fetch(`/api/admin/support/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        const data = await res.json();
        setDetail(data.thread ?? null);
        void loadList();
        // Push the reply so the user sees it instantly.
        const msgs = data.thread?.messages ?? [];
        const last = msgs[msgs.length - 1];
        if (last && last.sender === "ADMIN") {
          channelRef.current?.broadcast({
            id: last.id,
            sender: "ADMIN",
            body: last.body,
          });
        }
      }
    } finally {
      setSending(false);
    }
  };

  const closeThread = async () => {
    if (!selectedId) return;
    await fetch(`/api/admin/support/${selectedId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ close: true }),
    });
    void loadDetail(selectedId);
    void loadList();
  };

  const openCount = threads.filter((t) => t.status === "OPEN").length;

  return (
    <div>
      <PageHeader
        title="Support Inbox"
        description="Live chats from your subscribers. Reply and a real person takes over the concierge."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* ── Thread list ── */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Conversations
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              {openCount} open
            </span>
          </div>
          <div className="max-h-[34rem] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : threads.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                No support chats yet.
              </div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => open(t.id)}
                  className={cn(
                    "flex w-full flex-col gap-1 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-foreground/[0.03]",
                    selectedId === t.id && "bg-foreground/[0.05]",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 truncate text-sm font-medium">
                      {t.adminUnread > 0 && (
                        <span className="size-1.5 shrink-0 rounded-full bg-accent" />
                      )}
                      {t.user.name}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {relTime(t.updatedAt)}
                    </span>
                  </div>
                  <span className="truncate text-xs text-muted-foreground">
                    {t.lastMessage
                      ? `${t.lastMessage.sender === "ADMIN" ? "You: " : ""}${t.lastMessage.body}`
                      : t.subject}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="truncate font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/60">
                      {t.business}
                    </span>
                    {t.status === "CLOSED" && (
                      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/50">
                        · closed
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Conversation ── */}
        <div className="flex min-h-[36rem] flex-col rounded-2xl border border-border bg-card">
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <MessagesSquare className="size-8 opacity-40" />
              <p className="text-sm">Select a conversation to reply.</p>
            </div>
          ) : !detail ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate font-display text-lg">{detail.user.name}</p>
                  <p className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {detail.user.email} · {detail.business}
                  </p>
                </div>
                {detail.status === "OPEN" ? (
                  <button
                    onClick={closeThread}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
                  >
                    <Check className="size-3" />
                    Resolve
                  </button>
                ) : (
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                    Closed
                  </span>
                )}
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-5 py-5"
              >
                {detail.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex",
                      m.sender === "ADMIN" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        m.sender === "ADMIN"
                          ? "rounded-br-md bg-accent text-accent-foreground"
                          : "rounded-bl-md border border-border bg-background text-foreground",
                      )}
                    >
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply */}
              <form
                onSubmit={sendReply}
                className="flex items-center gap-2 border-t border-border px-3 py-3"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Reply as Solaris admin…"
                  className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none ring-accent/40 transition focus:border-accent/40 focus:ring-1"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  aria-label="Send reply"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:opacity-90 disabled:opacity-40"
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
