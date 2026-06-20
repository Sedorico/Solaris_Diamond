"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

export interface ChartPoint {
  label: string;
  value: number;
}

/** Animated bar chart — used for weekly / category breakdowns. */
export function BarChart({
  data,
  className,
  format = (v) => String(v),
}: {
  data: ChartPoint[];
  className?: string;
  format?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("flex h-56 items-end gap-2", className)}>
      {data.map((d, i) => (
        <div key={d.label} className="group flex flex-1 flex-col items-center gap-2">
          <div className="relative flex w-full flex-1 items-end">
            <motion.div
              initial={{ height: 0 }}
              whileInView={{ height: `${(d.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="w-full rounded-t-md bg-foreground/80 transition-colors group-hover:bg-accent"
            >
              <span className="pointer-events-none absolute inset-x-0 -top-6 text-center text-[11px] font-medium opacity-0 transition-opacity group-hover:opacity-100">
                {format(d.value)}
              </span>
            </motion.div>
          </div>
          <span className="text-[11px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Animated gradient area chart — used for the daily revenue trend. */
export function AreaChart({
  data,
  className,
  height = 220,
}: {
  data: ChartPoint[];
  className?: string;
  height?: number;
}) {
  const gradId = useId();
  const width = 600;
  const pad = 8;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (d.value - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const area = `${line} L ${points[points.length - 1][0]} ${height} L ${points[0][0]} ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("h-56 w-full", className)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill={`url(#${gradId})`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: "easeInOut" }}
      />
    </svg>
  );
}

/** Thin donut for category share. */
export function Donut({
  segments,
  className,
}: {
  segments: { label: string; value: number; color: string }[];
  className?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg viewBox="0 0 100 100" className={cn("size-40 -rotate-90", className)}>
      {segments.map((seg) => {
        const len = (seg.value / total) * circ;
        const el = (
          <circle
            key={seg.label}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth="12"
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset}
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}
