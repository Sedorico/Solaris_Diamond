import { DashboardGuard } from "@/components/dashboard/guard";
import { SidebarNav } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { PremiumBackdrop } from "@/components/checkout/premium-backdrop";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      {/* Flowing gold wave-line backdrop behind the whole dashboard */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <PremiumBackdrop />
      </div>

      <div className="glass-scope relative flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">
          <SidebarNav />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </DashboardGuard>
  );
}
