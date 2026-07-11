"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ErrorBanner from "@/components/app/ErrorBanner";
import SettingsSubnav from "@/components/app/SettingsSubnav";

type Rule = {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: { stage_name?: string; stage_id?: string };
  action_type: string;
  action_config: { title?: string; body?: string; tag?: string };
  enabled: boolean;
};

type StageOpt = { id: string; name: string; pipeline_name: string };

export default function AutomationsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [stages, setStages] = useState<StageOpt[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    stage_name: "",
    task_title: "",
  });

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
      .from("automation_rules")
      .select("id, name, trigger_type, trigger_config, action_type, action_config, enabled")
      .eq("org_id", mem.org_id)
      .order("created_at", { ascending: false });
    if (loadErr) {
      setError(loadErr.message);
      return;
    }
    setRules((data as Rule[]) || []);

    const { data: stageRows } = await supabase
      .from("pipeline_stages")
      .select("id, name, pipelines(name)")
      .eq("org_id", mem.org_id)
      .order("position");
    setStages(
      ((stageRows as { id: string; name: string; pipelines?: { name?: string } | null }[]) || []).map(
        (s) => ({
          id: s.id,
          name: s.name,
          pipeline_name: s.pipelines?.name || "Pipeline",
        })
      )
    );
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!orgId || !form.name.trim() || !form.stage_name || !form.task_title.trim()) return;
    setError(null);
    const supabase = createClient();
    const { error: insertErr } = await supabase.from("automation_rules").insert({
      org_id: orgId,
      name: form.name.trim(),
      trigger_type: "deal_stage_changed",
      trigger_config: { stage_name: form.stage_name },
      action_type: "create_task",
      action_config: { title: form.task_title.trim() },
      enabled: true,
    });
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setForm({ name: "", stage_name: "", task_title: "" });
    load();
  };

  const toggle = async (rule: Rule) => {
    setError(null);
    const supabase = createClient();
    const { error: updErr } = await supabase
      .from("automation_rules")
      .update({ enabled: !rule.enabled })
      .eq("id", rule.id);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    load();
  };

  const remove = async (id: string) => {
    setError(null);
    const supabase = createClient();
    const { error: delErr } = await supabase.from("automation_rules").delete().eq("id", id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    load();
  };

  const stageNames = Array.from(new Set(stages.map((s) => s.name)));

  return (
    <div className="space-y-6 max-w-3xl">
      <SettingsSubnav />
      <div>
        <h1 className="app-page-title">Automations</h1>
        <p className="app-page-sub">
          When a deal enters a stage, automatically create a follow-up task.
        </p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="app-card p-5 space-y-3">
        <h2 className="app-section-title">New rule</h2>
        <input
          className="app-input"
          placeholder="Rule name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <label className="field-label">
          When deal enters stage
          <select
            className="app-input mt-1"
            value={form.stage_name}
            onChange={(e) => setForm({ ...form, stage_name: e.target.value })}
          >
            <option value="">Select stage…</option>
            {stageNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Create task titled
          <input
            className="app-input mt-1"
            placeholder="Follow up in 3 days"
            value={form.task_title}
            onChange={(e) => setForm({ ...form, task_title: e.target.value })}
          />
        </label>
        <button type="button" className="app-btn app-btn-primary" onClick={create}>
          Create rule
        </button>
      </div>

      <div className="app-card overflow-hidden">
        <table className="app-table">
          <thead>
            <tr>
              <th>Rule</th>
              <th>Summary</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td className="text-sm text-meta">
                  When a deal enters{" "}
                  <strong>{r.trigger_config?.stage_name || "any stage"}</strong> → create
                  task <strong>{r.action_config?.title || "Follow up"}</strong>
                </td>
                <td>
                  <span
                    className={`status-pill ${r.enabled ? "status-pill-lime" : "status-pill-red"}`}
                  >
                    {r.enabled ? "on" : "off"}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button type="button" className="app-btn" onClick={() => toggle(r)}>
                      {r.enabled ? "Disable" : "Enable"}
                    </button>
                    <button type="button" className="app-btn" onClick={() => remove(r.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rules.length && (
              <tr>
                <td colSpan={4} className="empty-row">
                  No automation rules yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
