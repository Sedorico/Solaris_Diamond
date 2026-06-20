"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/config/site";

/** The signature gold of the Solaris sun. */
const SUN_GOLD = "#C98A3C";

/**
 * The Solaris mark — a rising sun with golden rays + crescent cradling an
 * elegant serif "S". The sun is always gold; the "S" follows the theme
 * (ink on light surfaces, light on dark) via `currentColor`.
 */
export function SolarisMark({ className }: { className?: string }) {
  const cx = 20;
  const cy = 15;
  const R = 6;
  const rays = Array.from({ length: 13 }).map((_, i) => {
    const deg = 18 + i * 12;
    const a = (deg * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const ri = 7.5;
    const ro = 10.5 + 3 * s;
    return { x1: cx + ri * c, y1: cy - ri * s, x2: cx + ro * c, y2: cy - ro * s };
  });

  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={cn("size-7", className)}
      aria-hidden="true"
    >
      {rays.map((r, i) => (
        <line
          key={i}
          x1={r.x1.toFixed(2)}
          y1={r.y1.toFixed(2)}
          x2={r.x2.toFixed(2)}
          y2={r.y2.toFixed(2)}
          stroke={SUN_GOLD}
          strokeWidth={1.05}
          strokeLinecap="round"
        />
      ))}
      <path
        d={`M ${cx - R} ${cy + 2} A ${R} ${R} 0 0 1 ${cx + R} ${cy + 2}`}
        stroke={SUN_GOLD}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <text
        x={cx}
        y="38"
        textAnchor="middle"
        fill="currentColor"
        style={{
          fontFamily: "var(--font-playfair), Georgia, 'Times New Roman', serif",
          fontSize: "27px",
          fontWeight: 500,
        }}
      >
        S
      </text>
    </svg>
  );
}

/** Backwards-compatible alias (the mark used to be a diamond). */
export const DiamondMark = SolarisMark;

export function Logo({
  className,
  showWord = true,
  href = "/",
}: {
  className?: string;
  showWord?: boolean;
  href?: string | null;
}) {
  const router = useRouter();
  const clickTimer = useRef<number | null>(null);

  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <SolarisMark />
      {showWord && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight">
            {siteConfig.shortName}
            <span className="font-normal text-muted-foreground"> Diamond</span>
          </span>
        </span>
      )}
    </span>
  );

  if (href === null) return content;

  // Single click → normal navigation. Double click → admin console login.
  // Hidden backdoor so admins can switch between customer view and admin
  // console without cluttering the navbar UI.
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();

    if (clickTimer.current !== null) {
      window.clearTimeout(clickTimer.current);
      clickTimer.current = null;
      router.push("/admin/login");
      return;
    }

    clickTimer.current = window.setTimeout(() => {
      clickTimer.current = null;
      router.push(href as string);
    }, 240);
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="group select-none focus-visible:outline-none"
      title="Solaris Diamond · double-click for admin"
    >
      {content}
    </Link>
  );
}
