import { SolarisMark } from "@/components/logo";
import { cn } from "@/lib/utils";

/**
 * The full Solaris Diamond brand lockup — sun mark, SOLARIS wordmark,
 * DIAMOND with flanking accent rules, and a tagline. Matches the brand logo.
 */
export function LogoLockup({
  className,
  markClass = "size-16",
  tagline = "The Business Operating System",
}: {
  className?: string;
  markClass?: string;
  tagline?: string | null;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <SolarisMark className={cn("text-foreground", markClass)} />

      <div className="font-display mt-6 flex pl-[0.4em] text-3xl font-medium tracking-[0.4em] sm:text-5xl sm:tracking-[0.5em]">
        SOLARIS
      </div>

      <div className="mt-4 flex w-full max-w-xs items-center gap-4">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-accent" />
        <span className="font-display text-base font-medium tracking-[0.42em] sm:text-lg">
          DIAMOND
        </span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-accent" />
      </div>

      {tagline && (
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.34em] text-muted-foreground">
          {tagline}
        </p>
      )}
    </div>
  );
}
