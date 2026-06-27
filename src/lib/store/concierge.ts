"use client";

import { create } from "zustand";

/**
 * Global open-state for the concierge support takeover. Lets any surface (the
 * CTA invite, the navbar "Contact" link, etc.) open the same single overlay
 * mounted once at the marketing layout level.
 */
type ConciergeState = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const useConcierge = create<ConciergeState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
