"use client";

import { create } from "zustand";

/**
 * Global open-state for the concierge support takeover. Lets any surface (the
 * CTA invite, the navbar "Contact" link, the support bubble) open the same
 * single overlay mounted once at the marketing layout level.
 *
 * `fromBubble` records that it was opened from the floating support bubble, so
 * the overlay can play the circular "teleport" reveal from the lower-right and
 * resume the live admin chat.
 */
type ConciergeState = {
  open: boolean;
  fromBubble: boolean;
  setOpen: (open: boolean) => void;
  openSupport: () => void;
};

export const useConcierge = create<ConciergeState>((set) => ({
  open: false,
  fromBubble: false,
  setOpen: (open) => set({ open, fromBubble: false }),
  openSupport: () => set({ open: true, fromBubble: true }),
}));
