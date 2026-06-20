"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DiamondMark } from "@/components/logo";
import { useSession } from "@/lib/auth/hooks";

/**
 * Client-side route protection. Reinforced by the proxy.ts check against the
 * Supabase session cookie. Redirects unauthenticated visitors to /login.
 */
export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <DiamondMark className="size-12 animate-pulse" />
      </div>
    );
  }

  return <>{children}</>;
}
