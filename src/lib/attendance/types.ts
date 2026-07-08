/**
 * Shared attendance DTOs — plain, serialisable shapes passed between the
 * server (API routes / service layer) and the client UI. Enum values mirror the
 * Prisma enums so both sides stay in sync.
 *
 * This module is intentionally self-contained: the Attendance service must not
 * depend on Inventory, Sales, Expenses, POS or any other Solaris module.
 */

export type EmploymentStatus =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "PROBATIONARY";

export type EmployeeStatus = "ACTIVE" | "DISABLED";

export type AttendancePunchType = "TIME_IN" | "TIME_OUT";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AttendanceStatus =
  | "PENDING"
  | "PRESENT"
  | "LATE"
  | "ABSENT"
  | "REJECTED";

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  PROBATIONARY: "Probationary",
};

export interface DepartmentDTO {
  id: string;
  name: string;
  employeeCount: number;
}

export interface EmployeeDTO {
  id: string;
  employeeCode: string;
  fullName: string;
  username: string;
  departmentId: string | null;
  departmentName: string | null;
  position: string | null;
  employmentStatus: EmploymentStatus;
  dateHired: string | null;
  status: EmployeeStatus;
  createdAt: string;
}

export interface AttendanceLogDTO {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string | null;
  workDate: string;
  timeIn: string | null;
  timeOut: string | null;
  workingHours: number | null;
  status: AttendanceStatus;
}

export interface PendingRequestDTO {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string | null;
  position: string | null;
  type: AttendancePunchType;
  submittedAt: string;
  browser: string | null;
  device: string | null;
  ipAddress: string | null;
  /** Suggestion computed from the attendance policy — owner still decides. */
  suggestLate: boolean;
}

export interface RecentActivityDTO {
  id: string;
  employeeName: string;
  type: AttendancePunchType;
  approvalStatus: ApprovalStatus;
  submittedAt: string;
}

export interface OverviewDTO {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  pendingRequests: number;
  absentToday: number;
  approvedToday: number;
  rejectedToday: number;
  recentActivity: RecentActivityDTO[];
  portalUrl: string;
  slug: string;
}

export interface AttendanceSettingsDTO {
  portalBusinessName: string | null;
  logoUrl: string | null;
  workdayStart: string;
  lateThresholdMinutes: number;
  autoAbsentPending: boolean;
  autoAbsentAfterHours: number;
  timezone: string;
}

/** Public branding for the employee login portal. */
export interface PortalBrandingDTO {
  businessName: string;
  logoUrl: string | null;
}

export interface ReportSummaryDTO {
  period: string;
  rangeFrom: string;
  rangeTo: string;
  present: number;
  late: number;
  absent: number;
  rejected: number;
  pending: number;
  attendancePercentage: number;
  averageWorkingHours: number;
  totalEmployees: number;
  rows: AttendanceLogDTO[];
}

/** What the employee portal returns for the logged-in employee. */
export interface PortalMeDTO {
  employee: {
    id: string;
    fullName: string;
    employeeCode: string;
    position: string | null;
    departmentName: string | null;
  };
  business: {
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  today: AttendanceLogDTO | null;
  history: AttendanceLogDTO[];
}
