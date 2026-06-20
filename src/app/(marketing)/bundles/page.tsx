import type { Metadata } from "next";
import { PageHeader } from "@/components/marketing/page-header";
import { BundlesSection } from "@/components/marketing/bundles-section";
import { Faq } from "@/components/marketing/faq";
import { CtaSection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Bundles",
  description:
    "Save up to 30% with Solaris Diamond bundles — Starter, Growth and Business.",
};

export default function BundlesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Bundles"
        title={
          <>
            More value, the more{" "}
            <span className="text-gradient-accent">you grow</span>
          </>
        }
        description="Our three bundles stack on top of each other, so upgrading from Starter to Business is always a single click — never a migration."
      />
      <BundlesSection />
      <Faq />
      <CtaSection />
      <div className="h-10" />
    </>
  );
}
