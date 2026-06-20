import type { PlanInterval } from "@prisma/client";

const DISCOUNTS: Record<PlanInterval, number> = {
  MONTHLY: 0,
  QUARTERLY: 0.1,
  YEARLY: 0.2,
};

const MONTHS: Record<PlanInterval, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  YEARLY: 12,
};

export function calculatePrice(
  baseMonthlyCents: number,
  interval: PlanInterval,
): number {
  const months = MONTHS[interval];
  const discount = DISCOUNTS[interval];
  const total = baseMonthlyCents * months;
  return Math.round(total * (1 - discount));
}

export function calculateEndDate(
  startDate: Date,
  interval: PlanInterval,
): Date {
  const end = new Date(startDate);
  end.setMonth(end.getMonth() + MONTHS[interval]);
  return end;
}

export function intervalLabel(interval: PlanInterval): string {
  return interval === "MONTHLY"
    ? "monthly"
    : interval === "QUARTERLY"
      ? "quarterly"
      : "yearly";
}

export function intervalMonths(interval: PlanInterval): number {
  return MONTHS[interval];
}
