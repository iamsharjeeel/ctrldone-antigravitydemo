"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ErrorBanner from "@/components/app/ErrorBanner";
import SettingsSubnav from "@/components/app/SettingsSubnav";

type Row = {
  id: string;
  email: string;
  reason: string;
  created_at: string;
};

export default function SuppressionPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("manual");
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
      .from("suppression_list")
      .select("id, email, reason, created_at")
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
    if (!orgId || !email.trim()) return;
    setError(null);
    const supabase = createClient();
    const { error: insertErr } = await supabase.from("suppression_list").insert({
      org_id: orgId,
      email: email.trim().toLowerCase(),
      reason,
    });
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setEmail("");
    load();
  };

  const remove = async (id: string) => {
    setError(null);
    const supabase = createClient();
    const { error: delErr } = await supabase.from("suppression_list").delete().eq("id", id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    load();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <SettingsSubnav />
      <div>
        <h1 className="app-page-title">Suppression list</h1>
        <p className="app-page-sub">Emails that will not receive sends.</p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="app-card p-5 flex flex-wrap gap-2 items-center">
        <input
          className="app-input"
          style={{ maxWidth: 260 }}
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select
          className="app-input"
          style={{ maxWidth: 160 }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option value="manual">manual</option>
          <option value="unsubscribe">unsubscribe</option>
          <option value="bounce">bounce</option>
        </select>
        <button type="button" className="app-btn app-btn-primary" onClick={add}>
          Add
        </button>
      </div>

      <div className="app-card overflow-hidden">
        <table className="app-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Reason</th>
              <th>Added</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-data" style={{ fontWeight: 600 }}>
                  {r.email}
                </td>
                <td>{r.reason}</td>
                <td className="font-data">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td>
                  <button type="button" className="app-btn" onClick={() => remove(r.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  No suppressed emails.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
