// apps/client/src/app/(client)/settings/activity/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/client";
import { Button, Select } from "@/components/shared";
import { Loader2, Eye, Heart, Trash2, Share2, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ACTION_ICONS = {
  view: Eye,
  favorite: Heart,
  discard: Trash2,
  share: Share2,
  export: Download,
};

const ACTION_LABELS = {
  view: "Viewed",
  favorite: "Favorited",
  discard: "Discarded",
  share: "Shared",
  export: "Exported",
};

export default function ActivitySettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const limit = 20;

  useEffect(() => {
    fetchActivity();
  }, [page, actionFilter]);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (actionFilter) params.set("action", actionFilter);

      const res = await fetch(`/api/user/activity?${params}`);
      const data = await res.json();

      if (res.ok) {
        setActivity(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Failed to load activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    // Could implement clear history functionality
    alert("Clear history would be implemented here");
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Activity History</h2>
          <p className="text-sm text-muted-foreground">
            Track your recent actions
          </p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border rounded-md bg-background text-sm"
          >
            <option value="">All actions</option>
            <option value="view">Views</option>
            <option value="favorite">Favorites</option>
            <option value="discard">Discards</option>
            <option value="export">Exports</option>
          </select>
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-card border rounded-lg divide-y">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activity.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No activity recorded yet</p>
          </div>
        ) : (
          activity.map((entry, index) => {
            const Icon = ACTION_ICONS[entry.action] || Eye;
            return (
              <div key={index} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {ACTION_LABELS[entry.action] || entry.action}{" "}
                    {entry.itemType}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {entry.timestamp
                      ? formatDistanceToNow(new Date(entry.timestamp), {
                          addSuffix: true,
                        })
                      : "Unknown time"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {activity.length} of {total} activities
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
