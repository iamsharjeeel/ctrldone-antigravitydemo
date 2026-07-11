"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ErrorBanner from "@/components/app/ErrorBanner";

type TaskRow = {
  id: string;
  title: string;
  due_at: string | null;
  status: string;
  assignee_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"mine" | "team">("mine");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
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

    let q = supabase
      .from("tasks")
      .select("id, title, due_at, status, assignee_id, contact_id, deal_id")
      .eq("org_id", mem.org_id)
      .neq("status", "cancelled")
      .order("due_at", { ascending: true, nullsFirst: false });

    if (filter === "mine") q = q.eq("assignee_id", user.id);

    const { data, error: loadErr } = await q;
    if (loadErr) {
      setError(loadErr.message);
      return;
    }
    setTasks((data as TaskRow[]) || []);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!orgId || !title.trim()) return;
    setError(null);
    const supabase = createClient();
    const { error: insertErr } = await supabase.from("tasks").insert({
      org_id: orgId,
      title: title.trim(),
      assignee_id: userId,
      status: "open",
      due_at: dueAt
        ? new Date(dueAt).toISOString()
        : new Date().toISOString(),
    });
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setTitle("");
    setDueAt("");
    load();
  };

  const toggleDone = async (task: TaskRow) => {
    setError(null);
    const supabase = createClient();
    const next = task.status === "done" ? "open" : "done";
    const { error: updateErr } = await supabase
      .from("tasks")
      .update({ status: next })
      .eq("id", task.id);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    if (next === "done" && orgId) {
      const { error: actErr } = await supabase.from("activities").insert({
        org_id: orgId,
        contact_id: task.contact_id,
        deal_id: task.deal_id,
        type: "task_done",
        body: task.title,
      });
      if (actErr) {
        setError(actErr.message);
        return;
      }
    }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="app-page-title">Tasks</h1>
          <p className="app-page-sub">Create and track work across your team.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={`app-btn ${filter === "mine" ? "app-btn-primary" : ""}`}
            onClick={() => setFilter("mine")}
          >
            Mine
          </button>
          <button
            type="button"
            className={`app-btn ${filter === "team" ? "app-btn-primary" : ""}`}
            onClick={() => setFilter("team")}
          >
            Team
          </button>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="app-input"
          style={{ maxWidth: 320 }}
          placeholder="New task"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") create();
          }}
        />
        <input
          className="app-input"
          style={{ maxWidth: 180 }}
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />
        <button type="button" className="app-btn app-btn-primary" onClick={create}>
          Add
        </button>
      </div>

      <div className="app-card overflow-hidden">
        <table className="app-table dense">
          <thead>
            <tr>
              <th style={{ width: 40 }} />
              <th>Task</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={t.status === "done"}
                    onChange={() => toggleDone(t)}
                  />
                </td>
                <td
                  style={{
                    textDecoration: t.status === "done" ? "line-through" : "none",
                    fontWeight: 600,
                  }}
                >
                  {t.title}
                </td>
                <td className="font-data">
                  {t.due_at ? new Date(t.due_at).toLocaleDateString() : "—"}
                </td>
                <td>
                  <span
                    className={`status-pill ${
                      t.status === "done" ? "status-pill-lime" : "status-pill-blue"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
            {!tasks.length && (
              <tr>
                <td colSpan={4} style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  No tasks yet. Add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
