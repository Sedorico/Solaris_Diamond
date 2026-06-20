"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, integrations } from "@/lib/env";

/**
 * Browser-side Supabase client for auth in the React tree.
 * Returns null in mock mode (no Supabase keys configured).
 */
export function createSupabaseBrowserClient() {
  if (!integrations.supabase) return null;
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}