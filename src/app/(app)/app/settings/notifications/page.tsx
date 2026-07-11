"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ErrorBanner from "@/components/app/ErrorBanner";
import SettingsSubnav from "@/components/app/SettingsSubnav";

type Pref = { channel: string; enabled: boolean };

const CHANNELS = [
  { channel: "inapp", label: "In-app notifications" },
  { channel: "email_digest", label: "Daily email digest" },
] as const;

export default function NotificationsSettingsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    inapp: true,
    email_digest: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
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
    const { data, error: loadErr } = await supabase
      .from("notification_preferences")
      .select("channel, enabled")
      .eq("org_id", mem.org_id)
      .eq("user_id", user.id);
    if (loadErr) {
      setError(loadErr.message);
      return;
    }
    const next = { inapp: true, email_digest: false };
    (data as Pref[] | null)?.forEach((p) => {
      next[p.channel as keyof typeof next] = p.enabled;
    });
    setPrefs(next);
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (channel: string, enabled: boolean) => {
    if (!orgId || !userId) return;
    setSaving(true);
    setError(null);
    setPrefs((p) => ({ ...p, [channel]: enabled }));
    const supabase = createClient();
    const { error: upsertErr } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          org_id: orgId,
          user_id: userId,
          channel,
          enabled,
        },
        { onConflict: "org_id,user_id,channel" }
      );
    if (upsertErr) setError(upsertErr.message);
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <SettingsSubnav />
      <div>
        <h1 className="app-page-title">Notifications</h1>
        <p className="app-page-sub">Choose how you want to be notified.</p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="app-card" style={{ padding: 20 }}>
        <div className="space-y-4">
          {CHANNELS.map((c) => (
            <label
              key={c.channel}
              className="flex items-center justify-between gap-3"
              style={{ cursor: "pointer" }}
            >
              <span style={{ fontWeight: 600 }}>{c.label}</span>
              <input
                type="checkbox"
                checked={!!prefs[c.channel]}
                disabled={saving}
                onChange={(e) => toggle(c.channel, e.target.checked)}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
