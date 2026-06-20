import type { Metadata } from "next";
import { PageHeader } from "@/components/marketing/page-header";
import { SectionHeading } from "@/components/section-heading";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { CtaSection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "About",
  description:
    "Solaris Diamond is on a mission to give every business enterprise-grade software that feels effortless.",
};

const values = [
  {
    index: "01",
    title: "Obsessive craft",
    body: "Every pixel, transition and millisecond is considered. Software for your business should feel as refined as the products you admire most.",
  },
  {
    index: "02",
    title: "Radical simplicity",
    body: "Powerful does not have to mean complicated. We remove until only the essential remains — then we polish it.",
  },
  {
    index: "03",
    title: "Trust by design",
    body: "Your data is isolated, encrypted and yours. We build security and privacy into the foundation, never as an afterthought.",
  },
  {
    index: "04",
    title: "Fair, transparent pricing",
    body: "Pay for what you use, upgrade when you grow, and never get locked in. No surprises, no hidden fees, ever.",
  },
];

const stats = [
  { value: 5, suffix: "", label: "Core modules" },
  { value: 3, suffix: "", label: "Bundles" },
  { value: 4, suffix: "", label: "Payment methods" },
  { value: 99.99, suffix: "%", label: "Uptime target", decimals: 2 },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Our story"
        title={
          <>
            Built for businesses that{" "}
            <span className="text-gradient-accent">refuse to settle</span>
          </>
        }
        description="We started Solaris Diamond because running a business shouldn't require a dozen disconnected tools and an IT department. It should feel calm, clear and even beautiful."
      />

      {/* ── Editorial pull quote ─────────────────────────────── */}
      <section className="mx-auto mt-24 w-full max-w-5xl px-6">
        <Reveal>
          <blockquote className="relative border-l-2 border-accent pl-8">
            <p
              className="font-display text-balance text-2xl font-medium leading-snug text-foreground sm:text-3xl md:text-4xl"
              style={{ letterSpacing: "-0.01em" }}
            >
              "The best businesses obsess over their customers.
              <br className="hidden sm:block" /> We obsess over the businesses."
            </p>
            <footer className="mt-5 text-sm tracking-widest text-muted-foreground uppercase">
              — Solaris Diamond, founding principle
            </footer>
          </blockquote>
        </Reveal>
      </section>

      {/* ── Body copy ────────────────────────────────────────── */}
      <section className="mx-auto mt-20 w-full max-w-3xl px-6">
        <Reveal className="flex flex-col gap-6 text-lg leading-relaxed text-muted-foreground text-pretty">
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
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="mx-auto mt-24 w-full max-w-5xl px-6">
        <Stagger className="grid grid-cols-2 gap-px sm:grid-cols-4 rounded-2xl overflow-hidden border border-border">
          {stats.map((s) => (
            <StaggerItem
              key={s.label}
              className="flex flex-col items-center justify-center gap-1 bg-card px-6 py-10 text-center"
            >
              <p className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
                <AnimatedCounter
                  value={s.value}
                  suffix={s.suffix}
                  decimals={s.decimals ?? 0}
                />
              </p>
              <p className="mt-1 text-xs tracking-widest text-muted-foreground uppercase">
                {s.label}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ── Divider ──────────────────────────────────────────── */}
      <section className="mx-auto mt-32 w-full max-w-5xl px-6">
        <div className="flex items-center gap-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
            What we believe
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────── */}
      <section className="mx-auto mt-16 w-full max-w-5xl px-6">
        <SectionHeading
          eyebrow="Principles"
          title="The values behind every decision"
          description="Four beliefs that shape how we design, build and support Solaris Diamond."
        />
        <Stagger className="mt-14 grid gap-px sm:grid-cols-2 rounded-2xl overflow-hidden border border-border">
          {values.map((v) => (
            <StaggerItem
              key={v.title}
              className="group relative bg-card p-8 transition-colors hover:bg-accent/5"
            >
              <span className="font-display text-5xl font-medium text-border transition-colors group-hover:text-accent/30 select-none">
                {v.index}
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                {v.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {v.body}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <CtaSection />
      <div className="h-10" />
    </>
  );
}