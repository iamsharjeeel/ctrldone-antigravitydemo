"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ErrorBanner from "@/components/app/ErrorBanner";
import SettingsSubnav from "@/components/app/SettingsSubnav";

type Rule = {
  id: string;
  event_type: string;
  points: number;
  enabled: boolean;
};

const DEFAULTS: { event_type: string; points: number }[] = [
  { event_type: "form_submit", points: 10 },
  { event_type: "open", points: 1 },
  { event_type: "click", points: 3 },
  { event_type: "reply", points: 5 },
];

export default function ScoringSettingsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: mem } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!mem) {
      setError("No organization found.");
      return;
    }
    setOrgId(mem.org_id);

    let { data, error: loadErr } = await supabase
      .from("scoring_rules")
      .select("id, event_type, points, enabled")
      .eq("org_id", mem.org_id)
      .order("event_type");

    if (loadErr) {
      setError(loadErr.message);
      return;
    }

    if (!data?.length) {
      const rows = DEFAULTS.map((d) => ({
        org_id: mem.org_id,
        event_type: d.event_type,
        points: d.points,
        enabled: true,
      }));
      const { error: seedErr } = await supabase.from("scoring_rules").insert(rows);
      if (seedErr) {
        setError(seedErr.message);
        return;
      }
      const res = await supabase
        .from("scoring_rules")
        .select("id, event_type, points, enabled")
        .eq("org_id", mem.org_id)
        .order("event_type");
      data = res.data;
      if (res.error) {
        setError(res.error.message);
        return;
      }
    }

    setRules(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const updateRule = async (
    id: string,
    patch: Partial<Pick<Rule, "points" | "enabled">>
  ) => {
    setError(null);
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const supabase = createClient();
    const { error: updErr } = await supabase
      .from("scoring_rules")
      .update(patch)
      .eq("id", id);
    if (updErr) setError(updErr.message);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <SettingsSubnav />
      <div>
        <h1 className="app-page-title">Lead scoring</h1>
        <p className="app-page-sub">
          Points added to a contact when each event fires.
        </p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="app-card overflow-hidden">
        <table className="app-table dense">
          <thead>
            <tr>
              <th>Event</th>
              <th>Points</th>
              <th>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600, textTransform: "capitalize" }}>
                  {r.event_type.replace(/_/g, " ")}
                </td>
                <td>
                  <input
                    className="app-input font-data"
                    style={{ maxWidth: 100 }}
                    type="number"
                    value={r.points}
                    onChange={(e) =>
                      updateRule(r.id, { points: Number(e.target.value) || 0 })
                    }
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={(e) =>
                      updateRule(r.id, { enabled: e.target.checked })
                    }
                  />
                </td>
              </tr>
            ))}
            {!rules.length && (
              <tr>
                <td colSpan={3} className="empty-row">
                  {orgId ? "No rules yet." : "Loading…"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
