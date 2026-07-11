"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ErrorBanner from "@/components/app/ErrorBanner";
import SettingsSubnav from "@/components/app/SettingsSubnav";

type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export default function ApiSettingsPage() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState("Default");
  const [onceKey, setOnceKey] = useState<string | null>(null);
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
    const { data, error: loadErr } = await supabase
      .from("api_keys")
      .select("id, name, prefix, created_at, last_used_at, revoked_at")
      .eq("org_id", mem.org_id)
      .order("created_at", { ascending: false });
    if (loadErr) {
      setError(loadErr.message);
      return;
    }
    setKeys(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const createKey = async () => {
    setError(null);
    setOnceKey(null);
    const res = await fetch("/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed");
      return;
    }
    setOnceKey(json.key);
    load();
  };

  const revoke = async (id: string) => {
    setError(null);
    const supabase = createClient();
    const { error: updErr } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    load();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <SettingsSubnav />
      <div>
        <h1 className="app-page-title">API keys</h1>
        <p className="app-page-sub">
          Bearer keys for <span className="font-data">/api/v1/*</span>. Raw key shown once.
        </p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {onceKey && (
        <div className="app-card p-4 space-y-2" style={{ borderColor: "var(--forest)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--forest)" }}>
            Copy now — this key will not be shown again
          </p>
          <code className="font-data text-xs break-all block">{onceKey}</code>
          <button type="button" className="app-btn" onClick={() => setOnceKey(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="app-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name"
        />
        <button type="button" className="app-btn app-btn-primary" onClick={createKey}>
          Create key
        </button>
      </div>

      <div className="app-card overflow-hidden">
        <table className="app-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Prefix</th>
              <th>Last used</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td>{k.name}</td>
                <td className="font-data text-xs">{k.prefix}…</td>
                <td className="font-data text-xs">
                  {k.last_used_at
                    ? new Date(k.last_used_at).toLocaleString()
                    : "—"}
                </td>
                <td>
                  <span
                    className={`status-pill ${
                      k.revoked_at ? "status-pill-red" : "status-pill-lime"
                    }`}
                  >
                    {k.revoked_at ? "revoked" : "active"}
                  </span>
                </td>
                <td>
                  {!k.revoked_at && (
                    <button type="button" className="app-btn" onClick={() => revoke(k.id)}>
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!keys.length && (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-secondary)" }}>
                  No API keys yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
