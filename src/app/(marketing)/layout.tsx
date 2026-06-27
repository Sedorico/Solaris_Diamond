import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Concierge } from "@/components/marketing/cta-section";
import { MeshGradientBackdrop } from "@/components/three/mesh-gradient-backdrop";
import { Preloader } from "@/components/preloader";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Preloader />

      {/* Flowing, cursor-reactive mesh-gradient field behind everything */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <MeshGradientBackdrop />
      </div>

      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />

      {/* Single concierge overlay, openable from the navbar / CTA. */}
      <Concierge />
    </div>
  );
}