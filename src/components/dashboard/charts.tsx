"use client";

import { motion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

export interface ChartPoint {
  label: string;
  value: number;
}

/** Shared categorical palette for pies and coloured bars. */
const PIE_COLORS = [
  "#C98A3C", // accent gold
  "#7A4422", // coffee brown
  "#E8B84B", // amber
  "#5C5C5E", // graphite
  "#A6A6A4", // stone
  "#161618", // near-black
  "#D08770", // terracotta
  "#88C0D0", // muted cyan
];

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
  // Thin out x-axis labels on dense ranges (e.g. 30 daily buckets) so they
  // never overflow the card. Bars always shrink to fit via min-w-0.
  const labelStep = Math.max(1, Math.ceil(data.length / 12));
  return (
    // Columns must stretch to the container height so the bars' percentage
    // heights resolve against a definite box (items-end collapses them to 0).
    <div className={cn("flex h-56 items-stretch gap-1.5", className)}>
      {data.map((d, i) => {
        const showLabel = data.length <= 12 || i % labelStep === 0 || i === data.length - 1;
        return (
          <div key={d.label + i} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="relative flex w-full flex-1 items-end">
              <motion.div
                initial={{ height: "0%" }}
                animate={{ height: `${(d.value / max) * 100}%` }}
                transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="w-full min-h-px rounded-t-md bg-foreground/80 transition-colors group-hover:bg-accent"
              >
                <span className="pointer-events-none absolute inset-x-0 -top-6 text-center text-[11px] font-medium opacity-0 transition-opacity group-hover:opacity-100">
                  {format(d.value)}
                </span>
              </motion.div>
            </div>
            <span className="relative block h-4 w-full">
              {showLabel && (
                <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-muted-foreground">
                  {d.label}
                </span>
              )}
            </span>
          </div>
        );
      })}
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
  const scrollRef = useRef<HTMLDivElement>(null);
  // Show every date and let the user scroll horizontally; jump to the most
  // recent point (right edge) on mount and whenever the data changes.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [data.length, height]);
  const width = 600;
  const pad = 8;
  // Duplicate a lone point so single-bucket ranges (e.g. "Today") draw a flat
  // line instead of dividing by zero.
  const series = data.length === 1 ? [data[0], data[0]] : data;
  const max = Math.max(...series.map((d) => d.value), 1);
  const min = Math.min(...series.map((d) => d.value), 0);
  const range = max - min || 1;

  const points = series.map((d, i) => {
    const x = pad + (i / (series.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (d.value - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  if (points.length === 0) {
    return <div className={cn("h-56 w-full", className)} />;
  }

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const area = `${line} L ${points[points.length - 1][0]} ${height} L ${points[0][0]} ${height} Z`;

  return (
    <div ref={scrollRef} className={cn("w-full overflow-x-auto", className)}>
      {/* Wide enough to give every date room; scrolls horizontally when needed. */}
      <div style={{ minWidth: `${Math.max(data.length * 44, 320)}px` }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-56 w-full"
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
            animate={{ opacity: 1 }}
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
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
          />
        </svg>
        <div className="relative mt-2 h-4 w-full">
          {data.map((d, i) => {
            const left =
              data.length > 1
                ? ((pad + (i / (data.length - 1)) * (width - pad * 2)) / width) * 100
                : 50;
            const transform =
              i === 0 ? "translateX(0)" : i === data.length - 1 ? "translateX(-100%)" : "translateX(-50%)";
            return (
              <span
                key={d.label + i}
                className="absolute top-0 whitespace-nowrap text-[10px] text-muted-foreground"
                style={{ left: `${left}%`, transform }}
              >
                {d.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Horizontal bar graph — labelled rows with a proportional bar and value. */
export function HBarChart({
  data,
  className,
  format = (v) => String(v),
  colored = false,
}: {
  data: { label: string; value: number }[];
  className?: string;
  format?: (v: number) => string;
  colored?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      {data.map((d, i) => (
        <div key={d.label + i} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-sm" title={d.label}>
            {d.label}
          </span>
          <div className="h-6 flex-1 overflow-hidden rounded-md bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-md bg-accent"
              style={colored ? { background: PIE_COLORS[i % PIE_COLORS.length] } : undefined}
            />
          </div>
          <span className="tabular w-20 shrink-0 text-right text-sm font-medium">
            {format(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Filled pie chart with an optional inline legend — used for share breakdowns. */
export function PieChart({
  data,
  className,
  format = (v) => String(v),
  showLegend = true,
}: {
  data: { label: string; value: number }[];
  className?: string;
  format?: (v: number) => string;
  showLegend?: boolean;
}) {
  const cx = 100;
  const cy = 100;
  const r = 96;
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0);

  const fractions = data.map((d) => (total > 0 ? Math.max(0, d.value) / total : 0));
  const slices = data.map((d, i) => {
    const startFraction = fractions.slice(0, i).reduce((s, f) => s + f, 0);
    const start = -Math.PI / 2 + startFraction * Math.PI * 2;
    const end = start + fractions[i] * Math.PI * 2;
    return { ...d, fraction: fractions[i], start, end, color: PIE_COLORS[i % PIE_COLORS.length] };
  });

  const arc = (start: number, end: number) => {
    const x0 = cx + r * Math.cos(start);
    const y0 = cy + r * Math.sin(start);
    const x1 = cx + r * Math.cos(end);
    const y1 = cy + r * Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
  };

  // A single slice at 100% can't be drawn as an arc (start === end), so fall
  // back to a full circle.
  const whole = slices.find((s) => s.fraction >= 0.9999);

  const pie = (
    <svg viewBox="0 0 200 200" className="size-44 shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="var(--color-secondary)" />
      {whole ? (
        <circle cx={cx} cy={cy} r={r} fill={whole.color} />
      ) : (
        slices.map((s) =>
          s.fraction > 0 ? (
            <motion.path
              key={s.label}
              d={arc(s.start, s.end)}
              fill={s.color}
              stroke="var(--color-card)"
              strokeWidth="1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
          ) : null,
        )
      )}
    </svg>
  );

  if (!showLegend) {
    return <div className={cn("flex justify-center", className)}>{pie}</div>;
  }

  return (
    <div className={cn("mx-auto flex max-w-xl flex-col items-center gap-6 py-2 sm:flex-row sm:gap-10", className)}>
      {pie}
      <div className="flex w-full flex-1 flex-col gap-2.5">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="truncate">{s.label}</span>
            </div>
            <div className="flex shrink-0 items-baseline gap-2">
              <span className="tabular font-medium">{format(s.value)}</span>
              <span className="tabular text-xs text-muted-foreground">{(s.fraction * 100).toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
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
  const lens = segments.map((seg) => (seg.value / total) * circ);

  return (
    <svg viewBox="0 0 100 100" className={cn("size-40 -rotate-90", className)}>
      {segments.map((seg, i) => {
        const len = lens[i];
        const offset = lens.slice(0, i).reduce((s, l) => s + l, 0);
        return (
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
      })}
    </svg>
  );
}
