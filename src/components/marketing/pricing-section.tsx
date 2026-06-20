"use client";

import { services } from "@/lib/data/services";
import { bundles } from "@/lib/data/bundles";
import { EditorialHeading } from "@/components/marketing/editorial-heading";
import { BundleCard } from "@/components/marketing/bundle-card";
import { ServiceCard } from "@/components/marketing/service-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function PricingSection({ withHeading = true }: { withHeading?: boolean }) {
  return (
    <section id="pricing" className="mx-auto mt-40 w-full max-w-6xl px-6">
      {withHeading && (
        <EditorialHeading
          roman="v."
          label="The Pricing"
          title={
            <>
              Pay only for what{" "}
              <span className="italic text-gradient-accent">you use.</span>
            </>
          }
          description="Transparent monthly pricing. No setup fees, no contracts — every plan activates the moment your payment succeeds."
        />
      )}

      <Tabs defaultValue="bundles" className="mt-14">
        <TabsList className="mx-auto">
          <TabsTrigger value="bundles">Bundles</TabsTrigger>
          <TabsTrigger value="services">Single services</TabsTrigger>
        </TabsList>

        <TabsContent value="bundles">
          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-3">
            {bundles.map((bundle, i) => (
              <BundleCard key={bundle.id} bundle={bundle} index={i} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="services">
          <div className="flex flex-col gap-6">
            {services.map((service, i) => (
              <ServiceCard key={service.id} service={service} index={i} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
