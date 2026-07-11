"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ErrorBanner from "@/components/app/ErrorBanner";
import SettingsSubnav from "@/components/app/SettingsSubnav";

type PipelineRow = {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
};

const DEFAULT_STAGES = ["New", "Qualified", "Proposal", "Won", "Lost"];

export default function PipelinesSettingsPage() {
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [name, setName] = useState("");
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
    setOrgId(mem.org_id);
    const { data, error: loadErr } = await supabase
      .from("pipelines")
      .select("id, name, is_default, created_at")
      .eq("org_id", mem.org_id)
      .order("is_default", { ascending: false })
      .order("name");
    if (loadErr) {
      setError(loadErr.message);
      return;
    }
    setRows(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!orgId || !name.trim()) return;
    setError(null);
    setMsg("");
    const supabase = createClient();
    const { data: pipe, error: insertErr } = await supabase
      .from("pipelines")
      .insert({
        org_id: orgId,
        name: name.trim(),
        is_default: rows.length === 0,
      })
      .select("id")
      .single();
    if (insertErr || !pipe) {
      setError(insertErr?.message || "Failed to create pipeline");
      return;
    }
    const stageRows = DEFAULT_STAGES.map((stageName, position) => ({
      org_id: orgId,
      pipeline_id: pipe.id,
      name: stageName,
      position,
    }));
    const { error: stageErr } = await supabase.from("pipeline_stages").insert(stageRows);
    if (stageErr) {
      setError(stageErr.message);
      return;
    }
    setName("");
    setMsg(`Created “${name.trim()}” with default stages.`);
    load();
  };

  const setDefault = async (id: string) => {
    if (!orgId) return;
    setError(null);
    const supabase = createClient();
    await supabase.from("pipelines").update({ is_default: false }).eq("org_id", orgId);
    const { error: updateErr } = await supabase
      .from("pipelines")
      .update({ is_default: true })
      .eq("id", id);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    load();
  };

  const remove = async (id: string) => {
    setError(null);
    setMsg("");
    const supabase = createClient();
    const { error: delErr } = await supabase.from("pipelines").delete().eq("id", id);
    if (delErr) {
      const friendly = delErr.message.toLowerCase().includes("restrict")
        || delErr.message.toLowerCase().includes("foreign key")
        || delErr.code === "23503"
        ? "Can't delete this pipeline while deals still reference its stages. Move or delete those deals first."
        : delErr.message;
      setError(friendly);
      return;
    }
    load();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <SettingsSubnav />
      <div>
        <h1 className="app-page-title">Pipelines</h1>
        <p className="app-page-sub">
          Create additional pipelines with the default New → Qualified → Proposal → Won → Lost stages.
        </p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {msg && (
        <p className="text-sm" style={{ color: "var(--forest)", fontWeight: 600 }}>
          {msg}
        </p>
      )}

      <div className="app-card p-5 flex flex-wrap gap-2 items-center">
        <input
          className="app-input"
          style={{ maxWidth: 280 }}
          placeholder="Pipeline name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="button" className="app-btn app-btn-primary" onClick={create}>
          New Pipeline
        </button>
      </div>

      <div className="app-card overflow-hidden">
        <table className="app-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Default</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>
                  <Link
                    href={`/app/pipelines?pipeline=${r.id}`}
                    style={{ color: "var(--forest)" }}
                  >
                    {r.name}
                  </Link>
                </td>
                <td>
                  {r.is_default ? (
                    <span className="status-pill status-pill-lime">default</span>
                  ) : (
                    <button type="button" className="app-btn" onClick={() => setDefault(r.id)}>
                      Make default
                    </button>
                  )}
                </td>
                <td>
                  <button type="button" className="app-btn" onClick={() => remove(r.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={3} className="empty-row">
                  No pipelines yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
