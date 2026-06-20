"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Admin session (separate from customer auth). The default super-admin is
 * seeded directly — it does not rely on email verification, per spec. In
 * production these credentials live in the database (seeded) and are checked
 * server-side; here we check them client-side for the demo.
 */

export const SEEDED_ADMIN = {
  email: "admin@solarisdiamond.com",
  password: "solaris-admin-2026",
  name: "System Administrator",
};

interface AdminState {
  authed: boolean;
  name: string | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      authed: false,
      name: null,
      login: (email, password) => {
        const ok =
          email.trim().toLowerCase() === SEEDED_ADMIN.email &&
          password === SEEDED_ADMIN.password;
        if (ok) set({ authed: true, name: SEEDED_ADMIN.name });
        return ok;
      },
      logout: () => set({ authed: false, name: null }),
    }),
    { name: "solaris-admin" },
  ),
);
