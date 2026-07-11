"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ErrorBanner from "@/components/app/ErrorBanner";
import { createNotification } from "@/lib/notifications";

type TaskRow = {
  id: string;
  title: string;
  due_at: string | null;
  status: string;
  assignee_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  priority: string;
  task_type: string | null;
  recurrence_rule: string | null;
};

function priorityDot(priority: string) {
  if (priority === "high") return "stage-dot stage-dot-lost";
  if (priority === "low") return "stage-dot";
  return "stage-dot stage-dot-won";
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"mine" | "team">("mine");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState("normal");
  const [taskType, setTaskType] = useState("");
  const [recurrence, setRecurrence] = useState("");
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
      .select(
        "id, title, due_at, status, assignee_id, contact_id, deal_id, priority, task_type, recurrence_rule"
      )
      .eq("org_id", mem.org_id)
      .neq("status", "cancelled")
      .order("due_at", { ascending: true, nullsFirst: false });

    if (filter === "mine") q = q.eq("assignee_id", user.id);

    const { data, error: loadErr } = await q;
    if (loadErr) {
      setError(loadErr.message);
      return;
    }
    const rows = ((data as TaskRow[]) || []).slice().sort((a, b) => {
      const rank = (p: string) => (p === "high" ? 0 : p === "normal" ? 1 : 2);
      return rank(a.priority || "normal") - rank(b.priority || "normal");
    });
    setTasks(rows);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!orgId || !title.trim()) return;
    setError(null);
    const supabase = createClient();
    const assignee = userId;
    const { error: insertErr } = await supabase.from("tasks").insert({
      org_id: orgId,
      title: title.trim(),
      assignee_id: assignee,
      status: "open",
      priority,
      task_type: taskType.trim() || null,
      recurrence_rule: recurrence || null,
      due_at: dueAt
        ? new Date(dueAt).toISOString()
        : new Date().toISOString(),
    });
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    if (assignee) {
      await createNotification(supabase, {
        orgId,
        userId: assignee,
        type: "task_assigned",
        title: `Task: ${title.trim()}`,
        body: dueAt ? `Due ${dueAt}` : "Assigned to you",
        link: "/app/tasks",
      });
    }
    setTitle("");
    setDueAt("");
    setPriority("normal");
    setTaskType("");
    setRecurrence("");
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
        <div className="segmented">
          <button
            type="button"
            className="segmented-btn"
            data-active={filter === "mine"}
            onClick={() => setFilter("mine")}
          >
            Mine
          </button>
          <button
            type="button"
            className="segmented-btn"
            data-active={filter === "team"}
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
          style={{ maxWidth: 280 }}
          placeholder="New task"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") create();
          }}
        />
        <input
          className="app-input"
          style={{ maxWidth: 160 }}
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />
        <select
          className="app-input"
          style={{ maxWidth: 120 }}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
        <select
          className="app-input"
          style={{ maxWidth: 140 }}
          value={taskType}
          onChange={(e) => setTaskType(e.target.value)}
        >
          <option value="">Type</option>
          <option value="call">Call</option>
          <option value="email">Email</option>
          <option value="follow_up">Follow-up</option>
          <option value="renewal">Renewal</option>
          <option value="other">Other</option>
        </select>
        <select
          className="app-input"
          style={{ maxWidth: 140 }}
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value)}
        >
          <option value="">No repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <button type="button" className="app-btn app-btn-primary" onClick={create}>
          Add
        </button>
      </div>

      <div className="app-card overflow-hidden">
        <table className="app-table dense">
          <thead>
            <tr>
              <th style={{ width: 40 }} />
              <th style={{ width: 36 }} />
              <th>Task</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const overdue =
                t.status !== "done" &&
                !!t.due_at &&
                new Date(t.due_at) < new Date(new Date().toDateString());
              return (
                <tr key={t.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={t.status === "done"}
                      onChange={() => toggleDone(t)}
                    />
                  </td>
                  <td>
                    <span
                      className={priorityDot(t.priority || "normal")}
                      title={t.priority || "normal"}
                    />
                  </td>
                  <td
                    className={t.status === "done" ? "task-title--done" : undefined}
                    style={{ fontWeight: 600 }}
                  >
                    {t.title}
                    {(t.task_type || t.recurrence_rule) && (
                      <span
                        className="text-meta"
                        style={{ display: "block", fontWeight: 400, marginTop: 2 }}
                      >
                        {[t.task_type, t.recurrence_rule].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </td>
                  <td className={`font-data${overdue ? " task-due--overdue" : ""}`}>
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
              );
            })}
            {!tasks.length && (
              <tr>
                <td colSpan={5} className="empty-row">
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
