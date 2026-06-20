import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { ConnectorsField } from "@/components/three/connectors-field";

export function CtaSection() {
  return (
    <section className="mx-auto mt-40 w-full max-w-6xl px-6">
      <Reveal>
        <div className="relative isolate overflow-hidden rounded-2xl bg-[#0c0b0a] px-8 py-20 text-white sm:px-16 sm:py-28">
          {/* Interactive 3D connector field */}
          <div className="pointer-events-none absolute inset-0">
            <ConnectorsField />
          </div>

          {/* Readability gradient — keeps the left text crisp over the scene */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0c0b0a] via-[#0c0b0a]/85 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(12,11,10,0.9),transparent_40%)]" />

          <div className="relative z-10 max-w-2xl">
            <span className="eyebrow text-white/45">Begin</span>
            <h2 className="font-display mt-6 text-balance text-4xl font-medium leading-[1.04] sm:text-6xl">
              Run your entire business
              <br />
              from one <span className="italic text-gradient-accent">quiet</span> place.
            </h2>
            <p className="mt-6 max-w-lg text-pretty text-white/65 sm:text-lg">
              Replace the messy stack of tools with a single, considered platform.
              Set up in minutes — no credit card required.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" variant="accent">
                <Link href="/register">
                  Get started <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/25 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/contact">Talk to us</Link>
              </Button>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
