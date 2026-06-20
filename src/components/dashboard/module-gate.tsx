"use client";

import type { ServiceId } from "@/lib/data/services";
import { useSession } from "@/lib/auth/hooks";
import { ModuleLocked } from "@/components/dashboard/locked";
import { Skeleton } from "@/components/ui/skeleton";

export function ModuleGate({
  serviceId,
  children,
}: {
  serviceId: ServiceId;
  children: React.ReactNode;
}) {
  const { user, subscribedServices, loading } = useSession();

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (!user || !subscribedServices.includes(serviceId)) {
    return <ModuleLocked serviceId={serviceId} />;
  }

  return <>{children}</>;
}
