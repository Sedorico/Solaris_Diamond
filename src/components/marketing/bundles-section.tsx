import { bundles } from "@/lib/data/bundles";
import { EditorialHeading } from "@/components/marketing/editorial-heading";
import { BundleCard } from "@/components/marketing/bundle-card";
import { Stagger, StaggerItem } from "@/components/motion/reveal";

export function BundlesSection() {
  return (
    <section id="bundles" className="mx-auto mt-40 w-full max-w-6xl px-6">
      <EditorialHeading
        roman="iv."
        label="The Bundles"
        title={
          <>
            Curated for the way{" "}
            <span className="italic text-gradient-accent">you grow.</span>
          </>
        }
        description="Bundles stack on one another — Starter to Growth to Business — so upgrading is one click, never a migration."
      />

      <Stagger className="mt-16 grid gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-3">
        {bundles.map((bundle, i) => (
          <StaggerItem key={bundle.id} className="h-full">
            <BundleCard bundle={bundle} index={i} />
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
