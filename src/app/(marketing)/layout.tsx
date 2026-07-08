import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Concierge, SupportBubble } from "@/components/marketing/cta-section";
import { MeshGradientBackdrop } from "@/components/three/mesh-gradient-backdrop";
import { LiquidBackdrop } from "@/components/three/liquid-backdrop";
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

      {/* Liquid ripple surface — the whole page reads as water under the cursor */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <LiquidBackdrop />
      </div>

      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />

      {/* Single concierge overlay + floating reply bubble, openable anywhere. */}
      <Concierge />
      <SupportBubble />
    </div>
  );
}