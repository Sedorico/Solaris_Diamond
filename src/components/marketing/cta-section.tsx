"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type Variants } from "motion/react";
import {
  ArrowUpRight,
  ArrowRight,
  ChevronUp,
  Headphones,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { SmokeScene } from "@/components/three/smoke";
import { DiamondMark } from "@/components/logo";
import { cn } from "@/lib/utils";
import { useConcierge } from "@/lib/store/concierge";
import { getBusinessContext } from "@/lib/ai/business-context";
import { useSession } from "@/lib/auth/hooks";
import type { ServiceId } from "@/lib/data/services";
import {
  subscribeSupportThread,
  type SupportChannel,
} from "@/lib/support/realtime";

/**
 * One "window into a deeper layer".
 *
 * The scene lives on its own isolated background layer: a single `position:
 * fixed` element pinned to the viewport, sitting behind the whole page
 * (`-z-[1]` is in front of the global mesh shader at `-z-10`, but behind every
 * normal section). A scroll-driven `clip-path` reveals that fixed layer only
 * across the band currently occupied by the normal-flow window spacer — so the
 * scene reads as a deeper layer the page glides over. Nothing else is touched.
 */
function RevealLayer({
  children,
  front,
}: {
  children: ReactNode;
  front?: ReactNode;
}) {
  const windowRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const win = windowRef.current;
    if (!win) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = win.getBoundingClientRect();
      const vh = window.innerHeight;
      const hidden = rect.bottom <= 0 || rect.top >= vh;
      const top = Math.max(0, rect.top);
      const bottom = Math.max(0, vh - rect.bottom);
      const clip = `inset(${top}px 0px ${bottom}px 0px)`;

      // Both layers share the exact same reveal window so they read as one
      // fixed CTA: smoke behind (covered by the page), invite in front (clickable).
      for (const layer of [backRef.current, frontRef.current]) {
        if (!layer) continue;
        if (hidden) {
          layer.style.visibility = "hidden";
        } else {
          layer.style.visibility = "visible";
          layer.style.clipPath = clip;
        }
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* Deeper layer — behind the page, covered by every normal section. */}
      <div
        ref={backRef}
        className="pointer-events-none fixed inset-0 -z-[1] overflow-hidden bg-background"
        style={{ visibility: "hidden", clipPath: "inset(50% 0px 50% 0px)" }}
      >
        {children}
      </div>
      {/* Front layer — same pinned reveal window, but in front so its content
          stays interactive. The layer ignores pointer events; only the invite
          inside (pointer-events-auto) is clickable, and clip-path keeps it from
          ever spilling over the sections above or below. */}
      {front && (
        <div
          ref={frontRef}
          className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
          style={{ visibility: "hidden", clipPath: "inset(50% 0px 50% 0px)" }}
        >
          {front}
        </div>
      )}
      <div ref={windowRef} aria-hidden className="pointer-events-none h-[90vh]" />
    </>
  );
}

// ── Concierge quick prompts. The chip shows a short label, sends a full ask,
// and is tagged with the module it needs so we only show prompts the subscriber
// actually has access to. "general" prompts always show. ──
type Reply = { label: string; prompt: string; module: ServiceId | "general" };

const QUICK_REPLIES: Reply[] = [
  {
    label: "Summarize today",
    prompt: "Summarize today's business performance in a few lines.",
    module: "general",
  },
  {
    label: "Today's profit",
    prompt:
      "How much profit did I make today, and what's eating into my margins?",
    module: "sales",
  },
  {
    label: "Low stock",
    prompt:
      "Which products are running low on stock, and how much should I reorder?",
    module: "inventory",
  },
  {
    label: "Top sellers",
    prompt: "What are my best-selling products this week, and why?",
    module: "sales",
  },
  {
    label: "Slow movers",
    prompt:
      "Which products are barely selling this week, and what should I do about them?",
    module: "sales",
  },
  {
    label: "Sales vs last week",
    prompt: "How did sales go this week compared to last week?",
    module: "sales",
  },
  {
    label: "Expenses",
    prompt: "Where is my money going this week? Break down my expenses.",
    module: "expenses",
  },
  {
    label: "Attendance",
    prompt: "Who showed up today, and was anyone late?",
    module: "attendance",
  },
  {
    label: "What should I improve?",
    prompt:
      "Based on my data, what are the top 3 things I should do to improve my business this week?",
    module: "general",
  },
  {
    label: "Business health",
    prompt: "How healthy is my business overall right now? Give me the verdict.",
    module: "general",
  },
  {
    label: "Weekly report",
    prompt: "Give me a quick weekly business report across everything I track.",
    module: "general",
  },
  {
    label: "Any red flags?",
    prompt: "Are there any red flags or problems I should worry about right now?",
    module: "general",
  },
  {
    label: "Biggest win",
    prompt: "What was my biggest win this week?",
    module: "general",
  },
  {
    label: "What needs attention?",
    prompt: "What in my business needs my attention today?",
    module: "general",
  },
];

type ChatMessage = {
  id: number;
  from: "bot" | "user";
  text: string;
  followups?: string[];
};

const GREETING: ChatMessage = {
  id: 0,
  from: "bot",
  text: "Good day. I'm your Solaris business assistant — ask me anything about your sales, inventory, expenses, or attendance, and I'll break it down for you. Pick a prompt below or just type.",
};

// ── Chat persistence + follow-up parsing ────────────────────────────────────
const CHAT_STORAGE_KEY = "solaris-concierge-chat-v1";

function loadSavedChat(): ChatMessage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const msgs = parsed.filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m.id === "number" &&
        typeof m.text === "string" &&
        (m.from === "bot" || m.from === "user"),
    );
    return msgs.length > 1 ? msgs.slice(-60) : null;
  } catch {
    return null;
  }
}

// The assistant ends every reply with "FOLLOWUPS: q1 | q2 | q3" — split that
// off into clickable chips (and hide the partially-streamed line meanwhile).
function splitFollowups(raw: string): { text: string; followups?: string[] } {
  const m = raw.match(/\n\s*FOLLOWUPS:\s*([^\n]*)\s*$/i);
  if (!m || m.index === undefined) return { text: raw.trimEnd() };
  const text = raw.slice(0, m.index).trimEnd();
  const followups = m[1]
    .split("|")
    .map((s) => s.trim().replace(/^[-•]\s*/, ""))
    .filter(Boolean)
    .slice(0, 3);
  return followups.length ? { text, followups } : { text };
}

function stripStreamingFollowups(raw: string): string {
  // While streaming, hide a trailing FOLLOWUPS line (even a partially-typed
  // "FOLLO…") so it never flashes in the bubble before the chips render.
  const idx = raw.lastIndexOf("\n");
  if (idx === -1) return raw;
  const last = raw.slice(idx + 1).trim();
  if (!last) return raw;
  const marker = "FOLLOWUPS:";
  const isFull = last.toUpperCase().startsWith(marker);
  const isPartial = marker.startsWith(last.toUpperCase());
  return isFull || isPartial ? raw.slice(0, idx).trimEnd() : raw;
}

// Editorial contact register — numbered, hairline-ruled, no cards. Each row is
// a real, clickable channel.
const REGISTER = [
  {
    no: "i",
    label: "Email",
    detail: "solarisdiems@gmail.com",
    href: "mailto:solarisdiems@gmail.com",
  },
  {
    no: "ii",
    label: "Facebook",
    detail: "Message us",
    href: "https://www.facebook.com/profile.php?id=61590597993727",
    external: true,
  },
  {
    no: "iii",
    label: "Phone",
    detail: "0924 126 1246",
    href: "tel:+639241261246",
  },
];

const containerV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.42 } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

// Slow, breathing accent dot — a refined "available" mark, not a SaaS badge.
function LiveDot() {
  return (
    <span className="relative flex size-1.5">
      <motion.span
        className="absolute inset-0 rounded-full bg-accent"
        animate={{ scale: [1, 2.6, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
      />
      <span className="relative size-1.5 rounded-full bg-accent" />
    </span>
  );
}

// ── The conversation — typeset as a dialogue, not chat bubbles ──────────────
function Conversation() {
  const { user, subscribedServices } = useSession();
  // Show only prompts for modules the subscriber has (plus "general"). Logged
  // out (no user) → show everything for the public demo.
  const replies = QUICK_REPLIES.filter(
    (r) =>
      r.module === "general" || !user || subscribedServices.includes(r.module),
  );
  // General prompts stay as always-visible chips; subscription-specific ones
  // live in a drop-up menu so the bar never gets crowded.
  const generalReplies = replies.filter((r) => r.module === "general");
  const moduleReplies = replies.filter((r) => r.module !== "general");

  const [messages, setMessages] = useState<ChatMessage[]>(
    () => loadSavedChat() ?? [GREETING],
  );
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [humanMode, setHumanMode] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);

  // Restored conversations must keep allocating ids above what's saved.
  useEffect(() => {
    const maxId = messages.reduce((m, x) => Math.max(m, x.id), 0);
    if (idRef.current <= maxId) idRef.current = maxId + 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the conversation so a refresh (or closing the concierge) never
  // loses it. Capped so localStorage stays small.
  useEffect(() => {
    try {
      localStorage.setItem(
        CHAT_STORAGE_KEY,
        JSON.stringify(messages.slice(-60)),
      );
    } catch {
      // storage full/blocked — persistence is best-effort
    }
  }, [messages]);

  const clearChat = () => {
    if (busy) return;
    setMessages([GREETING]);
    setHumanMode(false);
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      // ignore
    }
  };
  // Support-message ids already shown, so realtime + polling never duplicate.
  const seenSupport = useRef<Set<string>>(new Set());
  const channelRef = useRef<SupportChannel | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Instant (not smooth) — streaming updates fire this many times per second,
    // and a smooth animation keeps restarting and never reaches the growing
    // bottom. Jump straight to the latest so the convo always follows along.
    el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  // Merge any not-yet-shown messages from a live support thread into the chat.
  const mergeThread = useCallback(
    (thread: { messages?: { id: string; sender: string; body: string }[] } | null) => {
      if (!thread?.messages) return;
      const additions: ChatMessage[] = [];
      for (const m of thread.messages) {
        if (seenSupport.current.has(m.id)) continue;
        seenSupport.current.add(m.id);
        additions.push({
          id: idRef.current++,
          from: m.sender === "ADMIN" ? "bot" : "user",
          text: m.body,
        });
      }
      if (additions.length) setMessages((cur) => [...cur, ...additions]);
      // If the admin just replied and we're showing it, clear the user's
      // unread flag so the floating bubble goes away.
      if (additions.some((a) => a.from === "bot")) {
        void fetch("/api/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markRead: true }),
        });
      }
    },
    [],
  );

  // On open, resume any active live admin chat so the admin's replies show
  // (fixes replies not appearing after the concierge was closed and reopened).
  useEffect(() => {
    let cancelled = false;
    const resume = async () => {
      try {
        const res = await fetch("/api/support");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.thread) return;
        setThreadId(data.thread.id);
        mergeThread(data.thread);
        setHumanMode(true);
      } catch {
        // not logged in / no thread → stay in AI mode
      }
    };
    const t = window.setTimeout(resume, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [mergeThread]);

  // While connected to a human, poll for admin replies (and detect resolve).
  useEffect(() => {
    if (!humanMode) return;
    const run = async () => {
      try {
        const res = await fetch("/api/support");
        if (!res.ok) return;
        const data = await res.json();
        if (data.thread) {
          mergeThread(data.thread);
        } else {
          // GET only returns OPEN threads — null means the admin resolved it.
          setHumanMode(false);
          setMessages((m) => [
            ...m,
            {
              id: idRef.current++,
              from: "bot",
              text: "— The admin marked this chat as resolved. I'm back and happy to help anytime. 💬",
            },
          ]);
        }
      } catch {
        // transient — next tick retries
      }
    };
    const first = window.setTimeout(run, 0);
    const t = window.setInterval(run, 4000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [humanMode, mergeThread]);

  // Instant delivery of admin replies via Supabase Broadcast (the poll above is
  // the fallback). Append any ADMIN message we haven't shown yet.
  useEffect(() => {
    if (!humanMode || !threadId) return;
    const ch = subscribeSupportThread(threadId, (msg) => {
      if (msg.sender !== "ADMIN" || seenSupport.current.has(msg.id)) return;
      seenSupport.current.add(msg.id);
      setMessages((m) => [
        ...m,
        { id: idRef.current++, from: "bot", text: msg.body },
      ]);
    });
    channelRef.current = ch;
    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, [humanMode, threadId]);

  // Send a message to the human admin (support thread) instead of the AI.
  const sendToHuman = async (text: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (data.thread?.id) setThreadId(data.thread.id);
      mergeThread(data.thread);
      // Push the just-sent message so the admin sees it instantly.
      const msgs: { id: string; sender: string; body: string }[] =
        data.thread?.messages ?? [];
      const last = msgs[msgs.length - 1];
      if (last && last.sender === "USER") {
        channelRef.current?.broadcast({
          id: last.id,
          sender: "USER",
          body: last.body,
        });
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: idRef.current++,
          from: "bot",
          text: "Couldn't send that to the admin — please try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  // Stream a real answer from the AI, grounded in this browser's business data.
  const send = async (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    if (humanMode) {
      void sendToHuman(value);
      return;
    }

    const userMsg: ChatMessage = {
      id: idRef.current++,
      from: "user",
      text: value,
    };
    const history = [...messages, userMsg];
    setMessages(history);
    setBusy(true);
    setTyping(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({
            role: m.from === "user" ? "user" : "assistant",
            content: m.text,
          })),
          context: getBusinessContext(
            user ? { modules: subscribedServices } : undefined,
          ),
        }),
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));

      const botId = idRef.current++;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let started = false;
      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        acc += decoder.decode(chunk, { stream: true });
        const shown = stripStreamingFollowups(acc);
        if (!started) {
          started = true;
          setTyping(false);
          setMessages((m) => [...m, { id: botId, from: "bot", text: shown }]);
        } else {
          setMessages((m) =>
            m.map((x) => (x.id === botId ? { ...x, text: shown } : x)),
          );
        }
      }
      if (!started) {
        setMessages((m) => [
          ...m,
          { id: botId, from: "bot", text: "Could you rephrase that?" },
        ]);
      } else {
        // Stream finished — split the FOLLOWUPS line into clickable chips.
        const { text: finalText, followups } = splitFollowups(acc);
        setMessages((m) =>
          m.map((x) =>
            x.id === botId ? { ...x, text: finalText, followups } : x,
          ),
        );
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: idRef.current++,
          from: "bot",
          text: "Sorry, I couldn't reach the assistant right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setTyping(false);
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = draft;
    setDraft("");
    void send(value);
  };

  // Request a real admin to take over — persists a support thread the admin
  // inbox picks up.
  const talkToHuman = async () => {
    if (busy || requesting) return;
    setRequesting(true);
    const note = (text: string) =>
      setMessages((m) => [...m, { id: idRef.current++, from: "bot", text }]);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "I'd like to talk to a Solaris admin.",
        }),
      });
      if (res.status === 401) {
        note(
          "To reach a human admin I'll need you signed in first — please log in, then tap “Talk to a human” again. In the meantime, I can still help you here.",
        );
      } else if (!res.ok) {
        throw new Error(String(res.status));
      } else {
        const data = await res.json();
        if (data.thread?.id) setThreadId(data.thread.id);
        mergeThread(data.thread);
        setHumanMode(true);
        note(
          "🔔 Connected — a Solaris admin has been notified and will reply right here. You're now chatting with a real person; just type below to message them directly.",
        );
      }
    } catch {
      note("Couldn't reach support just now. Please try again in a moment.");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Speaker line */}
      <div className="flex items-start justify-between gap-4 border-b border-foreground/15 pb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            In conversation with
          </p>
          <p className="font-display mt-1.5 text-2xl italic tracking-[-0.01em]">
            {humanMode ? "Solaris Admin" : "Solaris AI"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2.5">
          <span className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {messages.length > 1 && !humanMode && (
              <button
                onClick={clearChat}
                disabled={busy}
                aria-label="Start a new conversation"
                title="New conversation"
                className="flex items-center gap-1.5 text-muted-foreground/70 transition-colors hover:text-foreground disabled:opacity-40"
              >
                <RotateCcw className="size-3" />
                New
              </button>
            )}
            <span className="flex items-center gap-2">
              <LiveDot />
              {humanMode ? "Live with admin" : "Available"}
            </span>
          </span>
          {humanMode ? (
            <button
              onClick={() => setHumanMode(false)}
              className="group flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Sparkles className="size-3.5" />
              Back to assistant
            </button>
          ) : (
            <button
              onClick={() => void talkToHuman()}
              disabled={busy || requesting}
              className="group flex items-center gap-2 rounded-full border border-accent/40 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-accent transition-colors hover:bg-accent/10 disabled:opacity-40"
            >
              <Headphones className="size-3.5" />
              {requesting ? "Connecting…" : "Connect to admin"}
            </button>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div
        ref={scrollRef}
        className="no-scrollbar min-h-0 flex-1 space-y-7 overflow-y-auto py-7 pr-1"
      >
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={cn("max-w-[88%]", m.from === "user" && "ml-auto text-right")}
          >
            <p
              className={cn(
                "mb-2 font-mono text-[9px] uppercase tracking-[0.4em]",
                m.from === "user"
                  ? "text-muted-foreground"
                  : "text-accent [text-shadow:none]",
              )}
            >
              {m.from === "user" ? "You" : "Solaris"}
            </p>
            <p
              className={cn(
                "font-display text-pretty text-base leading-relaxed sm:text-[17px]",
                m.from === "user"
                  ? "inline-block border-r-2 border-accent pr-4 text-foreground"
                  : "border-l-2 border-foreground/15 pl-4 text-foreground/90",
              )}
            >
              {m.text}
            </p>

            {/* Suggested follow-ups — only on the latest reply, so old chips
                never clutter the transcript. */}
            {m.from === "bot" &&
              !!m.followups?.length &&
              m.id === messages[messages.length - 1]?.id &&
              !busy && (
                <div className="mt-3 flex flex-wrap gap-2 pl-4">
                  {m.followups.map((q) => (
                    <button
                      key={q}
                      onClick={() => void send(q)}
                      className="rounded-full border border-accent/35 px-3.5 py-1.5 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-accent transition-colors hover:bg-accent/10"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
          </motion.div>
        ))}

        <AnimatePresence>
          {typing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-[88%]"
            >
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.4em] text-accent [text-shadow:none]">
                Solaris
              </p>
              <span className="flex gap-1.5 border-l-2 border-foreground/15 pl-4">
                {[0, 0.18, 0.36].map((d) => (
                  <motion.span
                    key={d}
                    className="size-1 rounded-full bg-foreground/40"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: d }}
                  />
                ))}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Subjects — general prompts stay; subscription-specific live in a
          drop-up. Hidden while chatting with a human admin. */}
      {humanMode ? (
        <p className="border-t border-foreground/15 pt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          You&rsquo;re chatting with a Solaris admin — their replies appear above.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-foreground/15 pt-5">
        {generalReplies.map((r) => (
          <button
            key={r.label}
            onClick={() => send(r.prompt)}
            disabled={busy}
            className="group font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <span className="border-b border-transparent pb-1 transition-colors duration-300 group-hover:border-accent">
              {r.label}
            </span>
          </button>
        ))}

        {moduleReplies.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              disabled={busy}
              aria-expanded={menuOpen}
              className="group flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-accent transition-colors hover:text-foreground disabled:opacity-40"
            >
              <span className="border-b border-accent/40 pb-1 transition-colors duration-300 group-hover:border-accent">
                Suggested for you
              </span>
              <ChevronUp
                className={cn(
                  "size-3 transition-transform duration-300",
                  menuOpen ? "rotate-180" : "rotate-0",
                )}
              />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <>
                  <button
                    aria-hidden
                    tabIndex={-1}
                    onClick={() => setMenuOpen(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute bottom-full left-0 z-50 mb-3 w-64 overflow-hidden rounded-xl border border-border bg-background/95 p-1 shadow-premium backdrop-blur-xl"
                  >
                    {moduleReplies.map((r) => (
                      <button
                        key={r.label}
                        onClick={() => {
                          setMenuOpen(false);
                          void send(r.prompt);
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.05]"
                      >
                        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/85">
                          {r.label}
                        </span>
                        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/55">
                          {r.module}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
        </div>
      )}

      {/* Composer — a single editorial line, not a boxed input */}
      <form
        onSubmit={onSubmit}
        className="mt-5 flex items-center gap-4 border-b border-foreground/25 pb-3 transition-colors focus-within:border-accent"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            humanMode
              ? busy
                ? "Sending…"
                : "Message the admin…"
              : busy
                ? "Thinking…"
                : "Ask about your business…"
          }
          disabled={busy}
          className="flex-1 bg-transparent text-[15px] outline-none placeholder:italic placeholder:text-muted-foreground/60 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!draft.trim() || busy}
          aria-label="Send"
          className="text-muted-foreground transition-all duration-300 hover:text-accent disabled:opacity-25"
        >
          <ArrowRight className="size-5" />
        </button>
      </form>
    </div>
  );
}

// ── The fullscreen concierge takeover ───────────────────────────────────────
function SupportOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // The veil grows in HEIGHT from a thin centred line up to the full viewport,
  // visibly opening up + down into a fullscreen takeover.
  const [vh, setVh] = useState(() =>
    typeof window === "undefined" ? 800 : window.innerHeight,
  );
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Opened from the floating bubble → circular "teleport" reveal from the
  // lower-right (where the bubble sits); otherwise the height-grow open.
  const fromBubble = useConcierge((s) => s.fromBubble);

  return (
    <motion.div
      initial={fromBubble ? { clipPath: "circle(0% at 88% 90%)" } : { opacity: 0 }}
      animate={
        fromBubble ? { clipPath: "circle(150% at 50% 50%)" } : { opacity: 1 }
      }
      exit={fromBubble ? { clipPath: "circle(0% at 88% 90%)" } : { opacity: 0 }}
      transition={{
        duration: fromBubble ? 0.65 : 0.3,
        ease: fromBubble ? [0.83, 0, 0.17, 1] : "easeOut",
      }}
      className="fixed inset-0 z-[120] overflow-hidden bg-black"
    >
      {/* Living shader, full bleed. */}
      <div className="absolute inset-0">
        <SmokeScene />
      </div>

      {/* Close — a hairline mark, top-right. */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.7 } }}
        onClick={onClose}
        aria-label="Close concierge"
        className="group absolute right-7 top-7 z-20 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/70 transition-colors hover:text-foreground"
      >
        Close
        <span className="relative flex size-9 items-center justify-center rounded-full border border-foreground/25 transition-colors group-hover:border-accent">
          <span className="absolute h-[1px] w-3.5 rotate-45 bg-current" />
          <span className="absolute h-[1px] w-3.5 -rotate-45 bg-current" />
        </span>
      </motion.button>

      {/* The growing veil: a soft frosted sheet over the smoke (no hard dim,
          no boxed card). Its height animates up + down to fullscreen; content
          is pinned to the viewport height so it never squishes. */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <motion.div
          initial={{ height: fromBubble ? vh : 44 }}
          animate={{ height: vh }}
          exit={{ height: 44, opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="w-full overflow-y-auto overflow-x-hidden bg-background/25 backdrop-blur-[5px] lg:overflow-hidden"
        >
          {/* Hairline frame top + bottom for an editorial "plate". On mobile the
              content can exceed the viewport, so the veil above scrolls (min,
              not fixed, height); on desktop it stays pinned to one screen. */}
          <div
            style={{ minHeight: vh }}
            className="relative flex flex-col"
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

            <motion.div
              variants={containerV}
              initial="hidden"
              animate="show"
              className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-7 sm:px-12"
            >
              {/* Masthead */}
              <motion.div
                variants={itemV}
                className="flex items-center justify-center gap-5 pb-8 pt-12"
              >
                <span className="h-[1px] w-10 bg-foreground/40" />
                <span className="font-display text-base italic text-foreground">
                  Solaris · Concierge
                </span>
                <span className="h-[1px] w-10 bg-foreground/40" />
              </motion.div>

              {/* Split: statement | conversation, divided by a single rule */}
              <div className="flex min-h-0 flex-1 flex-col gap-y-10 pb-12 lg:grid lg:grid-cols-[1fr_1px_1fr] lg:grid-rows-1 lg:gap-x-12 xl:gap-x-16">
                {/* ── Left: the editorial statement + register ── */}
                <motion.div
                  variants={itemV}
                  className="flex flex-col justify-center"
                >
                  <span className="font-display text-2xl font-normal italic text-accent [text-shadow:none]">
                    viii.
                  </span>
                  <h2 className="font-display mt-4 text-balance text-5xl font-normal italic leading-[1.02] tracking-[-0.02em] [text-shadow:none] sm:text-6xl lg:text-7xl">
                    How may we
                    <br />
                    <span className="text-gradient-accent">help</span> you?
                  </h2>
                  <p className="font-display mt-7 max-w-sm text-pretty text-xl leading-relaxed text-foreground">
                    Real people, composed and unhurried. Begin a live exchange
                    with an admin, or reach us however you prefer.
                  </p>

                  {/* Contact register — hero-index styling */}
                  <ul className="mt-10 max-w-md border-t border-foreground/15">
                    {REGISTER.map((r) => (
                      <li key={r.label} className="border-b border-foreground/15">
                        <a
                          href={r.href}
                          {...(r.external
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                          className="group flex items-baseline justify-between gap-6 py-4"
                        >
                          <span className="flex items-baseline gap-4">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/45">
                              {r.no}
                            </span>
                            <span className="font-display text-lg italic text-foreground/95 transition-colors group-hover:text-accent">
                              {r.label}
                            </span>
                          </span>
                          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground transition-colors group-hover:text-accent">
                            {r.detail}
                            <ArrowUpRight className="size-3 -translate-x-1 text-accent opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Vertical hairline */}
                <div className="hidden bg-foreground/15 lg:block" />

                {/* ── Right: the conversation ── */}
                <motion.div variants={itemV} className="flex h-[82vh] min-h-0 flex-col lg:h-auto">
                  <Conversation />
                </motion.div>
              </div>
            </motion.div>

            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── Collapsed invite (inside the scroll-reveal window) ──────────────────────
function ContactInvite() {
  const setOpen = useConcierge((s) => s.setOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15%" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto relative w-[min(92vw,40rem)] text-center"
    >
      <div className="flex items-center justify-center gap-4 font-mono text-[10px] uppercase tracking-[0.4em] text-foreground/75">
        <span className="font-display text-2xl font-normal italic text-accent">
          viii.
        </span>
        <span>Concierge</span>
      </div>

      <h2 className="font-display mt-8 text-balance text-5xl font-normal italic leading-[1.02] tracking-[-0.02em] [text-shadow:none] sm:text-6xl lg:text-7xl">
        Ask us
        <br />
        <span className="text-gradient-accent">anything</span>.
      </h2>
      <p className="font-display mx-auto mt-6 max-w-md text-pretty text-lg leading-relaxed text-foreground sm:text-xl">
        For pricing, bookings, or anything at all — our admins are a single
        message away.
      </p>

      <button
        onClick={() => setOpen(true)}
        className="group mx-auto mt-10 inline-flex items-center gap-3 font-display text-xl italic text-foreground transition-colors hover:text-accent sm:text-2xl"
      >
        <span className="h-[1px] w-8 bg-foreground/40 transition-all duration-300 group-hover:w-12 group-hover:bg-accent" />
        Open the concierge
        <ArrowUpRight className="size-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </button>
    </motion.div>
  );
}

/**
 * The single, globally-mounted concierge overlay. Mount once (in the marketing
 * layout); any surface opens it via the `useConcierge` store. Rendered through
 * a portal so it escapes section stacking contexts.
 */
export function Concierge() {
  const open = useConcierge((s) => s.open);
  const setOpen = useConcierge((s) => s.setOpen);
  // Portal target only exists on the client; lazy-init avoids a
  // setState-in-effect while keeping SSR safe.
  const [mounted] = useState(() => typeof document !== "undefined");
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && <SupportOverlay onClose={() => setOpen(false)} />}
    </AnimatePresence>,
    document.body,
  );
}

/**
 * Floating "chat head" — pops up (lower-right, Messenger-style, our logo) when
 * an admin has replied to the user's live chat while the concierge is closed.
 * Clicking it opens the concierge with the circular reveal and the reply ready.
 * Mount once in the marketing layout alongside <Concierge />.
 */
export function SupportBubble() {
  const { user } = useSession();
  const open = useConcierge((s) => s.open);
  const openSupport = useConcierge((s) => s.openSupport);
  const [unread, setUnread] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);

  // Poll for an open thread with unread admin replies.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/support");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setThreadId(data?.thread?.id ?? null);
        setUnread(Boolean(data?.thread && data.thread.userUnread > 0));
      } catch {
        // ignore — next tick retries
      }
    };
    const first = window.setTimeout(tick, 0);
    const iv = window.setInterval(tick, 6000);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearInterval(iv);
    };
  }, [user]);

  // Realtime: light up instantly when the admin replies.
  useEffect(() => {
    if (!user || !threadId) return;
    const ch = subscribeSupportThread(threadId, (msg) => {
      if (msg.sender === "ADMIN") setUnread(true);
    });
    return () => ch.close();
  }, [user, threadId]);

  const show = Boolean(user) && unread && !open;

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 24 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
          onClick={() => openSupport()}
          aria-label="You have a new reply from a Solaris admin"
          className="glass-strong group fixed bottom-6 right-6 z-[110] flex size-14 items-center justify-center rounded-full shadow-premium"
        >
          {/* attention pulse */}
          <motion.span
            className="absolute inset-0 rounded-full bg-accent/30"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          <DiamondMark className="relative size-7 text-accent transition-transform duration-300 group-hover:scale-110" />
          {/* unread dot */}
          <span className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full border-2 border-background bg-accent" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// True at lg+ (≥1024px). Starts `true` so SSR and the first client render match
// the desktop markup (no hydration mismatch); corrects on mount for small screens.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

export function CtaSection() {
  const isDesktop = useIsDesktop();

  // Mobile / tablet: the fixed-layer + scroll-driven clip-path reveal is janky
  // on small screens (dynamic viewport height, a heavy pinned shader). Present
  // the same invite over a static smoke backdrop in normal flow instead.
  if (!isDesktop) {
    return (
      <section className="relative flex min-h-[78vh] items-center justify-center overflow-hidden px-6 py-24">
        <div className="absolute inset-0 overflow-hidden bg-background">
          <SmokeScene />
        </div>
        <div className="relative z-10">
          <ContactInvite />
        </div>
      </section>
    );
  }

  return (
    <section className="relative">
      <RevealLayer
        front={
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <ContactInvite />
          </div>
        }
      >
        <SmokeScene />
      </RevealLayer>
    </section>
  );
}
