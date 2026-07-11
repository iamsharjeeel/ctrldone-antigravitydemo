"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ErrorBanner from "@/components/app/ErrorBanner";
import SettingsSubnav from "@/components/app/SettingsSubnav";

type LogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

export default function AuditPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        .from("audit_log")
        .select("id, action, entity_type, entity_id, created_at")
        .eq("org_id", mem.org_id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (loadErr) {
        setError(loadErr.message);
        return;
      }
      setRows(data || []);
    };
    load();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <SettingsSubnav />
      <div>
        <h1 className="app-page-title">Audit log</h1>
        <p className="app-page-sub">Recent changes across deals and campaigns.</p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="app-card overflow-hidden">
        <table className="app-table dense">
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Entity</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-data">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td style={{ fontWeight: 600, textTransform: "capitalize" }}>
                  {r.action.replace(/_/g, " ")}
                </td>
                <td>{r.entity_type}</td>
                <td className="font-data" style={{ fontSize: 12 }}>
                  {r.entity_id ? r.entity_id.slice(0, 8) : "—"}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
