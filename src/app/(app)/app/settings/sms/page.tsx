"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ErrorBanner from "@/components/app/ErrorBanner";
import SettingsSubnav from "@/components/app/SettingsSubnav";

export default function SmsSettingsPage() {
  const [account, setAccount] = useState<{
    id: string;
    account_sid: string;
    from_number: string;
  } | null>(null);
  const [form, setForm] = useState({
    account_sid: "",
    auth_token: "",
    from_number: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

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
      .from("sms_accounts")
      .select("id, account_sid, from_number")
      .eq("org_id", mem.org_id)
      .maybeSingle();
    if (loadErr) {
      setError(loadErr.message);
      return;
    }
    setAccount(data);
    if (data) {
      setForm({
        account_sid: data.account_sid,
        auth_token: "",
        from_number: data.from_number,
      });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setError(null);
    setMsg("");
    const res = await fetch("/api/settings/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to save");
      return;
    }
    setMsg("Twilio credentials saved.");
    setForm((f) => ({ ...f, auth_token: "" }));
    load();
  };

  const disconnect = async () => {
    setError(null);
    const res = await fetch("/api/settings/sms", { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed");
      return;
    }
    setAccount(null);
    setForm({ account_sid: "", auth_token: "", from_number: "" });
    setMsg("Disconnected.");
  };

  return (
    <div className="space-y-6 max-w-xl">
      <SettingsSubnav />
      <div>
        <h1 className="app-page-title">SMS</h1>
        <p className="app-page-sub">
          Connect Twilio for campaign SMS steps. Auth token is encrypted at rest.
        </p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="app-card p-5 space-y-3">
        <label className="text-xs block" style={{ color: "var(--text-muted)" }}>
          Account SID
          <input
            className="app-input mt-1 font-data"
            value={form.account_sid}
            onChange={(e) => setForm({ ...form, account_sid: e.target.value })}
            placeholder="ACxxxxxxxx"
          />
        </label>
        <label className="text-xs block" style={{ color: "var(--text-muted)" }}>
          Auth token{account ? " (leave blank to keep current)" : ""}
          <input
            className="app-input mt-1 font-data"
            type="password"
            value={form.auth_token}
            onChange={(e) => setForm({ ...form, auth_token: e.target.value })}
            placeholder="••••••••"
          />
        </label>
        <label className="text-xs block" style={{ color: "var(--text-muted)" }}>
          From number
          <input
            className="app-input mt-1 font-data"
            value={form.from_number}
            onChange={(e) => setForm({ ...form, from_number: e.target.value })}
            placeholder="+15551234567"
          />
        </label>
        <div className="flex gap-2">
          <button type="button" className="app-btn app-btn-primary" onClick={save}>
            Save
          </button>
          {account && (
            <button type="button" className="app-btn" onClick={disconnect}>
              Disconnect
            </button>
          )}
        </div>
        {msg && (
          <p className="text-xs" style={{ color: "var(--forest)", fontWeight: 600 }}>
            {msg}
          </p>
        )}
        {account && (
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Connected · SID {account.account_sid.slice(0, 8)}… · {account.from_number}
          </p>
        )}
      </div>
    </div>
  );
}
