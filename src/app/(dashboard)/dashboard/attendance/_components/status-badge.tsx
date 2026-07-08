"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  APPROVAL_STATUS_META,
  ATTENDANCE_STATUS_META,
} from "@/lib/attendance/client";
import type { ApprovalStatus, AttendanceStatus } from "@/lib/attendance/types";

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const meta = ATTENDANCE_STATUS_META[status];
  return (
    <Badge variant={meta.variant} className={cn(meta.className)}>
      {meta.label}
    </Badge>
  );
}

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const meta = APPROVAL_STATUS_META[status];
  return (
    <Badge variant={meta.variant} className={cn(meta.className)}>
      {meta.label}
    </Badge>
  );
}
