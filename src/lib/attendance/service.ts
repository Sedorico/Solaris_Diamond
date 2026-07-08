import "server-only";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { ensureTenantSlug } from "@/lib/attendance/slug";
import { hashPassword, verifyPassword } from "@/lib/attendance/employee-auth";
import { env } from "@/lib/env";
import type {
  AttendanceLogDTO,
  AttendanceSettingsDTO,
  DepartmentDTO,
  EmployeeDTO,
  EmploymentStatus,
  OverviewDTO,
  PendingRequestDTO,
  PortalMeDTO,
  ReportSummaryDTO,
} from "@/lib/attendance/types";

/**
 * Server-side attendance data access. Every function is tenant-scoped: owner
 * calls pass the authenticated `tenantId`, portal calls pass the employee's
 * `tenantId` from their session. No query ever crosses tenant boundaries.
 */

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Midnight (server local) of the given date — used as the per-day key. */
export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function hoursBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / 3_600_000);
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

type LogWithEmployee = Prisma.AttendanceLogGetPayload<{
  include: { employee: { include: { department: true } } };
}>;

function toLogDTO(log: LogWithEmployee): AttendanceLogDTO {
  return {
    id: log.id,
    employeeId: log.employeeId,
    employeeName: log.employee.fullName,
    employeeCode: log.employee.employeeCode,
    departmentName: log.employee.department?.name ?? null,
    workDate: log.workDate.toISOString(),
    timeIn: log.timeIn?.toISOString() ?? null,
    timeOut: log.timeOut?.toISOString() ?? null,
    workingHours: log.workingHours ?? null,
    status: log.status,
  };
}

type EmployeeWithDept = Prisma.EmployeeGetPayload<{
  include: { department: true };
}>;

function toEmployeeDTO(e: EmployeeWithDept): EmployeeDTO {
  return {
    id: e.id,
    employeeCode: e.employeeCode,
    fullName: e.fullName,
    username: e.username,
    departmentId: e.departmentId,
    departmentName: e.department?.name ?? null,
    position: e.position,
    employmentStatus: e.employmentStatus,
    dateHired: e.dateHired?.toISOString() ?? null,
    status: e.status,
    createdAt: e.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSettings(
  tenantId: string,
): Promise<AttendanceSettingsDTO> {
  const prisma = getPrisma();
  const s =
    (await prisma.attendanceSettings.findUnique({ where: { tenantId } })) ??
    (await prisma.attendanceSettings.create({ data: { tenantId } }));
  return {
    portalBusinessName: s.portalBusinessName,
    logoUrl: s.logoUrl,
    workdayStart: s.workdayStart,
    lateThresholdMinutes: s.lateThresholdMinutes,
    autoAbsentPending: s.autoAbsentPending,
    autoAbsentAfterHours: s.autoAbsentAfterHours,
    timezone: s.timezone,
  };
}

export async function updateSettings(
  tenantId: string,
  patch: Partial<AttendanceSettingsDTO>,
): Promise<AttendanceSettingsDTO> {
  const prisma = getPrisma();
  await prisma.attendanceSettings.upsert({
    where: { tenantId },
    create: { tenantId, ...patch },
    update: { ...patch },
  });
  return getSettings(tenantId);
}

/** Is a TIME_IN at `at` late per policy? */
function isLate(at: Date, workdayStart: string, thresholdMin: number): boolean {
  const [h, m] = workdayStart.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h)) return false;
  const cutoff = startOfDay(at);
  cutoff.setHours(h, (m || 0) + thresholdMin, 0, 0);
  return at.getTime() > cutoff.getTime();
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

export async function listDepartments(
  tenantId: string,
): Promise<DepartmentDTO[]> {
  const prisma = getPrisma();
  const rows = await prisma.department.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: true } } },
  });
  return rows.map((d) => ({
    id: d.id,
    name: d.name,
    employeeCount: d._count.employees,
  }));
}

export async function createDepartment(
  tenantId: string,
  name: string,
): Promise<DepartmentDTO> {
  const prisma = getPrisma();
  const d = await prisma.department.create({
    data: { tenantId, name: name.trim() },
  });
  return { id: d.id, name: d.name, employeeCount: 0 };
}

export async function deleteDepartment(
  tenantId: string,
  id: string,
): Promise<{ ok: boolean; reason?: string }> {
  const prisma = getPrisma();
  const dept = await prisma.department.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { employees: true } } },
  });
  if (!dept) return { ok: false, reason: "Department not found" };
  if (dept._count.employees > 0) {
    return {
      ok: false,
      reason: `"${dept.name}" still has employees. Reassign them first.`,
    };
  }
  await prisma.department.delete({ where: { id } });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

export interface EmployeeInput {
  fullName: string;
  username: string;
  password?: string;
  employeeCode?: string;
  departmentId?: string | null;
  position?: string | null;
  employmentStatus?: EmploymentStatus;
  dateHired?: string | null;
}

export async function listEmployees(
  tenantId: string,
): Promise<EmployeeDTO[]> {
  const prisma = getPrisma();
  const rows = await prisma.employee.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { department: true },
  });
  return rows.map(toEmployeeDTO);
}

async function nextEmployeeCode(tenantId: string): Promise<string> {
  const prisma = getPrisma();
  const count = await prisma.employee.count({ where: { tenantId } });
  return `EMP-${String(count + 1).padStart(3, "0")}`;
}

export async function createEmployee(
  tenantId: string,
  input: EmployeeInput,
): Promise<{ ok: boolean; employee?: EmployeeDTO; reason?: string }> {
  const prisma = getPrisma();
  const fullName = input.fullName.trim();
  const username = input.username.trim().toLowerCase();
  if (!fullName || !username) {
    return { ok: false, reason: "Name and username are required" };
  }
  if (!input.password || input.password.length < 4) {
    return { ok: false, reason: "Password must be at least 4 characters" };
  }

  const dupe = await prisma.employee.findFirst({
    where: { tenantId, username },
    select: { id: true },
  });
  if (dupe) return { ok: false, reason: "Username already taken" };

  const employeeCode = input.employeeCode?.trim() || (await nextEmployeeCode(tenantId));

  try {
    const e = await prisma.employee.create({
      data: {
        tenantId,
        employeeCode,
        fullName,
        username,
        passwordHash: hashPassword(input.password),
        departmentId: input.departmentId || null,
        position: input.position?.trim() || null,
        employmentStatus: input.employmentStatus ?? "FULL_TIME",
        dateHired: input.dateHired ? new Date(input.dateHired) : null,
      },
      include: { department: true },
    });
    return { ok: true, employee: toEmployeeDTO(e) };
  } catch {
    return { ok: false, reason: "Employee code or username already in use" };
  }
}

export async function updateEmployee(
  tenantId: string,
  id: string,
  input: Partial<EmployeeInput>,
): Promise<{ ok: boolean; employee?: EmployeeDTO; reason?: string }> {
  const prisma = getPrisma();
  const existing = await prisma.employee.findFirst({ where: { id, tenantId } });
  if (!existing) return { ok: false, reason: "Employee not found" };

  const data: Prisma.EmployeeUpdateInput = {};
  if (input.fullName !== undefined) data.fullName = input.fullName.trim();
  if (input.username !== undefined) {
    const username = input.username.trim().toLowerCase();
    const dupe = await prisma.employee.findFirst({
      where: { tenantId, username, NOT: { id } },
      select: { id: true },
    });
    if (dupe) return { ok: false, reason: "Username already taken" };
    data.username = username;
  }
  if (input.employeeCode !== undefined)
    data.employeeCode = input.employeeCode.trim();
  if (input.position !== undefined) data.position = input.position?.trim() || null;
  if (input.employmentStatus !== undefined)
    data.employmentStatus = input.employmentStatus;
  if (input.dateHired !== undefined)
    data.dateHired = input.dateHired ? new Date(input.dateHired) : null;
  if (input.departmentId !== undefined)
    data.department = input.departmentId
      ? { connect: { id: input.departmentId } }
      : { disconnect: true };
  if (input.password) data.passwordHash = hashPassword(input.password);

  try {
    const e = await prisma.employee.update({
      where: { id },
      data,
      include: { department: true },
    });
    return { ok: true, employee: toEmployeeDTO(e) };
  } catch {
    return { ok: false, reason: "Employee code or username already in use" };
  }
}

export async function setEmployeeStatus(
  tenantId: string,
  id: string,
  status: "ACTIVE" | "DISABLED",
): Promise<{ ok: boolean; reason?: string }> {
  const prisma = getPrisma();
  const existing = await prisma.employee.findFirst({ where: { id, tenantId } });
  if (!existing) return { ok: false, reason: "Employee not found" };
  await prisma.employee.update({ where: { id }, data: { status } });
  return { ok: true };
}

export async function resetEmployeePassword(
  tenantId: string,
  id: string,
  password: string,
): Promise<{ ok: boolean; reason?: string }> {
  const prisma = getPrisma();
  if (!password || password.length < 4) {
    return { ok: false, reason: "Password must be at least 4 characters" };
  }
  const existing = await prisma.employee.findFirst({ where: { id, tenantId } });
  if (!existing) return { ok: false, reason: "Employee not found" };
  await prisma.employee.update({
    where: { id },
    data: { passwordHash: hashPassword(password) },
  });
  return { ok: true };
}

export async function deleteEmployee(
  tenantId: string,
  id: string,
): Promise<{ ok: boolean; reason?: string }> {
  const prisma = getPrisma();
  const existing = await prisma.employee.findFirst({ where: { id, tenantId } });
  if (!existing) return { ok: false, reason: "Employee not found" };
  // Logs + requests cascade-delete via the schema relations.
  await prisma.employee.delete({ where: { id } });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Punch (portal) — time in / time out
// ---------------------------------------------------------------------------

export interface PunchMeta {
  browser?: string | null;
  device?: string | null;
  ipAddress?: string | null;
}

export async function punch(
  tenantId: string,
  employeeId: string,
  type: "TIME_IN" | "TIME_OUT",
  meta: PunchMeta,
): Promise<{ ok: boolean; reason?: string }> {
  const prisma = getPrisma();
  const now = new Date();
  const workDate = startOfDay(now);

  const log = await prisma.attendanceLog.upsert({
    where: { employeeId_workDate: { employeeId, workDate } },
    create: { tenantId, employeeId, workDate, status: "PENDING" },
    update: {},
  });

  if (type === "TIME_IN") {
    if (log.timeIn && log.status !== "REJECTED") {
      return { ok: false, reason: "You have already timed in today" };
    }
    await prisma.attendanceLog.update({
      where: { id: log.id },
      data: { timeIn: now, status: "PENDING", timeOut: null, workingHours: null },
    });
  } else {
    if (!log.timeIn) {
      return { ok: false, reason: "Please time in first" };
    }
    if (log.timeOut) {
      return { ok: false, reason: "You have already timed out today" };
    }
    await prisma.attendanceLog.update({
      where: { id: log.id },
      data: {
        timeOut: now,
        workingHours: hoursBetween(log.timeIn, now),
      },
    });
  }

  await prisma.attendanceRequest.create({
    data: {
      tenantId,
      employeeId,
      logId: log.id,
      type,
      submittedAt: now,
      browser: meta.browser ?? null,
      device: meta.device ?? null,
      ipAddress: meta.ipAddress ?? null,
      approvalStatus: "PENDING",
    },
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Approval queue (owner)
// ---------------------------------------------------------------------------

export async function listPendingRequests(
  tenantId: string,
): Promise<PendingRequestDTO[]> {
  const prisma = getPrisma();
  const [settings, rows] = await Promise.all([
    getSettings(tenantId),
    prisma.attendanceRequest.findMany({
      where: { tenantId, approvalStatus: "PENDING" },
      orderBy: { submittedAt: "asc" },
      include: { employee: { include: { department: true } } },
    }),
  ]);
  return rows.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    employeeName: r.employee.fullName,
    employeeCode: r.employee.employeeCode,
    departmentName: r.employee.department?.name ?? null,
    position: r.employee.position,
    type: r.type,
    submittedAt: r.submittedAt.toISOString(),
    browser: r.browser,
    device: r.device,
    ipAddress: r.ipAddress,
    suggestLate:
      r.type === "TIME_IN" &&
      isLate(r.submittedAt, settings.workdayStart, settings.lateThresholdMinutes),
  }));
}

export type ReviewDecision = "APPROVE" | "REJECT" | "LATE";

export async function reviewRequest(
  tenantId: string,
  requestId: string,
  decision: ReviewDecision,
  reviewerUserId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const prisma = getPrisma();
  const req = await prisma.attendanceRequest.findFirst({
    where: { id: requestId, tenantId },
    include: { log: true },
  });
  if (!req) return { ok: false, reason: "Request not found" };
  if (req.approvalStatus !== "PENDING") {
    return { ok: false, reason: "Request has already been reviewed" };
  }

  const approvalStatus = decision === "REJECT" ? "REJECTED" : "APPROVED";
  await prisma.attendanceRequest.update({
    where: { id: requestId },
    data: {
      approvalStatus,
      markedLate: decision === "LATE",
      reviewedAt: new Date(),
      reviewedByUserId: reviewerUserId,
    },
  });

  // The final day status is driven by the TIME_IN decision. A rejected TIME_OUT
  // voids the clock-out (so hours aren't counted) but leaves the day status.
  if (req.type === "TIME_IN") {
    const status =
      decision === "REJECT" ? "REJECTED" : decision === "LATE" ? "LATE" : "PRESENT";
    await prisma.attendanceLog.update({
      where: { id: req.logId },
      data: { status },
    });
  } else if (decision === "REJECT") {
    await prisma.attendanceLog.update({
      where: { id: req.logId },
      data: { timeOut: null, workingHours: null },
    });
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Overview (owner dashboard)
// ---------------------------------------------------------------------------

export async function getOverview(tenantId: string): Promise<OverviewDTO> {
  const prisma = getPrisma();
  const slug = await ensureTenantSlug(tenantId);
  const from = startOfDay(new Date());
  const to = endOfDay(new Date());

  const [totalEmployees, todayLogs, pendingRequests, recent] = await Promise.all([
    prisma.employee.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.attendanceLog.findMany({
      where: { tenantId, workDate: { gte: from, lte: to } },
      select: { status: true, employeeId: true },
    }),
    prisma.attendanceRequest.count({
      where: { tenantId, approvalStatus: "PENDING" },
    }),
    prisma.attendanceRequest.findMany({
      where: { tenantId },
      orderBy: { submittedAt: "desc" },
      take: 8,
      include: { employee: { select: { fullName: true } } },
    }),
  ]);

  const presentToday = todayLogs.filter((l) => l.status === "PRESENT").length;
  const lateToday = todayLogs.filter((l) => l.status === "LATE").length;
  const rejectedToday = todayLogs.filter((l) => l.status === "REJECTED").length;
  const approvedToday = presentToday + lateToday;
  const withRecord = new Set(
    todayLogs.filter((l) => l.status !== "REJECTED").map((l) => l.employeeId),
  ).size;
  const absentToday = Math.max(0, totalEmployees - withRecord);

  return {
    totalEmployees,
    presentToday,
    lateToday,
    pendingRequests,
    absentToday,
    approvedToday,
    rejectedToday,
    recentActivity: recent.map((r) => ({
      id: r.id,
      employeeName: r.employee.fullName,
      type: r.type,
      approvalStatus: r.approvalStatus,
      submittedAt: r.submittedAt.toISOString(),
    })),
    portalUrl: `${env.appUrl}/attendance/${slug}`,
    slug,
  };
}

// ---------------------------------------------------------------------------
// Attendance logs (owner) — searchable / filterable / paginated
// ---------------------------------------------------------------------------

export interface LogQuery {
  search?: string;
  status?: string;
  departmentId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function listLogs(
  tenantId: string,
  query: LogQuery,
): Promise<{ rows: AttendanceLogDTO[]; total: number; page: number; pageSize: number }> {
  const prisma = getPrisma();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, query.pageSize ?? 20));

  const where: Prisma.AttendanceLogWhereInput = { tenantId };
  if (query.status && query.status !== "ALL") {
    where.status = query.status as Prisma.AttendanceLogWhereInput["status"];
  }
  if (query.from || query.to) {
    where.workDate = {};
    if (query.from) where.workDate.gte = startOfDay(new Date(query.from));
    if (query.to) where.workDate.lte = endOfDay(new Date(query.to));
  }
  const employeeWhere: Prisma.EmployeeWhereInput = {};
  if (query.departmentId && query.departmentId !== "ALL") {
    employeeWhere.departmentId = query.departmentId;
  }
  if (query.search) {
    employeeWhere.OR = [
      { fullName: { contains: query.search, mode: "insensitive" } },
      { employeeCode: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (Object.keys(employeeWhere).length > 0) where.employee = employeeWhere;

  const [total, rows] = await Promise.all([
    prisma.attendanceLog.count({ where }),
    prisma.attendanceLog.findMany({
      where,
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { employee: { include: { department: true } } },
    }),
  ]);

  return { rows: rows.map(toLogDTO), total, page, pageSize };
}

// ---------------------------------------------------------------------------
// Reports (owner)
// ---------------------------------------------------------------------------

export type ReportPeriod = "daily" | "weekly" | "monthly" | "custom";

function rangeForPeriod(
  period: ReportPeriod,
  fromStr?: string,
  toStr?: string,
): { from: Date; to: Date } {
  const now = new Date();
  if (period === "custom" && fromStr && toStr) {
    return { from: startOfDay(new Date(fromStr)), to: endOfDay(new Date(toStr)) };
  }
  if (period === "daily") {
    return { from: startOfDay(now), to: endOfDay(now) };
  }
  if (period === "weekly") {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return { from, to: endOfDay(now) };
  }
  // monthly
  const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return { from, to: endOfDay(now) };
}

export async function getReport(
  tenantId: string,
  period: ReportPeriod,
  fromStr?: string,
  toStr?: string,
): Promise<ReportSummaryDTO> {
  const prisma = getPrisma();
  const { from, to } = rangeForPeriod(period, fromStr, toStr);
  const [settings, totalEmployees, rows] = await Promise.all([
    getSettings(tenantId),
    prisma.employee.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.attendanceLog.findMany({
      where: { tenantId, workDate: { gte: from, lte: to } },
      orderBy: [{ workDate: "desc" }],
      include: { employee: { include: { department: true } } },
    }),
  ]);

  const cutoff = Date.now() - settings.autoAbsentAfterHours * 3_600_000;
  let present = 0;
  let late = 0;
  let rejected = 0;
  let pending = 0;
  let absent = 0;
  let hoursSum = 0;
  let hoursCount = 0;

  const dto: AttendanceLogDTO[] = rows.map((log) => {
    let status = log.status;
    // Policy: a long-pending request counts as Absent in reports when enabled.
    if (
      settings.autoAbsentPending &&
      status === "PENDING" &&
      log.createdAt.getTime() < cutoff
    ) {
      status = "ABSENT";
    }
    switch (status) {
      case "PRESENT":
        present++;
        break;
      case "LATE":
        late++;
        break;
      case "REJECTED":
        rejected++;
        break;
      case "ABSENT":
        absent++;
        break;
      default:
        pending++;
    }
    if (log.workingHours != null) {
      hoursSum += log.workingHours;
      hoursCount++;
    }
    return { ...toLogDTO(log), status };
  });

  const counted = present + late + absent;
  const attendancePercentage =
    counted > 0 ? Math.round(((present + late) / counted) * 1000) / 10 : 0;
  const averageWorkingHours =
    hoursCount > 0 ? Math.round((hoursSum / hoursCount) * 10) / 10 : 0;

  return {
    period,
    rangeFrom: from.toISOString(),
    rangeTo: to.toISOString(),
    present,
    late,
    absent,
    rejected,
    pending,
    attendancePercentage,
    averageWorkingHours,
    totalEmployees,
    rows: dto,
  };
}

// ---------------------------------------------------------------------------
// Portal (employee)
// ---------------------------------------------------------------------------

export async function getPortalMe(
  tenantId: string,
  employeeId: string,
): Promise<PortalMeDTO | null> {
  const prisma = getPrisma();
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId, status: "ACTIVE" },
    include: { department: true, tenant: { select: { businessName: true, name: true, slug: true } } },
  });
  if (!employee) return null;

  const today = startOfDay(new Date());
  const [todayLog, history, settings] = await Promise.all([
    prisma.attendanceLog.findUnique({
      where: { employeeId_workDate: { employeeId, workDate: today } },
      include: { employee: { include: { department: true } } },
    }),
    prisma.attendanceLog.findMany({
      where: { employeeId },
      orderBy: { workDate: "desc" },
      take: 60,
      include: { employee: { include: { department: true } } },
    }),
    prisma.attendanceSettings.findUnique({
      where: { tenantId },
      select: { portalBusinessName: true, logoUrl: true },
    }),
  ]);

  return {
    employee: {
      id: employee.id,
      fullName: employee.fullName,
      employeeCode: employee.employeeCode,
      position: employee.position,
      departmentName: employee.department?.name ?? null,
    },
    business: {
      name:
        settings?.portalBusinessName?.trim() ||
        employee.tenant.businessName ||
        employee.tenant.name,
      slug: employee.tenant.slug ?? "",
      logoUrl: settings?.logoUrl ?? null,
    },
    today: todayLog ? toLogDTO(todayLog) : null,
    history: history.map(toLogDTO),
  };
}

/**
 * Public branding for a portal login page — the owner-configured business name
 * and logo, falling back to the tenant name when unset.
 */
export async function getPortalBranding(
  tenantId: string,
  fallbackName: string,
): Promise<{ businessName: string; logoUrl: string | null }> {
  const prisma = getPrisma();
  const s = await prisma.attendanceSettings.findUnique({
    where: { tenantId },
    select: { portalBusinessName: true, logoUrl: true },
  });
  return {
    businessName: s?.portalBusinessName?.trim() || fallbackName,
    logoUrl: s?.logoUrl ?? null,
  };
}

// ---------------------------------------------------------------------------
// Portal auth
// ---------------------------------------------------------------------------

export async function getTenantBySlug(slug: string) {
  const prisma = getPrisma();
  return prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, businessName: true, slug: true },
  });
}

export async function authenticateEmployee(
  tenantId: string,
  username: string,
  password: string,
): Promise<{ ok: boolean; employeeId?: string; reason?: string }> {
  const prisma = getPrisma();
  const employee = await prisma.employee.findFirst({
    where: { tenantId, username: username.trim().toLowerCase() },
  });
  // Constant-ish message so we don't leak whether the username exists.
  if (!employee) return { ok: false, reason: "Invalid username or password" };
  if (employee.status === "DISABLED") {
    return { ok: false, reason: "This account has been disabled" };
  }
  if (!verifyPassword(password, employee.passwordHash)) {
    return { ok: false, reason: "Invalid username or password" };
  }
  return { ok: true, employeeId: employee.id };
}
