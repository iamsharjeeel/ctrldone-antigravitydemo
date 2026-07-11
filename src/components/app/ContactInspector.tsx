"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Contact } from "@/lib/types";
import CustomFieldsEditor from "@/components/app/CustomFieldsEditor";

export default function ContactInspector({
  contactId,
  onClose,
  onSaved,
}: {
  contactId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [note, setNote] = useState("");
  const [activities, setActivities] = useState<
    { id: string; type: string; body: string | null; created_at: string }[]
  >([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!contactId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [contactId, onClose]);

  useEffect(() => {
    if (!contactId) return;
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .single();
      setContact(data as Contact);
      const { data: acts } = await supabase
        .from("activities")
        .select("id, type, body, created_at")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })
        .limit(30);
      setActivities(acts || []);
    };
    load();
  }, [contactId]);

  if (!contactId) return null;

  const save = async () => {
    if (!contact) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("contacts")
      .update({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        status: contact.status,
        timezone: contact.timezone,
      })
      .eq("id", contact.id);
    setSaving(false);
    onSaved?.();
  };

  const addNote = async () => {
    if (!contact || !note.trim()) return;
    const supabase = createClient();
    await supabase.from("activities").insert({
      org_id: contact.org_id,
      contact_id: contact.id,
      type: "note",
      body: note.trim(),
    });
    setNote("");
    const { data: acts } = await supabase
      .from("activities")
      .select("id, type, body, created_at")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setActivities(acts || []);
  };

  return (
    <>
      <div className="inspector-backdrop" onClick={onClose} />
      <aside className="inspector-panel">
        <div className="flex items-center justify-between mb-4">
          <h2 className="app-section-title">Contact</h2>
          <button type="button" className="app-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {contact ? (
          <div className="space-y-3">
            <label className="field-label">
              Name
              <input
                className="app-input mt-1"
                value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
              />
            </label>
            <label className="field-label">
              Email
              <input
                className="app-input mt-1 font-data"
                value={contact.email || ""}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
              />
            </label>
            <label className="field-label">
              Phone
              <input
                className="app-input mt-1 font-data"
                value={contact.phone || ""}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              />
            </label>
            <label className="field-label">
              Company
              <input
                className="app-input mt-1"
                value={contact.company || ""}
                onChange={(e) => setContact({ ...contact, company: e.target.value })}
              />
            </label>
            <label className="field-label">
              Timezone (manual)
              <input
                className="app-input mt-1 font-data"
                placeholder="e.g. America/New_York"
                value={contact.timezone || ""}
                onChange={(e) =>
                  setContact({ ...contact, timezone: e.target.value || null })
                }
              />
            </label>
            <div className="flex items-center gap-2">
              <span className="status-pill status-pill-blue">{contact.status}</span>
              <span className="font-data text-xs" style={{ color: "var(--text-muted)" }}>
                score {contact.score}
              </span>
            </div>
            <button type="button" className="app-btn app-btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>

            <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <CustomFieldsEditor orgId={contact.org_id} contactId={contact.id} />
            </div>

            <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="app-label" style={{ marginBottom: 10 }}>Activity</div>
              <textarea
                className="app-input"
                style={{ height: 72, paddingTop: 8 }}
                placeholder="Add a note…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button type="button" className="app-btn mt-2" onClick={addNote}>
                Add note
              </button>
              <ul className="mt-4 space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="status-pill status-pill-blue">{a.type}</span>
                      <span className="font-data text-xs" style={{ color: "var(--text-muted)" }}>
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </div>
                    {a.body && <p className="mt-1" style={{ color: "var(--text-secondary)" }}>{a.body}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-3" aria-busy="true" aria-label="Loading contact">
            <div className="skeleton-line" style={{ width: "60%" }} />
            <div className="skeleton-line" style={{ width: "85%" }} />
            <div className="skeleton-line" style={{ width: "70%" }} />
            <div className="skeleton-line" style={{ width: "90%" }} />
          </div>
        )}
      </aside>
    </>
  );
}
