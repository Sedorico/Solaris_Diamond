"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, Users, LogIn, LogOut, Timer } from "lucide-react";
import { ModuleGate } from "@/components/dashboard/module-gate";
import { ModuleHeader, StatCard } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBusinessStore } from "@/lib/store/business-store";
import { initials, formatDate, cn } from "@/lib/utils";

export default function AttendancePage() {
  return (
    <ModuleGate serviceId="attendance">
      <AttendanceModule />
    </ModuleGate>
  );
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function hoursBetween(inIso: string, outIso: string | null) {
  const end = outIso ? new Date(outIso) : new Date();
  const h = (+end - +new Date(inIso)) / 3600000;
  return Math.max(0, h);
}

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function AttendanceModule() {
  const { attendance, team, clockIn, clockOut } = useBusinessStore();
  const [employee, setEmployee] = useState(team[0]);

  const today = attendance.filter((a) => isToday(a.date));
  const presentNow = today.filter((a) => !a.timeOut);
  const alreadyInToday = today.some((a) => a.employee === employee && !a.timeOut);
  const hoursToday = today.reduce((s, a) => s + hoursBetween(a.timeIn, a.timeOut), 0);

  function handleClockIn() {
    if (alreadyInToday) {
      toast.error(`${employee} is already clocked in`);
      return;
    }
    clockIn(employee);
    toast.success(`${employee} clocked in`);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <ModuleHeader title="Attendance" description="One-tap time in and time out with tamper-proof logs." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Present now" value={String(presentNow.length)} icon={Users} index={0} />
        <StatCard label="Clock-ins today" value={String(today.length)} icon={LogIn} index={1} />
        <StatCard label="Hours logged today" value={`${hoursToday.toFixed(1)}h`} icon={Timer} index={2} />
        <StatCard label="Team size" value={String(team.length)} icon={Clock} index={3} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        {/* Clock panel */}
        <div className="h-fit rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold tracking-tight">Clock in / out</h3>
          <div className="mt-4 flex flex-col gap-3">
            <Select value={employee} onValueChange={setEmployee}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {team.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="accent" size="lg" onClick={handleClockIn} disabled={alreadyInToday}>
              <LogIn className="size-4" /> Clock in
            </Button>
          </div>

          {presentNow.length > 0 && (
            <>
              <div className="my-5 h-px bg-border" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">On the clock</p>
              <div className="mt-3 flex flex-col gap-2">
                {presentNow.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <Avatar className="size-9"><AvatarFallback>{initials(a.employee)}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.employee}</p>
                      <p className="text-xs text-muted-foreground">In since {fmtTime(a.timeIn)} · {hoursBetween(a.timeIn, null).toFixed(1)}h</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { clockOut(a.id); toast.success(`${a.employee} clocked out`); }}>
                      <LogOut className="size-3.5" /> Out
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Logs */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid">
            <span>Employee</span><span>Time in</span><span>Time out</span><span className="text-right">Hours</span>
          </div>
          {attendance.map((a) => (
            <div key={a.id} className="grid grid-cols-2 items-center gap-3 border-b border-border px-5 py-3.5 text-sm last:border-0 sm:grid-cols-[2fr_1fr_1fr_1fr]">
              <div className="flex items-center gap-3">
                <Avatar className="size-8"><AvatarFallback className="text-[11px]">{initials(a.employee)}</AvatarFallback></Avatar>
                <div>
                  <p className="font-medium">{a.employee}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(a.date)}</p>
                </div>
              </div>
              <span className="hidden sm:block">{fmtTime(a.timeIn)}</span>
              <span className="hidden sm:block">
                {a.timeOut ? fmtTime(a.timeOut) : <Badge variant="success" className={cn("animate-pulse")}>Active</Badge>}
              </span>
              <span className="text-right font-medium">{hoursBetween(a.timeIn, a.timeOut).toFixed(1)}h</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
