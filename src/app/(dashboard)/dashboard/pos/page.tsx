"use client";

import { useState } from "react";
import { History, LineChart, Settings, Store } from "lucide-react";
import { ModuleGate } from "@/components/dashboard/module-gate";
import { ModuleHeader } from "@/components/dashboard/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PinProvider } from "./_components/pin-gate";
import { RegisterTab } from "./_components/register-tab";
import { HistoryTab } from "./_components/history-tab";
import { ReportsTab } from "./_components/reports-tab";
import { SettingsTab } from "./_components/settings-tab";

export default function PosPage() {
  return (
    <ModuleGate serviceId="pos">
      <PinProvider>
        <PosModule />
      </PinProvider>
    </ModuleGate>
  );
}

function PosModule() {
  const [tab, setTab] = useState("register");
  // Bumped after any mutation so sibling tabs refetch when revisited.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="mx-auto max-w-7xl">
      <ModuleHeader
        title="Point of Sale"
        description="Sell, take payments and print receipts — transactions, reports and branding in one register."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto pb-1">
          <TabsList>
            <TabsTrigger value="register">
              <Store className="size-4" /> Register
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="size-4" /> History
            </TabsTrigger>
            <TabsTrigger value="reports">
              <LineChart className="size-4" /> Reports
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="size-4" /> Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="register">
          <RegisterTab
            refreshKey={refreshKey}
            onGoToSettings={() => setTab("settings")}
          />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab refreshKey={refreshKey} />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab refreshKey={refreshKey} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab refreshKey={refreshKey} onChanged={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
