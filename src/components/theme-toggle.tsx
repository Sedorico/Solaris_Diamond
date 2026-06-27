"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const ref = React.useRef<HTMLButtonElement>(null);
  // One-shot mount guard so the theme-dependent icons only render client-side
  // (avoids a hydration mismatch on resolvedTheme).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  const toggle = React.useCallback(() => {
    const next = isDark ? "light" : "dark";
    const doc = document as ViewTransitionDocument;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Setting-aware: skip the animated reveal when the API is unavailable or the
    // user prefers reduced motion — just switch instantly.
    if (!doc.startViewTransition || reduce || !ref.current) {
      setTheme(next);
      return;
    }

    const rect = ref.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = doc.startViewTransition(() => {
      setTheme(next);
      // Apply the class synchronously so the new-theme snapshot is captured
      // (next-themes' own effect reconciles to the same class right after).
      document.documentElement.classList.toggle("dark", next === "dark");
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 520,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  }, [isDark, setTheme]);

  return (
    <button
      ref={ref}
      type="button"
      aria-label="Toggle theme"
      onClick={toggle}
      className={cn(
        "relative inline-flex size-9 items-center justify-center rounded-full border border-border text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {mounted && (
        <>
          <Sun
            className={cn(
              "size-4 transition-all duration-300",
              isDark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
            )}
          />
          <Moon
            className={cn(
              "absolute size-4 transition-all duration-300",
              isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0",
            )}
          />
        </>
      )}
    </button>
  );
}
