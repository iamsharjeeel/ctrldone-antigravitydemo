"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SettingsSubnav from "@/components/app/SettingsSubnav";

export default function OrgSettingsPage() {
  const [org, setOrg] = useState({
    id: "",
    name: "",
    default_timezone: "UTC",
    business_hours_start: "09:00",
    business_hours_end: "18:00",
    stale_deal_days: 14,
    visibility_mode: "open" as "open" | "owner_scoped",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: mem } = await supabase
        .from("org_members")
        .select("org_id, orgs(*)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (!mem?.orgs) return;
      const o = mem.orgs as unknown as typeof org & { visibility_mode?: string };
      setOrg({
        id: o.id,
        name: o.name,
        default_timezone: o.default_timezone,
        business_hours_start: String(o.business_hours_start).slice(0, 5),
        business_hours_end: String(o.business_hours_end).slice(0, 5),
        stale_deal_days: o.stale_deal_days,
        visibility_mode:
          o.visibility_mode === "owner_scoped" ? "owner_scoped" : "open",
      });
    };
    load();
  }, []);

  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    setSaved(false);
    const supabase = createClient();
    const { error: updateErr } = await supabase
      .from("orgs")
      .update({
        default_timezone: org.default_timezone,
        business_hours_start: org.business_hours_start,
        business_hours_end: org.business_hours_end,
        stale_deal_days: org.stale_deal_days,
        visibility_mode: org.visibility_mode,
      })
      .eq("id", org.id);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setSaved(true);
  };

  return (
    <div className="space-y-4 max-w-lg">
      <SettingsSubnav />
      <div>
        <h1 className="app-page-title">Organization</h1>
        <p className="app-page-sub">
          Default timezone + business hours (Mon–Fri) used for waits, send suggestions, digests
        </p>
      </div>
      {error && (
        <div className="app-error-banner" role="alert">
          <span>{error}</span>
        </div>
      )}
      <div className="app-card p-4 space-y-3">
        <label className="text-xs block" style={{ color: "var(--text-muted)" }}>
          Default timezone
          <input
            className="app-input mt-1 font-data"
            value={org.default_timezone}
            onChange={(e) => setOrg({ ...org, default_timezone: e.target.value })}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs block" style={{ color: "var(--text-muted)" }}>
            Hours start
            <input
              className="app-input mt-1 font-data"
              type="time"
              value={org.business_hours_start}
              onChange={(e) => setOrg({ ...org, business_hours_start: e.target.value })}
            />
          </label>
          <label className="text-xs block" style={{ color: "var(--text-muted)" }}>
            Hours end
            <input
              className="app-input mt-1 font-data"
              type="time"
              value={org.business_hours_end}
              onChange={(e) => setOrg({ ...org, business_hours_end: e.target.value })}
            />
          </label>
        </div>
        <label className="text-xs block" style={{ color: "var(--text-muted)" }}>
          Stale deal days
          <input
            className="app-input mt-1 font-data"
            type="number"
            value={org.stale_deal_days}
            onChange={(e) =>
              setOrg({ ...org, stale_deal_days: Number(e.target.value) })
            }
          />
        </label>
        <label className="text-xs block" style={{ color: "var(--text-muted)" }}>
          Record visibility
          <select
            className="app-input mt-1"
            value={org.visibility_mode}
            onChange={(e) =>
              setOrg({
                ...org,
                visibility_mode: e.target.value as "open" | "owner_scoped",
              })
            }
          >
            <option value="open">Open — all members see all records</option>
            <option value="owner_scoped">
              Owner-scoped — members only see owned/assigned records
            </option>
          </select>
        </label>
        <button type="button" className="app-btn app-btn-primary" onClick={save}>
          Save
        </button>
        {saved && (
          <p className="text-xs" style={{ color: "var(--signal-lime)" }}>
            Saved
          </p>
        )}
      </div>
    </div>
  );
}
