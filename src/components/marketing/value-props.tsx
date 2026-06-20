import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";

/**
 * The Principles — an editorial manifesto block that sits directly below the
 * hero. Hardcoded to match the hero's luxury language: a chapter mark, a
 * two-column display header, and three full-width principle rows with serif
 * index numerals, an animated accent rule on hover, and a quiet keyword tag.
 */

const principles = [
  {
    no: "01",
    tag: "Unified",
    title: "One dashboard, every metric",
    body: "Inventory, sales, expenses and people — unified in a single, beautifully calm workspace.",
  },
  {
    no: "02",
    tag: "Modular",
    title: "Subscribe to only what you need",
    body: "Start with one module or take a bundle. Upgrade the instant you outgrow it — no migrations.",
  },
  {
    no: "03",
    tag: "Instant",
    title: "Live in minutes, not months",
    body: "No onboarding calls. Pay, and your modules unlock automatically with zero manual approval.",
  },
];

export function ValueProps() {
  return (
    <section className="mx-auto mt-40 w-full max-w-6xl px-6">
      {/* ── Header ── */}
      <Reveal>
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          <span className="font-display text-2xl font-normal italic text-accent">
            ii.
          </span>
          <span>The Principles</span>
          <span className="h-px w-12 bg-accent/40" />
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-12">
          <h2 className="font-display text-balance text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-5xl md:col-span-7">
            Three commitments,
            <br />
            held <span className="italic text-gradient-accent">quietly</span>.
          </h2>
          <p className="max-w-sm self-end text-pretty leading-relaxed text-muted-foreground md:col-span-5">
            Everything we build answers to the same few ideas. No noise, no
            bloat — only what earns its place.
          </p>
        </div>
      </Reveal>

      {/* ── Principle rows ── */}
      <Stagger className="mt-16 border-t border-border">
        {principles.map((p) => (
          <StaggerItem key={p.no}>
            <div className="group grid grid-cols-12 items-baseline gap-4 border-b border-border py-10 transition-colors duration-500 hover:bg-card/40 sm:py-12">
              <span className="font-display col-span-12 text-3xl font-normal italic text-muted-foreground/45 transition-colors duration-500 group-hover:text-accent sm:col-span-2 sm:text-4xl">
                {p.no}
              </span>

              <div className="col-span-12 sm:col-span-7 sm:col-start-3">
                <h3 className="font-display text-2xl font-normal leading-snug sm:text-3xl">
                  {p.title}
                </h3>
                <span className="mt-3 block h-px w-0 bg-accent transition-all duration-700 ease-out group-hover:w-16" />
                <p className="mt-4 max-w-md text-pretty leading-relaxed text-muted-foreground">
                  {p.body}
                </p>
              </div>

              <span className="col-span-12 font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground/70 sm:col-span-2 sm:col-start-11 sm:text-right">
                {p.tag}
              </span>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
