"use client";

/**
 * Client-side helpers for the POS UI — thin fetch wrappers plus shared
 * formatting. Self-contained: no other Solaris module.
 */

/** Thrown when a protected endpoint answers 403 PIN_REQUIRED — the UI catches
 * this to open the PIN dialog and retry. */
export class PinRequiredError extends Error {
  constructor() {
    super("Admin PIN required");
    this.name = "PinRequiredError";
  }
}

async function handle<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 403 && json?.code === "PIN_REQUIRED")
      throw new PinRequiredError();
    throw new Error(json?.error ?? "Request failed");
  }
  return json as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  return handle<T>(await fetch(url, { cache: "no-store" }));
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
): Promise<T> {
  return handle<T>(
    await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}

// --- Formatting ---------------------------------------------------------------

/** Peso amount — whole pesos shown clean, centavo amounts get 2 decimals. */
export const fmtMoney = (pesos: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: Number.isInteger(pesos) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(pesos);

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });

export const fmtHourLabel = (hour: number) => {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? "AM" : "PM"}`;
};
