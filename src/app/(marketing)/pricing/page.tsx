import type { Metadata } from "next";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { PricingSection } from "@/components/marketing/pricing-section";
import { Faq } from "@/components/marketing/faq";
import { CtaSection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Transparent monthly pricing for every Solaris Diamond service and bundle. No setup fees, cancel anytime.",
};

const includedEverywhere = [
  "No setup fees",
  "Automatic activation",
  "Multi-tenant data isolation",
  "Bank-grade security",
  "Email & in-app support",
  "Cancel anytime",
];

export default function PricingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Pricing that scales with you"
        description="Subscribe to a single service or save with a bundle. Every plan activates automatically the moment your payment succeeds."
      />

      <section className="mx-auto mt-10 w-full max-w-3xl px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {includedEverywhere.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Check className="size-3.5 text-accent" strokeWidth={3} />
              {item}
            </span>
          ))}
        </div>
      </section>

      <PricingSection withHeading={false} />
      <Faq />
      <CtaSection />
      <div className="h-10" />
    </>
  );
}
