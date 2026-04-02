// apps/client/src/app/(client)/settings/notifications/page.jsx
"use client";

import { useState, useEffect } from "react";
import { Button, Switch, Select } from "@/components/shared";
import { toast } from "sonner";
import { Loader2, Save, Bell, Mail, Smartphone } from "lucide-react";

const FREQUENCY_OPTIONS = [
  { value: "realtime", label: "Real-time" },
  { value: "daily", label: "Daily digest" },
  { value: "weekly", label: "Weekly summary" },
];

export default function NotificationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    emailEnabled: true,
    pushEnabled: true,
    frequency: "daily",
    countries: [],
    sectors: [],
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/user/notifications");
      const data = await res.json();
      if (res.ok) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success("Notification preferences saved");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      }
    } catch (error) {
      toast.error("Failed to save notification settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Channels
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive events via email
                </p>
              </div>
            </div>
            <Switch
              checked={settings.emailEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, emailEnabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Browser push notifications
                </p>
              </div>
            </div>
            <Switch
              checked={settings.pushEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, pushEnabled: checked })
              }
            />
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Email Frequency</h2>

        <div className="space-y-2">
          <label className="text-sm font-medium">When to send emails</label>
          <select
            value={settings.frequency}
            onChange={(e) =>
              setSettings({ ...settings, frequency: e.target.value })
            }
            className="w-full max-w-xs px-3 py-2 border rounded-md bg-background"
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
