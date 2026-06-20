import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "PHP",
  opts: Intl.NumberFormatOptions = {},
) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    ...opts,
  }).format(amount);
}

export function formatNumber(value: number, opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat("en-US", opts).format(value);
}

export function formatDate(date: Date | string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...opts,
  }).format(new Date(date));
}

export function relativeTime(date: Date | string) {
  const d = new Date(date).getTime();
  const diff = Date.now() - d;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Deterministic 6-digit OTP (mock generator for the dev auth layer). */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
