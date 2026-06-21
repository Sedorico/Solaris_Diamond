"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useRef, useCallback } from "react";
import { Logo, SolarisMark } from "@/components/logo";
import { footerNav, siteConfig } from "@/lib/config/site";

const socials = [
  { label: "solarisdiems@gmail.com", href: "mailto:solarisdiems@gmail.com" },
  { label: "0924 126 1246", href: "tel:09241261246" },
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61590597993727" },
];

const filteredFooterNav = footerNav.map((group) =>
  group.title === "Company"
    ? {
        ...group,
        links: group.links.filter(
          (l) => l.title !== "Careers" && l.title !== "Blog"
        ),
      }
    : group
).filter((group) =>
  group.title === "Product" || group.title === "Company" || group.title === "Resources" || group.title === "Legal"
);

export function Footer() {
  const textRef = useRef<HTMLSpanElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    const el = textRef.current;
    if (!el) return;

    // Use the text element's own bounding box, not the outer container,
    // so the spotlight is centered exactly under the cursor regardless of
    // the logo/spacing above it.
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    el.style.setProperty("--reveal", "1");
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.setProperty("--reveal", "0");
  }, []);

  return (
    <footer className="relative mt-40 overflow-hidden border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 pt-20">
        {/* CTA banner row */}
        <div className="flex flex-col gap-10 border-b border-border pb-16 lg:flex-row lg:items-end lg:justify-between">
          <Logo href={null} />
          <Link
            href="/register"
            className="group font-display inline-flex items-center gap-3 text-4xl font-medium sm:text-5xl"
          >
            Get started
            <span className="flex size-12 items-center justify-center rounded-full border border-border transition-all duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-accent-foreground">
              <ArrowUpRight className="size-5" />
            </span>
          </Link>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 gap-10 py-16 sm:grid-cols-4">
          {filteredFooterNav.map((group) => (
            <div key={group.title} className="flex flex-col gap-4">
              <h3 className="eyebrow">{group.title}</h3>
              <ul className="flex flex-col gap-3">
                {group.links.map((link) => (
                  <li key={link.title}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-1 text-sm text-foreground/70 transition-colors hover:text-accent"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Meta bar */}
        <div className="flex flex-col items-start justify-between gap-4 border-t border-border py-8 sm:flex-row sm:items-center">
          <p className="eyebrow">© {new Date().getFullYear()} {siteConfig.name}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {socials.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                target={s.href.startsWith("http") ? "_blank" : undefined}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {s.label}
              </Link>
            ))}
          </div>
          <p className="eyebrow flex items-center gap-2">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
            </span>
            All systems operational
          </p>
        </div>
      </div>

      {/* Oversized brand flourish — cursor-reactive reveal, full-bleed width */}
      <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
        {/* SolarisMark — above the text */}
        <div className="flex justify-center py-6">
          <SolarisMark className="size-20 text-foreground/60 transition-opacity duration-300 hover:text-foreground/90" />
        </div>

        {/* Base dim layer */}
        <span
          aria-hidden
          className="font-display block w-full pointer-events-none select-none whitespace-nowrap text-center text-[10.3vw] font-medium leading-none tracking-tight text-foreground/[0.05]"
        >
          SOLARIS DIAMOND
        </span>

        {/* Reveal layer — mouse tracking happens directly on this element */}
        <span
          ref={textRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="font-display pointer-events-auto absolute bottom-0 left-0 right-0 block select-none whitespace-nowrap text-center text-[10.3vw] font-medium leading-none tracking-tight"
          style={{
            color: "transparent",
            backgroundImage:
              "radial-gradient(circle 180px at var(--mx, 50%) var(--my, 50%), #C49426 0%, #E8B84B 30%, transparent 70%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            opacity: "var(--reveal, 0)" as React.CSSProperties["opacity"],
            transition: "opacity 0.3s ease",
          } as React.CSSProperties}
        >
          SOLARIS DIAMOND
        </span>
      </div>
    </footer>
  );
}