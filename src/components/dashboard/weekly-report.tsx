"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FileText, Printer, RefreshCw, X } from "lucide-react";
import { useSession } from "@/lib/auth/hooks";
import { getBusinessContext } from "@/lib/ai/business-context";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Weekly Business Report — one click generates a structured, printable weekly
 * briefing (sales, expenses, inventory, attendance, recommendations) grounded
 * in the live database plus the local business snapshot.
 */
export function WeeklyReport() {
  const { user, subscribedServices } = useSession();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setText("");
    try {
      const res = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: getBusinessContext({ modules: subscribedServices }),
          name: user?.fullName ?? "",
        }),
      });
      if (res.status === 401) {
        setError("Sign in to generate your report.");
        return;
      }
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setText(acc);
      }
      if (!acc.trim()) setError("Couldn't generate the report right now.");
    } catch {
      setError("Couldn't generate the report right now.");
    } finally {
      setLoading(false);
    }
  };

  const openReport = () => {
    setOpen(true);
    if (!text && !loading) void generate();
  };

  const printReport = () => {
    const w = window.open("", "_blank", "width=760,height=900");
    if (!w) return;
    const businessName = user?.businessName ?? "Solaris Diamond";
    const today = new Date().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const bodyHtml = text
      .split("\n")
      .map((line) => {
        const t = line.trim();
        if (!t) return "";
        if (t.startsWith("## ")) return `<h2>${esc(t.slice(3))}</h2>`;
        if (t.startsWith("•")) return `<li>${esc(t.replace(/^•\s*/, ""))}</li>`;
        return `<p>${esc(t)}</p>`;
      })
      .join("\n")
      // group consecutive <li> into lists
      .replace(/(<li>[\s\S]*?<\/li>)(?!\n<li>)/g, "$1")
      .replace(/(?:^|\n)(<li>)/g, "\n<ul>$1")
      .replace(/(<\/li>)(?!\n<li>)/g, "$1</ul>");
    w.document.write(`<!doctype html><html><head><title>Weekly Business Report — ${esc(businessName)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1610; margin: 48px; line-height: 1.55; }
  header { border-bottom: 2px solid #1a1610; padding-bottom: 12px; margin-bottom: 24px; }
  header h1 { font-size: 20px; margin: 0; letter-spacing: 0.02em; }
  header p { margin: 4px 0 0; font-size: 12px; color: #6b6255; text-transform: uppercase; letter-spacing: 0.2em; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.14em; border-bottom: 1px solid #d8d2c6; padding-bottom: 6px; margin: 26px 0 10px; }
  p, li { font-size: 13.5px; margin: 6px 0; }
  ul { margin: 6px 0; padding-left: 20px; }
  @media print { body { margin: 24px; } }
</style></head><body>
<header><h1>Weekly Business Report — ${esc(businessName)}</h1><p>Generated ${esc(today)} · Solaris Diamond</p></header>
${bodyHtml}
</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <>
      {/* Trigger card */}
      <motion.button
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.22 }}
        onClick={openReport}
        className="group mt-4 flex w-full items-center justify-between rounded-2xl border border-border bg-card px-6 py-5 text-left transition-colors hover:border-accent/50 sm:px-8"
      >
        <span className="flex items-center gap-4">
          <FileText className="size-4 text-accent" />
          <span>
            <span className="block font-display text-lg">Weekly Business Report</span>
            <span className="block text-sm text-muted-foreground">
              Full week in review — sales, expenses, inventory, attendance, and what to do next.
            </span>
          </span>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent opacity-0 transition-opacity group-hover:opacity-100">
          Generate
        </span>
      </motion.button>

      {/* Report overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm sm:p-8"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.35, ease }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-premium"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                  <FileText className="size-3.5 text-accent" />
                  Weekly Business Report
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => !loading && generate()}
                    disabled={loading}
                    aria-label="Regenerate report"
                    title="Regenerate"
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                  >
                    <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                  </button>
                  <button
                    onClick={printReport}
                    disabled={loading || !text.trim()}
                    aria-label="Print report"
                    title="Print"
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                  >
                    <Printer className="size-4" />
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close report"
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                {loading && !text ? (
                  <div className="space-y-3">
                    {[60, 92, 85, 78, 40, 88, 70].map((w, i) => (
                      <div
                        key={i}
                        className="h-3.5 animate-pulse rounded-full bg-foreground/10"
                        style={{ width: `${w}%` }}
                      />
                    ))}
                  </div>
                ) : error ? (
                  <p className="text-sm text-muted-foreground">
                    {error}{" "}
                    <button
                      onClick={() => generate()}
                      className="text-accent underline-offset-4 hover:underline"
                    >
                      Try again
                    </button>
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {lines.map((line, i) => {
                      if (line.startsWith("## ")) {
                        return (
                          <p
                            key={i}
                            className="mt-5 border-b border-border pb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-accent first:mt-0"
                          >
                            {line.slice(3)}
                          </p>
                        );
                      }
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
                      return (
                        <p
                          key={i}
                          className="text-pretty text-[15px] leading-relaxed text-foreground/90"
                        >
                          {line}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
