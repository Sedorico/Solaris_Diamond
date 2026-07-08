"use client";

/** Isolated, premium background wrapper for the public attendance portal. */
export function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 55% at 50% -5%, oklch(0.93 0.04 70 / 0.55), transparent 65%)",
        }}
      />
      {children}
      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
        Powered by Solaris Diamond
      </p>
    </main>
  );
}
