"use client";

import { useState } from "react";
import { ModuleGate } from "@/components/dashboard/module-gate";
import { ModuleHeader } from "@/components/dashboard/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OverviewTab } from "./_components/overview-tab";
import { ApprovalsTab } from "./_components/approvals-tab";
import { EmployeesTab } from "./_components/employees-tab";
import { LogsTab } from "./_components/logs-tab";
import { ReportsTab } from "./_components/reports-tab";
import { SettingsTab } from "./_components/settings-tab";

export default function AttendancePage() {
  return (
    <ModuleGate serviceId="attendance">
      <AttendanceModule />
    </ModuleGate>
  );
}

function AttendanceModule() {
  // Bumped after any mutation so sibling tabs refetch when revisited.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="mx-auto max-w-6xl">
      <ModuleHeader
        title="Attendance"
        description="Manage employees, review time-in and time-out requests, and export attendance reports."
      />

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto pb-1">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <OverviewTab refreshKey={refreshKey} />
        </TabsContent>
        <TabsContent value="approvals">
          <ApprovalsTab refreshKey={refreshKey} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="employees">
          <EmployeesTab refreshKey={refreshKey} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="logs">
          <LogsTab refreshKey={refreshKey} />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab refreshKey={refreshKey} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
