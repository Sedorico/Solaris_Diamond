"use client";

import { useEffect, useState, useCallback } from "react";
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

export function useSession(): UseSessionReturn {
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

  return { user, subscribedServices, loading, error, refresh: fetchSession };
}