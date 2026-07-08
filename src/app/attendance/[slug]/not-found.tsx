import Link from "next/link";
import { Clock } from "lucide-react";

export default function AttendanceNotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, oklch(0.93 0.04 70 / 0.5), transparent 70%)",
        }}
      />
      <div className="max-w-md">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border bg-card shadow-premium">
          <Clock className="size-6 text-accent" />
        </div>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">
          Attendance Portal
        </p>
        <h1 className="font-display mt-3 text-3xl font-normal tracking-tight">
          Business not found
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This attendance portal link is invalid or no longer exists. Please
          double-check the address with your employer.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-accent underline-offset-4 hover:underline"
        >
          Go to Solaris Diamond
        </Link>
      </div>
    </main>
  );
}
