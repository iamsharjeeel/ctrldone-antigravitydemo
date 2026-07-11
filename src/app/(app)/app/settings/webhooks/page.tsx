"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ErrorBanner from "@/components/app/ErrorBanner";
import SettingsSubnav from "@/components/app/SettingsSubnav";

type Sub = {
  id: string;
  url: string;
  event_types: string[];
  enabled: boolean;
  secret: string;
};

const EVENT_OPTIONS = ["contact.created", "deal.stage_changed", "deal.created"];

export default function WebhooksSettingsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [rows, setRows] = useState<Sub[]>([]);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["contact.created"]);
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
    const { data, error: loadErr } = await supabase
      .from("webhook_subscriptions")
      .select("id, url, event_types, enabled, secret")
      .eq("org_id", mem.org_id)
      .order("created_at", { ascending: false });
    if (loadErr) {
      setError(loadErr.message);
      return;
    }
    setRows(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!orgId || !url.trim()) return;
    setError(null);
    const supabase = createClient();
    const secret = `whsec_${crypto.randomUUID().replace(/-/g, "")}`;
    const { error: insertErr } = await supabase.from("webhook_subscriptions").insert({
      org_id: orgId,
      url: url.trim(),
      event_types: events,
      secret,
      enabled: true,
    });
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setUrl("");
    load();
  };

  const toggle = async (id: string, enabled: boolean) => {
    const supabase = createClient();
    await supabase.from("webhook_subscriptions").update({ enabled }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    const supabase = createClient();
    await supabase.from("webhook_subscriptions").delete().eq("id", id);
    load();
  };

  const toggleEvent = (ev: string) => {
    setEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <SettingsSubnav />
      <div>
        <h1 className="app-page-title">Webhooks</h1>
        <p className="app-page-sub">
          POSTs signed with <span className="font-data">X-CTRLDONE-Signature</span> (HMAC-SHA256).
        </p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="app-card p-5 space-y-3">
        <input
          className="app-input"
          placeholder="https://example.com/hooks/ctrldone"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {EVENT_OPTIONS.map((ev) => (
            <button
              key={ev}
              type="button"
              className={`app-btn ${events.includes(ev) ? "app-btn-primary" : ""}`}
              onClick={() => toggleEvent(ev)}
            >
              {ev}
            </button>
          ))}
        </div>
        <button type="button" className="app-btn app-btn-primary" onClick={add}>
          Add webhook
        </button>
      </div>

      <div className="app-card overflow-hidden">
        <table className="app-table">
          <thead>
            <tr>
              <th>URL</th>
              <th>Events</th>
              <th>Secret</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="text-xs break-all">{r.url}</td>
                <td className="font-data text-xs">{(r.event_types || []).join(", ")}</td>
                <td className="font-data text-xs">{r.secret.slice(0, 10)}…</td>
                <td>
                  <span
                    className={`status-pill ${
                      r.enabled ? "status-pill-lime" : "status-pill-blue"
                    }`}
                  >
                    {r.enabled ? "on" : "off"}
                  </span>
                </td>
                <td className="flex gap-1">
                  <button
                    type="button"
                    className="app-btn"
                    onClick={() => toggle(r.id, !r.enabled)}
                  >
                    {r.enabled ? "Disable" : "Enable"}
                  </button>
                  <button type="button" className="app-btn" onClick={() => remove(r.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-secondary)" }}>
                  No webhooks yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
