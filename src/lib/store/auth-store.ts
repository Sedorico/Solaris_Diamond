"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ServiceId } from "@/lib/data/services";
import { bundleMap, type BundleId } from "@/lib/data/bundles";
import { generateOtp } from "@/lib/utils";

/**
 * Client-side auth + subscription store.
 *
 * In production these actions are thin wrappers over Supabase Auth + the
 * Prisma-backed subscription tables (see `lib/auth/*` and `lib/payments/*`).
 * For local development the store fully simulates the flows — including OTP
 * verification and new-device detection — so the product is runnable end to
 * end without any external keys.
 */

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  businessName?: string;
  verified: boolean;
}

export interface LoginActivity {
  id: string;
  at: string;
  device: string;
  location: string;
  current: boolean;
}

interface PendingVerification {
  email: string;
  code: string;
  reason: "registration" | "new-device" | "password-reset";
}

interface AuthState {
  user: SessionUser | null;
  /** Stored only for local-dev simulation (e.g. admin verification in POS). In production this never lives client-side — auth is delegated to Supabase. */
  password: string | null;
  subscriptions: ServiceId[];
  knownDevices: string[];
  activity: LoginActivity[];
  pending: PendingVerification | null;

  register: (input: {
    fullName: string;
    email: string;
    businessName?: string;
    password: string;
  }) => Promise<{ otp: string }>;
  login: (input: {
    email: string;
    password: string;
  }) => Promise<{ status: "ok" | "verify"; otp?: string }>;
  verifyOtp: (code: string) => Promise<boolean>;
  /** Finalize a session after the server has already validated the emailed OTP — marks the user verified, trusts this device, and records the sign-in. */
  completeVerification: () => void;
  resendOtp: () => Promise<{ otp: string }>;
  requestPasswordReset: (email: string) => Promise<{ otp: string }>;
  resetPassword: (newPassword: string) => Promise<boolean>;
  logout: () => void;

  /** Verifies a candidate string against the account's main password. Used by modules like POS to gate admin-only actions with the account password instead of a separate PIN. */
  verifyAccountPassword: (candidate: string) => boolean;

  subscribeServices: (ids: ServiceId[]) => void;
  subscribeBundle: (id: BundleId) => void;
  hasService: (id: ServiceId) => boolean;
}

function deviceFingerprint(): string {
  if (typeof navigator === "undefined") return "server";
  return `${navigator.platform || "web"} · ${navigator.userAgent.slice(0, 24)}`;
}

function makeActivity(current = true): LoginActivity {
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    device: deviceFingerprint(),
    location: "Manila, PH",
    current,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      password: null,
      subscriptions: [],
      knownDevices: [],
      activity: [],
      pending: null,

      register: async ({ fullName, email, businessName, password }) => {
        const code = generateOtp();
        set({
          user: {
            id: crypto.randomUUID(),
            fullName,
            email,
            businessName,
            verified: false,
          },
          password,
          pending: { email, code, reason: "registration" },
        });
        return { otp: code };
      },

      login: async ({ email, password }) => {
        const fingerprint = deviceFingerprint();
        const { knownDevices, user } = get();
        const existing =
          user && user.email === email
            ? user
            : {
                id: crypto.randomUUID(),
                fullName: email.split("@")[0].replace(/[^a-z]/gi, " ").trim() || "Member",
                email,
                verified: true,
              };

        // New-device detection -> require OTP (2FA)
        if (!knownDevices.includes(fingerprint)) {
          const code = generateOtp();
          set({
            user: { ...existing, verified: existing.verified },
            password,
            pending: { email, code, reason: "new-device" },
          });
          return { status: "verify", otp: code };
        }

        set({
          user: { ...existing, verified: true },
          password,
          activity: [makeActivity(), ...get().activity].slice(0, 12),
        });
        return { status: "ok" };
      },

      verifyOtp: async (code) => {
        const { pending, user, knownDevices } = get();
        if (!pending || pending.code !== code) return false;
        const fingerprint = deviceFingerprint();
        set({
          user: user ? { ...user, verified: true } : null,
          pending: null,
          knownDevices: knownDevices.includes(fingerprint)
            ? knownDevices
            : [...knownDevices, fingerprint],
          activity: [makeActivity(), ...get().activity].slice(0, 12),
        });
        return true;
      },

      completeVerification: () => {
        const { user, knownDevices } = get();
        const fingerprint = deviceFingerprint();
        set({
          user: user ? { ...user, verified: true } : null,
          pending: null,
          knownDevices: knownDevices.includes(fingerprint)
            ? knownDevices
            : [...knownDevices, fingerprint],
          activity: [makeActivity(), ...get().activity].slice(0, 12),
        });
      },

      resendOtp: async () => {
        const code = generateOtp();
        const { pending } = get();
        if (pending) set({ pending: { ...pending, code } });
        return { otp: code };
      },

      requestPasswordReset: async (email) => {
        const code = generateOtp();
        set({ pending: { email, code, reason: "password-reset" } });
        return { otp: code };
      },

      resetPassword: async (newPassword) => {
        set({ password: newPassword });
        return true;
      },

      logout: () => set({ user: null, pending: null }),

      verifyAccountPassword: (candidate) => {
        const { password } = get();
        if (!password) return false;
        return candidate === password;
      },

      subscribeServices: (ids) =>
        set((state) => ({
          subscriptions: Array.from(new Set([...state.subscriptions, ...ids])),
        })),

      subscribeBundle: (id) => {
        const bundle = bundleMap[id];
        if (!bundle) return;
        set((state) => ({
          subscriptions: Array.from(
            new Set([...state.subscriptions, ...bundle.services]),
          ),
        }));
      },

      hasService: (id) => get().subscriptions.includes(id),
    }),
    {
      name: "solaris-auth",
      partialize: (s) => ({
        user: s.user,
        password: s.password,
        subscriptions: s.subscriptions,
        knownDevices: s.knownDevices,
        activity: s.activity,
      }),
    },
  ),
);