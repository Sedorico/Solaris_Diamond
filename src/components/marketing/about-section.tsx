import { EditorialHeading } from "@/components/marketing/editorial-heading";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { AnimatedCounter } from "@/components/motion/animated-counter";

/**
 * The About chapter on the homepage — the same editorial register as the
 * /about page, condensed into one section: a mission statement (founding-
 * principle quote + body) and a stats strip. Sits directly below the hero
 * as chapter ii, leading straight into iii. The Principles.
 */

const stats = [
  { value: 5, suffix: "", label: "Core modules" },
  { value: 3, suffix: "", label: "Bundles" },
  { value: 4, suffix: "", label: "Payment methods" },
  { value: 99.99, suffix: "%", label: "Uptime target", decimals: 2 },
];

export function AboutSection() {
  return (
    <section id="about" className="mx-auto mt-40 w-full max-w-6xl px-6">
      <EditorialHeading
        roman="ii."
        label="About"
        title={
          <>
            Built for businesses that{" "}
            <span className="italic text-gradient-accent">refuse to settle</span>.
          </>
        }
      />

      {/* ── Mission ── */}
      <div className="mt-14 grid gap-12 md:grid-cols-12">
        <Reveal className="md:col-span-5">
          <blockquote className="border-l-2 border-accent pl-7">
            <p
              className="font-display text-balance text-2xl font-normal leading-snug text-foreground sm:text-[1.75rem]"
              style={{ letterSpacing: "-0.01em" }}
            >
              &ldquo;The best businesses obsess over their customers. We obsess
              over the businesses.&rdquo;
            </p>
            <footer className="mt-5 font-mono text-[10px] tracking-[0.32em] text-muted-foreground uppercase">
              Solaris Diamond — founding principle
            </footer>
          </blockquote>
        </Reveal>

        <Reveal
          delay={0.06}
          className="font-display flex flex-col gap-6 text-pretty text-xl font-normal leading-relaxed text-muted-foreground md:col-span-6 md:col-start-7"
        >
          <p>
            Solaris Diamond brings inventory, sales, expenses, point of sale and
            attendance into one elegant platform — so you can spend less time
            wrangling software and more time growing.
          </p>
          <p>
            We believe premium software shouldn&apos;t be reserved for companies
            with enormous budgets. Whether you run a single store or a
            fast-growing chain, you deserve tools that are fast, secure and
            genuinely a joy to use.
          </p>
        </Reveal>
      </div>

      {/* ── Stats — editorial ruled row ── */}
      <Stagger className="mt-24 grid grid-cols-2 divide-x divide-y divide-border border-y border-border sm:grid-cols-4 sm:divide-y-0">
        {stats.map((s) => (
          <StaggerItem
            key={s.label}
            className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center"
          >
            <p className="font-display text-5xl font-normal tracking-tight sm:text-6xl">
              <AnimatedCounter
                value={s.value}
                suffix={s.suffix}
                decimals={s.decimals ?? 0}
              />
            </p>
            <p className="eyebrow">{s.label}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
