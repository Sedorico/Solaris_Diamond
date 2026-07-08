"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  KeyRound,
  Ban,
  CheckCircle2,
  Trash2,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import { apiGet, apiSend, fmtDate } from "@/lib/attendance/client";
import {
  EMPLOYMENT_STATUS_LABELS,
  type DepartmentDTO,
  type EmployeeDTO,
  type EmploymentStatus,
} from "@/lib/attendance/types";

const NONE = "NONE";
const EMPLOYMENT_OPTIONS = Object.keys(
  EMPLOYMENT_STATUS_LABELS,
) as EmploymentStatus[];

export function EmployeesTab({
  refreshKey,
  onChanged,
}: {
  refreshKey: number;
  onChanged: () => void;
}) {
  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [departments, setDepartments] = useState<DepartmentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [editing, setEditing] = useState<EmployeeDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<EmployeeDTO | null>(null);
  const [deleting, setDeleting] = useState<EmployeeDTO | null>(null);
  const [managingDepts, setManagingDepts] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiGet<{ employees: EmployeeDTO[] }>("/api/attendance/employees"),
      apiGet<{ departments: DepartmentDTO[] }>("/api/attendance/departments"),
    ])
      .then(([e, d]) => {
        setEmployees(e.employees);
        setDepartments(d.departments);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (deptFilter !== "ALL" && e.departmentId !== deptFilter) return false;
      if (statusFilter !== "ALL" && e.status !== statusFilter) return false;
      if (!q) return true;
      return (
        e.fullName.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q)
      );
    });
  }, [employees, search, deptFilter, statusFilter]);

  async function toggleStatus(e: EmployeeDTO) {
    const next = e.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      await apiSend(`/api/attendance/employees/${e.id}`, "PATCH", {
        action: "set-status",
        status: next,
      });
      toast.success(next === "ACTIVE" ? "Employee enabled" : "Employee disabled");
      load();
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiSend(`/api/attendance/employees/${deleting.id}`, "DELETE");
      toast.success("Employee deleted");
      setDeleting(null);
      load();
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, username or ID"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DISABLED">Disabled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setManagingDepts(true)}>
            <Building2 className="size-4" /> Departments
          </Button>
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Add employee
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No employees yet"
          description="Create employee accounts so your team can time in and out from the portal."
        >
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Add employee
          </Button>
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_0.8fr_auto] gap-4 border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground lg:grid">
            <span>Employee</span>
            <span>Employee ID</span>
            <span>Department</span>
            <span>Position</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          {filtered.map((e) => (
            <div
              key={e.id}
              className="grid grid-cols-2 items-center gap-3 border-b border-border px-5 py-3.5 text-sm last:border-0 lg:grid-cols-[2fr_1fr_1fr_1fr_0.8fr_auto]"
            >
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback className="text-[11px]">
                    {initials(e.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{e.fullName}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    @{e.username}
                  </p>
                </div>
              </div>
              <span className="hidden font-mono text-xs lg:block">{e.employeeCode}</span>
              <span className="hidden lg:block">{e.departmentName ?? "—"}</span>
              <span className="hidden lg:block">{e.position ?? "—"}</span>
              <span className="hidden lg:block">
                {e.status === "ACTIVE" ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="muted">Disabled</Badge>
                )}
              </span>
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(e)}>
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setResetting(e)}>
                      <KeyRound className="size-4" /> Reset password
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleStatus(e)}>
                      {e.status === "ACTIVE" ? (
                        <>
                          <Ban className="size-4" /> Disable
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-4" /> Enable
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleting(e)}
                    >
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <EmployeeDialog
          employee={editing}
          departments={departments}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            load();
            onChanged();
          }}
        />
      )}

      {resetting && (
        <ResetPasswordDialog
          employee={resetting}
          onClose={() => setResetting(null)}
        />
      )}

      {managingDepts && (
        <DepartmentsDialog
          departments={departments}
          onClose={() => setManagingDepts(false)}
          onChanged={() => {
            load();
            onChanged();
          }}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete employee</DialogTitle>
            <DialogDescription>
              This permanently removes {deleting?.fullName} and all of their
              attendance records. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create / edit dialog
// ---------------------------------------------------------------------------

function EmployeeDialog({
  employee,
  departments,
  onClose,
  onSaved,
}: {
  employee: EmployeeDTO | null;
  departments: DepartmentDTO[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!employee;
  const [fullName, setFullName] = useState(employee?.fullName ?? "");
  const [username, setUsername] = useState(employee?.username ?? "");
  const [employeeCode, setEmployeeCode] = useState(employee?.employeeCode ?? "");
  const [password, setPassword] = useState("");
  const [departmentId, setDepartmentId] = useState(employee?.departmentId ?? NONE);
  const [position, setPosition] = useState(employee?.position ?? "");
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>(
    employee?.employmentStatus ?? "FULL_TIME",
  );
  const [dateHired, setDateHired] = useState(
    employee?.dateHired ? employee.dateHired.slice(0, 10) : "",
  );
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!fullName.trim() || !username.trim()) {
      toast.error("Name and username are required");
      return;
    }
    if (!isEdit && password.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      fullName,
      username,
      employeeCode: employeeCode.trim() || undefined,
      departmentId: departmentId === NONE ? null : departmentId,
      position,
      employmentStatus,
      dateHired: dateHired || null,
    };
    if (password) payload.password = password;
    try {
      if (isEdit) {
        await apiSend(`/api/attendance/employees/${employee!.id}`, "PATCH", payload);
        toast.success("Employee updated");
      } else {
        await apiSend("/api/attendance/employees", "POST", payload);
        toast.success("Employee created");
      }
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit employee" : "Add employee"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this employee's details or credentials."
              : "Create login credentials for a new team member."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" className="sm:col-span-2">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan dela Cruz" />
          </Field>
          <Field label="Username">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="juan" autoCapitalize="none" />
          </Field>
          <Field label="Employee ID">
            <Input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} placeholder="Auto (EMP-001)" />
          </Field>
          <Field label={isEdit ? "New password (optional)" : "Password"} className="sm:col-span-2">
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? "Leave blank to keep current" : "Min. 4 characters"}
            />
          </Field>
          <Field label="Department">
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No department</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Position">
            <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Cashier" />
          </Field>
          <Field label="Employment status">
            <Select
              value={employmentStatus}
              onValueChange={(v) => setEmploymentStatus(v as EmploymentStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {EMPLOYMENT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date hired">
            <Input type="date" value={dateHired} onChange={(e) => setDateHired(e.target.value)} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" onClick={submit} disabled={saving}>
            {isEdit ? "Save changes" : "Create employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  employee,
  onClose,
}: {
  employee: EmployeeDTO;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (password.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    setSaving(true);
    try {
      await apiSend(`/api/attendance/employees/${employee.id}`, "PATCH", {
        action: "reset-password",
        password,
      });
      toast.success("Password reset");
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for {employee.fullName} (@{employee.username}).
          </DialogDescription>
        </DialogHeader>
        <Field label="New password">
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 4 characters"
          />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" onClick={submit} disabled={saving}>
            Reset password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentsDialog({
  departments,
  onClose,
  onChanged,
}: {
  departments: DepartmentDTO[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await apiSend("/api/attendance/departments", "POST", { name });
      toast.success("Department added");
      setName("");
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await apiSend(`/api/attendance/departments/${id}`, "DELETE");
      toast.success("Department deleted");
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Departments</DialogTitle>
          <DialogDescription>
            Organise employees into departments for filtering and reports.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Front Desk"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button variant="accent" onClick={add} disabled={busy}>
            <Plus className="size-4" /> Add
          </Button>
        </div>

        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {departments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No departments yet.
            </p>
          ) : (
            departments.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.employeeCount} employee{d.employeeCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => remove(d.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
