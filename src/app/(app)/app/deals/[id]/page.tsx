"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ErrorBanner from "@/components/app/ErrorBanner";

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [deal, setDeal] = useState<{
    id: string;
    title: string;
    value: number;
    currency: string;
    expected_close: string | null;
    stage_id: string;
    contact_id: string | null;
    org_id: string;
    stage_entered_at: string;
    contacts?: { id: string; name: string; email: string | null } | null;
  } | null>(null);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [activities, setActivities] = useState<
    { id: string; type: string; body: string | null; created_at: string }[]
  >([]);
  const [tasks, setTasks] = useState<
    { id: string; title: string; status: string; due_at: string | null }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data, error: loadErr } = await supabase
        .from("deals")
        .select("*, contacts(id, name, email)")
        .eq("id", id)
        .single();
      if (loadErr) {
        setError(loadErr.message);
        return;
      }
      if (!data) return;
      setDeal(data);
      const { data: st } = await supabase
        .from("pipeline_stages")
        .select("id, name")
        .eq("pipeline_id", data.pipeline_id)
        .order("position");
      setStages(st || []);
      const { data: acts } = await supabase
        .from("activities")
        .select("id, type, body, created_at")
        .eq("deal_id", id)
        .order("created_at", { ascending: false });
      setActivities(acts || []);
      const { data: t } = await supabase
        .from("tasks")
        .select("id, title, status, due_at")
        .eq("deal_id", id)
        .order("due_at", { ascending: true });
      setTasks(t || []);
    };
    load();
  }, [id]);

  const save = async () => {
    if (!deal) return;
    setError(null);
    setSaved(false);
    const supabase = createClient();
    const { error: updateErr } = await supabase
      .from("deals")
      .update({
        title: deal.title,
        value: deal.value,
        expected_close: deal.expected_close,
        stage_id: deal.stage_id,
      })
      .eq("id", deal.id);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setSaved(true);
  };

  if (!deal) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
        Loading…
      </p>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/app/pipelines" className="text-sm" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
        ← Pipeline
      </Link>
      <div>
        <h1 className="app-page-title">{deal.title}</h1>
        <p className="app-page-sub">
          Entered stage {new Date(deal.stage_entered_at).toLocaleString()}
          {deal.contacts?.name && (
            <>
              {" · "}
              <Link
                href={`/app/contacts/${deal.contacts.id}`}
                style={{ color: "var(--forest)", fontWeight: 600 }}
              >
                {deal.contacts.name}
              </Link>
              {deal.contacts.email ? ` (${deal.contacts.email})` : ""}
            </>
          )}
        </p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="app-card p-5 grid gap-3">
        <label className="app-label">
          Title
          <input
            className="app-input mt-1"
            value={deal.title}
            onChange={(e) => setDeal({ ...deal, title: e.target.value })}
          />
        </label>
        <label className="app-label">
          Value
          <input
            className="app-input mt-1 font-data"
            type="number"
            value={deal.value}
            onChange={(e) => setDeal({ ...deal, value: Number(e.target.value) })}
          />
        </label>
        <label className="app-label">
          Expected close
          <input
            className="app-input mt-1 font-data"
            type="date"
            value={deal.expected_close || ""}
            onChange={(e) => setDeal({ ...deal, expected_close: e.target.value || null })}
          />
        </label>
        <label className="app-label">
          Stage
          <select
            className="app-input mt-1"
            value={deal.stage_id}
            onChange={(e) => setDeal({ ...deal, stage_id: e.target.value })}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="app-btn app-btn-primary w-fit" onClick={save}>
          Save
        </button>
        {saved && (
          <p className="text-xs" style={{ color: "var(--forest)", fontWeight: 600 }}>
            Saved
          </p>
        )}
      </div>

      <div className="app-card p-5">
        <h2 className="app-section-title mb-3">Tasks</h2>
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex justify-between text-sm" style={{ fontWeight: 500 }}>
              <span>{t.title}</span>
              <span className="font-data" style={{ color: "var(--text-secondary)" }}>
                {t.due_at ? new Date(t.due_at).toLocaleDateString() : "—"} · {t.status}
              </span>
            </li>
          ))}
          {!tasks.length && (
            <li className="text-sm" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
              No tasks
            </li>
          )}
        </ul>
      </div>

      <div className="app-card p-5">
        <h2 className="app-section-title mb-3">Activity</h2>
        <div className="timeline">
          {activities.map((a) => (
            <div key={a.id} className="timeline-item">
              <div className="flex gap-2 items-center">
                <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
                  {a.type.replace(/_/g, " ")}
                </span>
                <span className="text-xs" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
              {a.body && (
                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  {a.body}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
