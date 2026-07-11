"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Campaign } from "@/lib/types";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [alerts, setAlerts] = useState<string[]>([]);

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
    if (!mem) return;
    setOrgId(mem.org_id);
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("org_id", mem.org_id)
      .order("updated_at", { ascending: false });
    setCampaigns((data as Campaign[]) || []);

    const { data: accounts } = await supabase
      .from("email_accounts")
      .select("from_email, status")
      .eq("org_id", mem.org_id)
      .eq("status", "needs_reauth");
    const msgs: string[] = [];
    (accounts || []).forEach((a) =>
      msgs.push(`Email ${a.from_email} needs reauth — campaigns using it are paused.`)
    );
    (data || [])
      .filter((c) => c.status === "paused")
      .forEach((c) => msgs.push(`Campaign “${c.name}” is paused.`));
    setAlerts(msgs);
  };

  useEffect(() => {
    load();
  }, []);

  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!orgId || !name.trim()) return;
    setError(null);
    const supabase = createClient();
    const { data, error: insertErr } = await supabase
      .from("campaigns")
      .insert({ org_id: orgId, name: name.trim(), status: "draft" })
      .select("id")
      .single();
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setName("");
    if (data) window.location.href = `/app/campaigns/${data.id}/builder`;
    else load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="app-page-title">Campaigns</h1>
          <p className="app-page-sub">Email / wait / SMS sequences</p>
        </div>
        <div className="flex gap-2">
          <input
            className="app-input"
            style={{ width: 220 }}
            placeholder="Campaign name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="button" className="app-btn app-btn-primary" onClick={create}>
            New campaign
          </button>
        </div>
      </div>

      {error && (
        <div className="app-error-banner" role="alert">
          <span>{error}</span>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="app-card p-4 space-y-1" style={{ borderColor: "var(--signal-red)" }}>
          {alerts.map((a, i) => (
            <p key={i} className="text-sm" style={{ color: "var(--signal-red)" }}>
              {a}
            </p>
          ))}
        </div>
      )}

      <div className="app-card overflow-hidden">
        <table className="app-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/app/campaigns/${c.id}/builder`}>{c.name}</Link>
                </td>
                <td>
                  <span
                    className={`status-pill ${
                      c.status === "active"
                        ? "status-pill-lime"
                        : c.status === "paused"
                          ? "status-pill-red"
                          : "status-pill-blue"
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="font-data">
                  {new Date(c.updated_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {!campaigns.length && (
              <tr>
                <td colSpan={3} style={{ color: "var(--text-muted)" }}>
                  No campaigns
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
