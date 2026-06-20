import { Hero } from "@/components/marketing/hero";
import { LogoCloud } from "@/components/marketing/logo-cloud";
import { ValueProps } from "@/components/marketing/value-props";
import { ServicesSection } from "@/components/marketing/services-section";
import { BundlesSection } from "@/components/marketing/bundles-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { Faq } from "@/components/marketing/faq";
import { CtaSection } from "@/components/marketing/cta-section";

export default function HomePage() {
  return (
    <>
      <Hero />
      <LogoCloud />
      <ValueProps />
      <ServicesSection />
      <BundlesSection />
      <PricingSection />
      <Faq />
      <CtaSection />
      <div className="h-10" />
    </>
  );
}
