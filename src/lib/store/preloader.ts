import { create } from "zustand";

/**
 * Preloader → page handoff. The hero (and anything else that wants a
 * choreographed entrance) waits for `revealed` instead of animating while
 * still hidden behind the preloader curtains. The preloader resets this on
 * mount and flips it the moment the curtains start opening.
 */
export const usePreloader = create<{
  revealed: boolean;
  setRevealed: (v: boolean) => void;
}>((set) => ({
  // True by default so pages that render without the preloader (e.g. client-
  // side navigation back to the homepage) animate immediately.
  revealed: true,
  setRevealed: (v) => set({ revealed: v }),
}));
