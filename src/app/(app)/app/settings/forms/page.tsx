"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SettingsSubnav from "@/components/app/SettingsSubnav";
import ErrorBanner from "@/components/app/ErrorBanner";

type Field = {
  key: string;
  label: string;
  type: string;
  required: boolean;
};

type FormRow = {
  id: string;
  name: string;
  fields: Field[];
};

const FIELD_TYPES = ["text", "number", "date", "boolean", "select"] as const;

function slugKey(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

export default function FormsSettingsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [forms, setForms] = useState<FormRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("Lead form");
  const [fields, setFields] = useState<Field[]>([
    { key: "name", label: "Name", type: "text", required: true },
    { key: "email", label: "Email", type: "text", required: true },
    { key: "company", label: "Company", type: "text", required: false },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [origin, setOrigin] = useState("");

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
      .from("forms")
      .select("id, name, fields")
      .eq("org_id", mem.org_id)
      .order("created_at", { ascending: false });
    if (loadErr) {
      setError(loadErr.message);
      return;
    }
    setForms(
      (data || []).map((f) => ({
        id: f.id,
        name: f.name,
        fields: (f.fields as Field[]) || [],
      }))
    );
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, []);

  const selectForm = (f: FormRow) => {
    setSelectedId(f.id);
    setName(f.name);
    setFields(
      f.fields.length
        ? f.fields
        : [{ key: "email", label: "Email", type: "text", required: true }]
    );
    setSaved(false);
  };

  const addField = () => {
    setFields([
      ...fields,
      { key: `field_${fields.length + 1}`, label: "New field", type: "text", required: false },
    ]);
  };

  const updateField = (idx: number, patch: Partial<Field>) => {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== idx) return f;
        const next = { ...f, ...patch };
        if (patch.label !== undefined && !["name", "email", "company", "phone"].includes(f.key)) {
          next.key = slugKey(patch.label) || f.key;
        }
        return next;
      })
    );
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= fields.length) return;
    setFields((prev) => {
      const copy = [...prev];
      const tmp = copy[idx];
      copy[idx] = copy[j];
      copy[j] = tmp;
      return copy;
    });
  };

  const removeField = (idx: number) => {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!orgId || !name.trim()) return;
    setError(null);
    setSaved(false);
    const normalized = fields.map((f) => ({
      key: f.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") || "field",
      label: f.label.trim() || f.key,
      type: FIELD_TYPES.includes(f.type as (typeof FIELD_TYPES)[number]) ? f.type : "text",
      required: !!f.required,
    }));
    if (!normalized.some((f) => f.key === "email")) {
      setError("Forms need an email field (key: email).");
      return;
    }
    const supabase = createClient();
    if (selectedId) {
      const { error: updErr } = await supabase
        .from("forms")
        .update({ name: name.trim(), fields: normalized })
        .eq("id", selectedId);
      if (updErr) {
        setError(updErr.message);
        return;
      }
    } else {
      const { data, error: insErr } = await supabase
        .from("forms")
        .insert({ org_id: orgId, name: name.trim(), fields: normalized })
        .select("id")
        .single();
      if (insErr) {
        setError(insErr.message);
        return;
      }
      setSelectedId(data.id);
    }
    setSaved(true);
    load();
  };

  const createNew = () => {
    setSelectedId(null);
    setName("Lead form");
    setFields([
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "text", required: true },
      { key: "company", label: "Company", type: "text", required: false },
    ]);
    setSaved(false);
  };

  const removeForm = async () => {
    if (!selectedId) return;
    setError(null);
    const supabase = createClient();
    const { error: delErr } = await supabase.from("forms").delete().eq("id", selectedId);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    createNew();
    load();
  };

  const hostedUrl = selectedId ? `${origin}/f/${selectedId}` : "";
  const embedSnippet = selectedId
    ? `<div id="ctrldone-form"></div>\n<script src="${origin}/embed.js" data-form-id="${selectedId}" data-target="#ctrldone-form"></script>`
    : "";

  return (
    <div className="space-y-4 max-w-3xl">
      <SettingsSubnav />
      <div>
        <h1 className="app-page-title">Forms</h1>
        <p className="app-page-sub">
          Build embeddable lead forms — submissions create contacts + custom fields
        </p>
      </div>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="app-card p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <button type="button" className="app-btn app-btn-primary" onClick={createNew}>
            New form
          </button>
          {forms.map((f) => (
            <button
              key={f.id}
              type="button"
              className="segmented-btn"
              data-active={selectedId === f.id}
              onClick={() => selectForm(f)}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      <div className="app-card p-4 space-y-3">
        <label className="text-xs block" style={{ color: "var(--text-muted)" }}>
          Form name
          <input
            className="app-input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <h2 className="app-section-title">Fields</h2>
        {fields.map((f, idx) => (
          <div key={idx} className="grid gap-2" style={{ gridTemplateColumns: "1fr 120px 80px auto" }}>
            <input
              className="app-input"
              value={f.label}
              onChange={(e) => updateField(idx, { label: e.target.value })}
              placeholder="Label"
            />
            <select
              className="app-input"
              value={f.type}
              onChange={(e) => updateField(idx, { type: e.target.value })}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <input
                type="checkbox"
                checked={f.required}
                onChange={(e) => updateField(idx, { required: e.target.checked })}
              />
              Req
            </label>
            <div className="flex gap-1">
              <button type="button" className="app-btn" onClick={() => moveField(idx, -1)}>
                ↑
              </button>
              <button type="button" className="app-btn" onClick={() => moveField(idx, 1)}>
                ↓
              </button>
              <button type="button" className="app-btn" onClick={() => removeField(idx)}>
                ×
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="app-btn" onClick={addField}>
          Add field
        </button>

        <div className="flex gap-2 flex-wrap">
          <button type="button" className="app-btn app-btn-primary" onClick={save}>
            Save
          </button>
          {selectedId && (
            <button type="button" className="app-btn" onClick={removeForm}>
              Delete
            </button>
          )}
        </div>
        {saved && (
          <p className="text-xs" style={{ color: "var(--signal-lime)" }}>
            Saved
          </p>
        )}
      </div>

      {selectedId && (
        <div className="app-card p-4 space-y-3">
          <h2 className="app-section-title">Share</h2>
          <p className="text-meta">
            Hosted URL:{" "}
            <a href={hostedUrl} target="_blank" rel="noreferrer" style={{ color: "var(--signal-blue)" }}>
              {hostedUrl}
            </a>
          </p>
          <label className="text-xs block" style={{ color: "var(--text-muted)" }}>
            Embed snippet
            <textarea
              className="app-input mt-1 font-data"
              rows={3}
              readOnly
              value={embedSnippet}
              onFocus={(e) => e.target.select()}
            />
          </label>
        </div>
      )}
    </div>
  );
}
