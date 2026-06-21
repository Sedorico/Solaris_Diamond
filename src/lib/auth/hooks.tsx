"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SessionUser } from "@/lib/auth/session";
import type { ServiceId } from "@/lib/data/services";

interface UseSessionReturn {
  user: SessionUser | null;
  subscribedServices: ServiceId[];
  /** True only until the auth state is first KNOWN — resolved instantly from
   *  the local Supabase session, so the UI never hangs on "is this user logged
   *  in?". */
  loading: boolean;
  /** True once the full, DB-backed session (authoritative role + subscriptions)
   *  has loaded. Gate role-sensitive screens (admin) on this, not `loading`. */
  enriched: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Session is fetched ONCE at the app root and shared via context. Login is
 * detected INSTANTLY from the locally-stored Supabase session (no network),
 * then enriched in the background with the full DB-backed user (role,
 * subscriptions) from /api/auth/session — so the UI never waits on a slow
 * Supabase + DB round trip just to know whether someone is signed in.
 */
const SessionContext = createContext<UseSessionReturn | null>(null);

/** Build a preliminary user from the local session — instant, no network.
 *  Role defaults to OWNER until the server confirms it. */
function optimisticUser(u: SupabaseUser): SessionUser {
  const meta = (u.user_metadata ?? {}) as {
    full_name?: string;
    business_name?: string;
  };
  return {
    id: u.id,
    authId: u.id,
    tenantId: "",
    fullName: meta.full_name ?? u.email?.split("@")[0] ?? "User",
    email: u.email ?? "",
    role: "OWNER",
    businessName: meta.business_name ?? null,
    emailVerified: Boolean(u.email_confirmed_at),
    createdAt: u.created_at ? new Date(u.created_at) : new Date(),
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [subscribedServices, setSubscribedServices] = useState<ServiceId[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriched, setEnriched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Full, DB-backed session — slower (server round trip), authoritative.
  const fetchSession = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/auth/session");
      if (!res.ok) {
        setUser(null);
        setSubscribedServices([]);
        return;
      }
      const data = await res.json();
      setUser(data.user ?? null);
      setSubscribedServices(data.subscribedServices ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch session");
    } finally {
      setEnriched(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    if (supabase) {
      // INSTANT: read the locally-stored session (no network) so the UI knows
      // immediately whether someone is signed in.
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          setUser((prev) => prev ?? optimisticUser(data.session!.user));
        }
        setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(() => {
        fetchSession();
      });

      // Enrich with the full DB-backed session in the background.
      fetchSession();

      return () => subscription.unsubscribe();
    }

    // Mock mode (no Supabase keys): rely on the server route only.
    fetchSession();
  }, [fetchSession]);

  return (
    <SessionContext.Provider
      value={{
        user,
        subscribedServices,
        loading,
        enriched,
        error,
        refresh: fetchSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): UseSessionReturn {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    // No provider in the tree (shouldn't happen for app routes) — return a safe
    // default so consumers never crash.
    return {
      user: null,
      subscribedServices: [],
      loading: true,
      enriched: false,
      error: null,
      refresh: async () => {},
    };
  }
  return ctx;
}
