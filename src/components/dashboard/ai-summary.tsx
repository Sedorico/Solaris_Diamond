"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { RefreshCw, Sparkles } from "lucide-react";
import { useSession } from "@/lib/auth/hooks";
import { getBusinessContext } from "@/lib/ai/business-context";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * AI Dashboard Summary — on open, streams a conversational business briefing
 * grounded in the subscriber's own data (sales, inventory, expenses,
 * attendance). Not raw numbers: the AI explains what they mean.
 */
export function AiSummary() {
  const { user, subscribedServices, loading: sessionLoading } = useSession();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const ranRef = useRef(false);

  const run = useCallback(async () => {
    setLoading(true);
    setError(false);
    setText("");
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: getBusinessContext({ modules: subscribedServices }),
          name: user?.fullName?.split(" ")[0] ?? "there",
        }),
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setText(acc);
        setLoading(false);
      }
      if (!acc.trim()) setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.fullName, subscribedServices]);

  useEffect(() => {
    if (ranRef.current || sessionLoading) return;
    ranRef.current = true;
    void run();
  }, [run, sessionLoading]);

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease, delay: 0.15 }}
      className="relative mt-12 overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          <span className="font-display text-2xl font-normal italic text-accent">
            i.
          </span>
          <span className="flex items-center gap-2">
            <Sparkles className="size-3 text-accent" />
            AI Business Summary
          </span>
        </div>
        <button
          onClick={() => !loading && run()}
          disabled={loading}
          aria-label="Regenerate summary"
          className="group rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <RefreshCw
            className={cn("size-4 transition-transform", loading && "animate-spin")}
          />
        </button>
      </div>

      {/* Body */}
      <div className="mt-6 min-h-[7rem]">
        {loading && !text ? (
          <div className="space-y-3">
            {[90, 80, 84, 72, 60].map((w, i) => (
              <div
                key={i}
                className="h-3.5 animate-pulse rounded-full bg-foreground/10"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">
            Couldn&rsquo;t generate your summary right now.{" "}
            <button
              onClick={() => run()}
              className="text-accent underline-offset-4 hover:underline"
            >
              Try again
            </button>
            .
          </p>
        ) : (
          <div className="space-y-2.5">
            {lines.map((line, i) => {
              if (line.startsWith("•")) {
                return (
                  <div key={i} className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                    <p className="text-pretty text-[15px] leading-relaxed text-foreground/90">
                      {line.replace(/^•\s*/, "")}
                    </p>
                  </div>
                );
              }
              if (/^overall:/i.test(line)) {
                return (
                  <p
                    key={i}
                    className="mt-4 border-t border-border pt-4 text-pretty text-[15px] font-medium leading-relaxed"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                      Overall
                    </span>
                    <br />
                    {line.replace(/^overall:\s*/i, "")}
                  </p>
                );
              }
              return (
                <p
                  key={i}
                  className="font-display text-pretty text-lg leading-relaxed"
                >
                  {line}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </motion.section>
  );
}
