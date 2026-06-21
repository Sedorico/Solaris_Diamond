"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SessionUser } from "@/lib/auth/session";
import type { ServiceId } from "@/lib/data/services";

interface UseSessionReturn {
  user: SessionUser | null;
  subscribedServices: ServiceId[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Session is fetched ONCE at the app root and shared via context. Previously
 * every consumer (navbar, dashboard guard, topbar, sidebar, each page) ran its
 * own `useSession`, each firing a separate `/api/auth/session` request with its
 * own loading state — which both slowed the dashboard down and caused a flash
 * of the empty "guest" UI while the slower fetches resolved. One provider fixes
 * both: a single request, a single loading state, no flash.
 */
const SessionContext = createContext<UseSessionReturn | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [subscribedServices, setSubscribedServices] = useState<ServiceId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
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
      setUser(null);
      setSubscribedServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();

    // In mock mode (no Supabase keys configured) the browser client is null.
    // We still rely on fetchSession()/the session API route for auth state,
    // so just skip the real-time auth listener instead of crashing.
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchSession();
    });

    return () => subscription.unsubscribe();
  }, [fetchSession]);

  return (
    <SessionContext.Provider
      value={{ user, subscribedServices, loading, error, refresh: fetchSession }}
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
      error: null,
      refresh: async () => {},
    };
  }
  return ctx;
}
