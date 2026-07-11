"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ErrorBanner from "@/components/app/ErrorBanner";
import SettingsSubnav from "@/components/app/SettingsSubnav";

type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
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
    const { data, error: loadErr } = await supabase
      .from("email_templates")
      .select("id, name, subject, body")
      .eq("org_id", mem.org_id)
      .order("updated_at", { ascending: false });
    if (loadErr) {
      setError(loadErr.message);
      return;
    }
    setTemplates(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!orgId || !form.name.trim() || !form.subject.trim()) return;
    setError(null);
    const supabase = createClient();
    if (editingId) {
      const { error: updateErr } = await supabase
        .from("email_templates")
        .update({
          name: form.name.trim(),
          subject: form.subject.trim(),
          body: form.body,
        })
        .eq("id", editingId);
      if (updateErr) {
        setError(updateErr.message);
        return;
      }
    } else {
      const { error: insertErr } = await supabase.from("email_templates").insert({
        org_id: orgId,
        name: form.name.trim(),
        subject: form.subject.trim(),
        body: form.body || "",
        created_by: userId,
      });
      if (insertErr) {
        setError(insertErr.message);
        return;
      }
    }
    setForm({ name: "", subject: "", body: "" });
    setEditingId(null);
    load();
  };

  const edit = (t: Template) => {
    setEditingId(t.id);
    setForm({ name: t.name, subject: t.subject, body: t.body });
  };

  const remove = async (id: string) => {
    setError(null);
    const supabase = createClient();
    const { error: delErr } = await supabase.from("email_templates").delete().eq("id", id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    if (editingId === id) {
      setEditingId(null);
      setForm({ name: "", subject: "", body: "" });
    }
    load();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <SettingsSubnav />
      <div>
        <h1 className="app-page-title">Email templates</h1>
        <p className="app-page-sub">Reusable subjects and bodies for one-off and contact sends.</p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="app-card p-5 space-y-3">
        <h2 className="app-section-title">{editingId ? "Edit template" : "New template"}</h2>
        <input
          className="app-input"
          placeholder="Template name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="app-input"
          placeholder="Subject"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />
        <textarea
          className="app-input"
          placeholder="Body (HTML or text). Use {{first_name}} merge tags."
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
        <div className="flex gap-2">
          <button type="button" className="app-btn app-btn-primary" onClick={save}>
            {editingId ? "Update" : "Create"}
          </button>
          {editingId && (
            <button
              type="button"
              className="app-btn"
              onClick={() => {
                setEditingId(null);
                setForm({ name: "", subject: "", body: "" });
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="app-card overflow-hidden">
        <table className="app-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Subject</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.name}</td>
                <td>{t.subject}</td>
                <td>
                  <div className="flex gap-2">
                    <button type="button" className="app-btn" onClick={() => edit(t)}>
                      Edit
                    </button>
                    <button type="button" className="app-btn" onClick={() => remove(t.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!templates.length && (
              <tr>
                <td colSpan={3} style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  No templates yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
