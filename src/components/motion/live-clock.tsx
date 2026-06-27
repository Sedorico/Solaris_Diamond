"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Live ticking clock with a pulsing "live" dot. Renders nothing until mounted
 * (avoids a hydration mismatch on the time). A small real-time signal for the
 * dashboard / admin chrome.
 */
export function LiveClock({ className }: { className?: string }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  return (
    <span
      className={cn("inline-flex items-center gap-2 tabular-nums", className)}
      suppressHydrationWarning
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/70" />
        <span className="relative inline-flex size-1.5 rounded-full bg-success" />
      </span>
      {time}
    </span>
  );
}
