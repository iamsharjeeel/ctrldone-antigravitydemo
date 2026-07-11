"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ErrorBanner from "@/components/app/ErrorBanner";
import SettingsSubnav from "@/components/app/SettingsSubnav";

type Attr = {
  id: string;
  key: string;
  label: string;
  field_type: string;
  options: unknown;
};

export default function FieldsPage() {
  const [attrs, setAttrs] = useState<Attr[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [form, setForm] = useState({
    key: "",
    label: "",
    field_type: "text",
    options: "",
  });
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
      .from("contact_attributes")
      .select("id, key, label, field_type, options")
      .eq("org_id", mem.org_id)
      .order("label");
    if (loadErr) {
      setError(loadErr.message);
      return;
    }
    setAttrs(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!orgId || !form.key.trim() || !form.label.trim()) return;
    setError(null);
    const key = form.key
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_");
    const options =
      form.field_type === "select"
        ? form.options
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean)
        : [];
    const supabase = createClient();
    const { error: insertErr } = await supabase.from("contact_attributes").insert({
      org_id: orgId,
      key,
      label: form.label.trim(),
      field_type: form.field_type,
      options,
    });
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setForm({ key: "", label: "", field_type: "text", options: "" });
    load();
  };

  const remove = async (id: string) => {
    setError(null);
    const supabase = createClient();
    const { error: delErr } = await supabase.from("contact_attributes").delete().eq("id", id);
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
        <h1 className="app-page-title">Custom fields</h1>
        <p className="app-page-sub">Define contact attributes shown on contact detail.</p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="app-card p-5 space-y-3">
        <h2 className="app-section-title">Add field</h2>
        <input
          className="app-input"
          placeholder="Key (e.g. industry)"
          value={form.key}
          onChange={(e) => setForm({ ...form, key: e.target.value })}
        />
        <input
          className="app-input"
          placeholder="Label"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />
        <select
          className="app-input"
          value={form.field_type}
          onChange={(e) => setForm({ ...form, field_type: e.target.value })}
        >
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
          <option value="boolean">Boolean</option>
          <option value="select">Select</option>
        </select>
        {form.field_type === "select" && (
          <input
            className="app-input"
            placeholder="Options, comma-separated"
            value={form.options}
            onChange={(e) => setForm({ ...form, options: e.target.value })}
          />
        )}
        <button type="button" className="app-btn app-btn-primary" onClick={create}>
          Create field
        </button>
      </div>

      <div className="app-card overflow-hidden">
        <table className="app-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Key</th>
              <th>Type</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {attrs.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>{a.label}</td>
                <td className="font-data">{a.key}</td>
                <td>{a.field_type}</td>
                <td>
                  <button type="button" className="app-btn" onClick={() => remove(a.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!attrs.length && (
              <tr>
                <td colSpan={4} style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  No custom fields yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
