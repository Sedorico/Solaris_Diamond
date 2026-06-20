import { DashboardGuard } from "@/components/dashboard/guard";
import { SidebarNav } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      <div className="flex min-h-screen bg-secondary/30">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-background lg:block">
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
