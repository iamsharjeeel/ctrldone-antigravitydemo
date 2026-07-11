"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Contact } from "@/lib/types";
import ErrorBanner from "@/components/app/ErrorBanner";
import CustomFieldsEditor from "@/components/app/CustomFieldsEditor";
import { Building2, Mail, MapPin, Phone, Plus, X } from "lucide-react";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<
    { id: string; type: string; body: string | null; created_at: string }[]
  >([]);
  const [deals, setDeals] = useState<
    { id: string; title: string; value: number; currency: string; pipeline_stages?: { name?: string } | null }[]
  >([]);
  const [note, setNote] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [accounts, setAccounts] = useState<{ id: string; from_email: string }[]>([]);
  const [templates, setTemplates] = useState<
    { id: string; name: string; subject: string; body: string }[]
  >([]);
  const [compose, setCompose] = useState({
    accountId: "",
    subject: "",
    html: "<p>Hi {{first_name}},</p>",
  });
  const [sendMsg, setSendMsg] = useState("");

  const load = async () => {
    const supabase = createClient();
    const { data, error: loadErr } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .single();
    if (loadErr) {
      setError(loadErr.message);
      return;
    }
    setContact(data as Contact);
    const { data: acts } = await supabase
      .from("activities")
      .select("id, type, body, created_at")
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    setActivities(acts || []);

    const { data: d } = await supabase
      .from("deals")
      .select("id, title, value, currency, pipeline_stages(name)")
      .eq("contact_id", id)
      .order("updated_at", { ascending: false });
    setDeals(
      (d || []).map((row) => ({
        id: row.id,
        title: row.title,
        value: row.value,
        currency: row.currency,
        pipeline_stages: Array.isArray(row.pipeline_stages)
          ? row.pipeline_stages[0] || null
          : (row.pipeline_stages as { name?: string } | null),
      }))
    );

    const { data: acc } = await supabase
      .from("email_accounts")
      .select("id, from_email")
      .eq("org_id", data.org_id)
      .eq("status", "connected");
    setAccounts(acc || []);

    const { data: t } = await supabase
      .from("email_templates")
      .select("id, name, subject, body")
      .eq("org_id", data.org_id)
      .order("name");
    setTemplates(t || []);
  };

  useEffect(() => {
    load();
  }, [id]);

  const filteredActivities = useMemo(() => {
    if (!typeFilter) return activities;
    return activities.filter((a) => a.type === typeFilter);
  }, [activities, typeFilter]);

  const activityTypes = useMemo(
    () => Array.from(new Set(activities.map((a) => a.type))),
    [activities]
  );

  const save = async () => {
    if (!contact) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateErr } = await supabase
      .from("contacts")
      .update({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        status: contact.status,
        timezone: contact.timezone,
        tags: contact.tags,
      })
      .eq("id", contact.id);
    setSaving(false);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
  };

  const addNote = async () => {
    if (!contact || !note.trim()) return;
    setError(null);
    const supabase = createClient();
    const { error: insertErr } = await supabase.from("activities").insert({
      org_id: contact.org_id,
      contact_id: contact.id,
      type: "note",
      body: note.trim(),
    });
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setNote("");
    setShowLog(false);
    load();
  };

  const sendEmail = async () => {
    if (!contact?.email || !compose.accountId) return;
    setSendMsg("");
    setError(null);
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: compose.accountId,
        contactId: contact.id,
        subject: compose.subject,
        html: compose.html,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Send failed");
      return;
    }
    setSendMsg("Sent.");
    setComposeOpen(false);
    load();
  };

  if (!contact) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
        Loading…
      </p>
    );
  }

  const titleLine = [contact.status, contact.company].filter(Boolean).join(" at ");
  const canEmail = Boolean(contact.email) && accounts.length > 0;

  return (
    <div className="space-y-6">
      <p className="text-sm" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
        <Link href="/app/contacts">Contacts</Link>
        <span> › </span>
        <span style={{ color: "var(--text)", fontWeight: 600 }}>{contact.name}</span>
      </p>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {sendMsg && (
        <p className="text-sm" style={{ color: "var(--forest)", fontWeight: 600 }}>
          {sendMsg}
        </p>
      )}

      <div className="contact-detail-grid">
        <div className="space-y-4">
          <div className="app-card p-5">
            <div
              className="avatar-circle"
              style={{ width: 96, height: 96, fontSize: 28, borderRadius: 16 }}
            >
              {initials(contact.name)}
            </div>
            <h1 className="app-page-title" style={{ fontSize: 28, marginTop: 16 }}>
              {contact.name}
            </h1>
            <p className="app-page-sub">{titleLine || "Contact"}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="status-pill status-pill-blue">{contact.status}</span>
              <span className="font-data text-sm" style={{ fontWeight: 700 }}>
                Score {contact.score ?? 0}
              </span>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                className="app-btn app-btn-primary flex-1"
                disabled={!canEmail}
                onClick={() => setComposeOpen(true)}
                title={
                  !contact.email
                    ? "Add an email first"
                    : accounts.length === 0
                      ? "Connect an email account"
                      : "Send email"
                }
              >
                <Mail size={14} /> Email
              </button>
              <a
                className="app-btn flex-1"
                href={contact.phone ? `tel:${contact.phone}` : undefined}
              >
                <Phone size={14} /> Call
              </a>
            </div>

            <div className="mt-6 space-y-3 text-sm" style={{ fontWeight: 500 }}>
              <div className="flex items-start gap-3" style={{ color: "var(--text-secondary)" }}>
                <Mail size={15} className="mt-0.5" />
                <span>{contact.email || "—"}</span>
              </div>
              <div className="flex items-start gap-3" style={{ color: "var(--text-secondary)" }}>
                <Phone size={15} className="mt-0.5" />
                <span>{contact.phone || "—"}</span>
              </div>
              <div className="flex items-start gap-3" style={{ color: "var(--text-secondary)" }}>
                <MapPin size={15} className="mt-0.5" />
                <span>{contact.timezone || "—"}</span>
              </div>
              <div className="flex items-start gap-3" style={{ color: "var(--text-secondary)" }}>
                <Building2 size={15} className="mt-0.5" />
                <span>{contact.company || "—"}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <input
                className="app-input"
                value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
              />
              <input
                className="app-input"
                placeholder="Email"
                value={contact.email || ""}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
              />
              <input
                className="app-input"
                placeholder="Phone"
                value={contact.phone || ""}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              />
              <input
                className="app-input"
                placeholder="Company"
                value={contact.company || ""}
                onChange={(e) => setContact({ ...contact, company: e.target.value })}
              />
              <button type="button" className="app-btn app-btn-primary" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save details"}
              </button>
            </div>
          </div>

          <div className="app-card p-5">
            <div className="app-label mb-3">Segments</div>
            <div className="flex flex-wrap gap-2">
              {(contact.tags || []).length ? (
                (contact.tags || []).map((t) => (
                  <span key={t} className="status-pill">
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-sm" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  No segments
                </span>
              )}
            </div>
            <input
              className="app-input mt-3"
              placeholder="Add tags, comma-separated"
              defaultValue={(contact.tags || []).join(", ")}
              onBlur={(e) =>
                setContact({
                  ...contact,
                  tags: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>

          <div className="app-card p-5">
            <CustomFieldsEditor orgId={contact.org_id} contactId={contact.id} />
          </div>

          <div className="app-card p-5">
            <h2 className="app-section-title mb-3">Deals</h2>
            <ul className="space-y-2">
              {deals.map((d) => (
                <li key={d.id} className="flex justify-between text-sm gap-2">
                  <Link href={`/app/deals/${d.id}`} style={{ fontWeight: 600, color: "var(--forest)" }}>
                    {d.title}
                  </Link>
                  <span className="font-data" style={{ color: "var(--text-secondary)" }}>
                    {Number(d.value).toLocaleString(undefined, {
                      style: "currency",
                      currency: d.currency || "USD",
                      maximumFractionDigits: 0,
                    })}
                    {d.pipeline_stages?.name ? ` · ${d.pipeline_stages.name}` : ""}
                  </span>
                </li>
              ))}
              {!deals.length && (
                <li className="text-sm" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  No deals linked
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="app-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="app-section-title">Activity Timeline</h2>
            <div className="flex gap-2">
              <button
                type="button"
                className="app-btn"
                onClick={() => setShowTypeFilter((v) => !v)}
              >
                Filter
              </button>
              <button
                type="button"
                className="app-btn app-btn-primary"
                onClick={() => setShowLog((v) => !v)}
              >
                <Plus size={14} /> Log Activity
              </button>
            </div>
          </div>

          {showTypeFilter && (
            <div className="mb-4">
              <select
                className="app-input"
                style={{ maxWidth: 220 }}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All types</option>
                {activityTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showLog && (
            <div className="mb-6 space-y-2">
              <textarea
                className="app-input"
                placeholder="What happened?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button type="button" className="app-btn app-btn-primary" onClick={addNote}>
                Save activity
              </button>
            </div>
          )}

          <div className="timeline">
            {filteredActivities.map((a) => (
              <div key={a.id} className="timeline-item">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
                    {a.type.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
                {a.body && (
                  <div
                    className="mt-2 p-3 text-sm"
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--text-secondary)",
                      fontWeight: 500,
                    }}
                  >
                    {a.body}
                  </div>
                )}
              </div>
            ))}
            <div className="timeline-item">
              <div className="flex flex-wrap items-baseline gap-2">
                <span style={{ fontWeight: 600 }}>Contact created</span>
                <span className="text-xs" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  {new Date(contact.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {composeOpen && (
        <div className="modal-backdrop" onClick={() => setComposeOpen(false)}>
          <div className="modal-card space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="app-section-title">Email {contact.name}</h2>
              <button type="button" className="top-nav-icon" onClick={() => setComposeOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <select
              className="app-input"
              value={compose.accountId}
              onChange={(e) => setCompose({ ...compose, accountId: e.target.value })}
            >
              <option value="">From account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.from_email}
                </option>
              ))}
            </select>
            <select
              className="app-input"
              defaultValue=""
              onChange={(e) => {
                const t = templates.find((x) => x.id === e.target.value);
                if (t) setCompose({ ...compose, subject: t.subject, html: t.body });
              }}
            >
              <option value="">Use template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              className="app-input"
              placeholder="Subject"
              value={compose.subject}
              onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
            />
            <textarea
              className="app-input"
              value={compose.html}
              onChange={(e) => setCompose({ ...compose, html: e.target.value })}
            />
            <button type="button" className="app-btn app-btn-primary" onClick={sendEmail}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
