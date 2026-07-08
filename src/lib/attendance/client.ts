"use client";

/**
 * Client-side helpers for the attendance UI — thin fetch wrappers plus shared
 * formatting and status presentation. Self-contained: no other Solaris module.
 */

import type {
  AttendancePunchType,
  AttendanceStatus,
  ApprovalStatus,
} from "@/lib/attendance/types";

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Request failed");
  return json as T;
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Request failed");
  return json as T;
}

// --- Formatting -------------------------------------------------------------

export const fmtTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const fmtHours = (h: number | null) =>
  h != null ? `${h.toFixed(1)}h` : "—";

// --- Status presentation ----------------------------------------------------

type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "accent"
  | "success"
  | "warning"
  | "muted";

export const ATTENDANCE_STATUS_META: Record<
  AttendanceStatus,
  { label: string; variant: BadgeVariant; className?: string }
> = {
  PRESENT: { label: "Present", variant: "success" },
  LATE: { label: "Late", variant: "warning" },
  ABSENT: {
    label: "Absent",
    variant: "outline",
    className: "border-destructive/25 bg-destructive/10 text-destructive",
  },
  REJECTED: {
    label: "Rejected",
    variant: "outline",
    className: "border-destructive/25 bg-destructive/10 text-destructive",
  },
  PENDING: { label: "Pending", variant: "muted" },
};

export const APPROVAL_STATUS_META: Record<
  ApprovalStatus,
  { label: string; variant: BadgeVariant; className?: string }
> = {
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: {
    label: "Rejected",
    variant: "outline",
    className: "border-destructive/25 bg-destructive/10 text-destructive",
  },
  PENDING: { label: "Pending", variant: "warning" },
};

export const PUNCH_LABEL: Record<AttendancePunchType, string> = {
  TIME_IN: "Time In",
  TIME_OUT: "Time Out",
};
