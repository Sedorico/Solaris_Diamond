"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Monitor, ShieldCheck } from "lucide-react";
import { ModuleHeader } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/lib/auth/hooks";

export default function SettingsPage() {
  const { user } = useSession();

  const [profile, setProfile] = useState({
    fullName: user?.fullName ?? "",
    businessName: user?.businessName ?? "",
    email: user?.email ?? "",
  });

  return (
    <div className="mx-auto max-w-3xl">
      <ModuleHeader
        title="Settings"
        description="Manage your profile, security and devices."
      />

      {/* Profile */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-semibold tracking-tight">Profile</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Full name</Label>
            <Input
              value={profile.fullName}
              onChange={(e) =>
                setProfile({ ...profile, fullName: e.target.value })
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Business name</Label>
            <Input
              value={profile.businessName}
              onChange={(e) =>
                setProfile({ ...profile, businessName: e.target.value })
              }
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Email</Label>
            <Input
              value={profile.email}
              onChange={(e) =>
                setProfile({ ...profile, email: e.target.value })
              }
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            variant="accent"
            onClick={() => toast.success("Profile saved")}
          >
            Save changes
          </Button>
        </div>
      </section>

      {/* Security */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-accent" />
          <h3 className="font-semibold tracking-tight">Security</h3>
        </div>
        <div className="mt-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-medium">Two-factor authentication</p>
              <p className="text-xs text-muted-foreground">
                Add an extra layer of security to your account.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-medium">Login activity alerts</p>
              <p className="text-xs text-muted-foreground">
                Email me whenever a new sign-in is detected.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </section>

      {/* Sessions */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Monitor className="size-5 text-accent" />
          <h3 className="font-semibold tracking-tight">Active sessions</h3>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Session management will be available here. Your sessions are managed
          by Supabase Auth.
        </p>
      </section>
    </div>
  );
}
