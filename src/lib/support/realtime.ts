"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type SupportBroadcast = {
  id: string;
  sender: "USER" | "ADMIN";
  body: string;
};

export type SupportChannel = {
  broadcast: (msg: SupportBroadcast) => void;
  close: () => void;
};

/**
 * Subscribe to a per-thread Supabase Broadcast channel for instant message
 * delivery between a user and an admin. Pure pub/sub — no DB replication or RLS
 * needed; the database stays the source of truth and polling remains the
 * fallback, so if realtime is unavailable the chat still works (just slower).
 */
export function subscribeSupportThread(
  threadId: string,
  onMessage: (msg: SupportBroadcast) => void,
): SupportChannel {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return { broadcast: () => {}, close: () => {} };
  }

  const channel = supabase.channel(`support-thread-${threadId}`, {
    config: { broadcast: { self: false } },
  });

  channel
    .on("broadcast", { event: "msg" }, (payload) => {
      onMessage(payload.payload as SupportBroadcast);
    })
    .subscribe();

  return {
    broadcast: (msg) => {
      void channel.send({ type: "broadcast", event: "msg", payload: msg });
    },
    close: () => {
      void supabase.removeChannel(channel);
    },
  };
}
