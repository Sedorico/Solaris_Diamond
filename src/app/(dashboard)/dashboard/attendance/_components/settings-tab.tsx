"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Save, Upload, ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiSend } from "@/lib/attendance/client";
import type { AttendanceSettingsDTO } from "@/lib/attendance/types";

const MAX_LOGO_BYTES = 1_000_000; // ~1MB before base64 overhead

export function SettingsTab() {
  const [settings, setSettings] = useState<AttendanceSettingsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiGet<{ settings: AttendanceSettingsDTO }>("/api/attendance/settings")
      .then((d) => setSettings(d.settings))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  function patch(p: Partial<AttendanceSettingsDTO>) {
    setSettings((s) => (s ? { ...s, ...p } : s));
  }

  function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Image is too large — please use one under 1MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch({ logoUrl: String(reader.result) });
    reader.onerror = () => toast.error("Could not read that image");
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      await apiSend("/api/attendance/settings", "PATCH", settings);
      toast.success("Settings saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return <Skeleton className="h-80 rounded-2xl" />;
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Portal branding — controls the employee login page */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-lg">Portal branding</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          This is what your employees see on their attendance login page.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_auto]">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Business name (shown on the login page)
            </Label>
            <Input
              value={settings.portalBusinessName ?? ""}
              onChange={(e) => patch({ portalBusinessName: e.target.value })}
              placeholder="e.g. ABC Hardware"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Leave blank to use your Solaris Diamond business name.
            </p>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Logo
            </Label>
            <div className="flex items-center gap-3">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background/60">
                {settings.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.logoUrl}
                    alt="Business logo"
                    className="size-full object-contain"
                  />
                ) : (
                  <ImageIcon className="size-6 text-muted-foreground/50" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="size-4" /> Upload
                </Button>
                {settings.logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => patch({ logoUrl: null })}
                  >
                    <Trash2 className="size-4" /> Remove
                  </Button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickLogo}
              />
            </div>
            <p className="mt-2 max-w-[12rem] text-xs text-muted-foreground">
              PNG or SVG, under 1MB. Optional — left blank if not set.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-lg">Attendance policy</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Used to flag late arrivals and to decide how long-pending requests are
          treated in reports.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Workday start (HH:mm)
            </Label>
            <Input
              type="time"
              value={settings.workdayStart}
              onChange={(e) => patch({ workdayStart: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Late threshold (minutes)
            </Label>
            <Input
              type="number"
              min={0}
              value={settings.lateThresholdMinutes}
              onChange={(e) =>
                patch({ lateThresholdMinutes: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Timezone
            </Label>
            <Input
              value={settings.timezone}
              onChange={(e) => patch({ timezone: e.target.value })}
              placeholder="Asia/Manila"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg">Auto-absent policy</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              When enabled, requests left pending beyond the window below are
              counted as Absent in reports. The original submission time is always
              preserved.
            </p>
          </div>
          <Switch
            checked={settings.autoAbsentPending}
            onCheckedChange={(v) => patch({ autoAbsentPending: v })}
          />
        </div>
        {settings.autoAbsentPending && (
          <div className="mt-4 max-w-xs">
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Treat as absent after (hours)
            </Label>
            <Input
              type="number"
              min={1}
              value={settings.autoAbsentAfterHours}
              onChange={(e) =>
                patch({ autoAbsentAfterHours: Number(e.target.value) || 24 })
              }
            />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button variant="accent" onClick={save} disabled={saving}>
          <Save className="size-4" /> Save settings
        </Button>
      </div>
    </div>
  );
}
