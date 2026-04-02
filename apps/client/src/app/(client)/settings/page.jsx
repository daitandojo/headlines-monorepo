// apps/client/src/app/(client)/settings/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/client";
import { Button, Input, Label, Select } from "@/components/shared";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

const LANGUAGES = [
  { value: "English", label: "English" },
  { value: "Danish", label: "Danish" },
  { value: "Norwegian", label: "Norwegian" },
  { value: "Swedish", label: "Swedish" },
  { value: "German", label: "German" },
  { value: "French", label: "French" },
];

const TIMEZONES = [
  { value: "Europe/Copenhagen", label: "Copenhagen (CET)" },
  { value: "Europe/Oslo", label: "Oslo (CET)" },
  { value: "Europe/Stockholm", label: "Stockholm (CET)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "America/New_York", label: "New York (EST)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST)" },
];

export default function ProfileSettingsPage() {
  const { user, updateUserPreferences } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    language: "English",
    timezone: "Europe/Copenhagen",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        language: user.language || "English",
        timezone: user.profile?.timezone || "Europe/Copenhagen",
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateUserPreferences(formData);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Profile Settings</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              placeholder="Enter your first name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              placeholder="Enter your last name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={user?.email || ""}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Contact support to change your email
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <select
              id="language"
              value={formData.language}
              onChange={(e) =>
                setFormData({ ...formData, language: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              value={formData.timezone}
              onChange={(e) =>
                setFormData({ ...formData, timezone: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
