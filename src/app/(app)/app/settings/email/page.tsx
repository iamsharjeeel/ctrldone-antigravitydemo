"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EmailAccount } from "@/lib/types";
import ErrorBanner from "@/components/app/ErrorBanner";
import SettingsSubnav from "@/components/app/SettingsSubnav";

export default function EmailSettingsPage() {
  const search = useSearchParams();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [templates, setTemplates] = useState<
    { id: string; name: string; subject: string; body: string }[]
  >([]);
  const [compose, setCompose] = useState({
    accountId: "",
    contactId: "",
    subject: "",
    html: "<p>Hi {{first_name}},</p>",
  });
  const [contacts, setContacts] = useState<{ id: string; name: string; email: string | null }[]>(
    []
  );
  const [msg, setMsg] = useState(search.get("connected") ? "Gmail connected." : "");
  const [error, setError] = useState<string | null>(() => {
    const e = search.get("error");
    if (!e) return null;
    if (e === "missing_google_env") return "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local";
    return `OAuth error: ${e}`;
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
    const { data, error: loadErr } = await supabase
      .from("email_accounts")
      .select("id, org_id, provider, from_email, status")
      .eq("org_id", mem.org_id);
    if (loadErr) {
      setError(loadErr.message);
      return;
    }
    setAccounts((data as EmailAccount[]) || []);
    const { data: c } = await supabase
      .from("contacts")
      .select("id, name, email")
      .eq("org_id", mem.org_id)
      .not("email", "is", null)
      .limit(100);
    setContacts(c || []);
    const { data: t } = await supabase
      .from("email_templates")
      .select("id, name, subject, body")
      .eq("org_id", mem.org_id)
      .order("name");
    setTemplates(t || []);
  };

  useEffect(() => {
    load();
  }, []);

  const disconnect = async (id: string) => {
    setError(null);
    const supabase = createClient();
    const { error: updateErr } = await supabase
      .from("email_accounts")
      .update({
        status: "disconnected",
        access_token_encrypted: null,
        refresh_token_encrypted: null,
      })
      .eq("id", id);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    load();
  };

  const sendOneOff = async () => {
    setMsg("");
    setError(null);
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(compose),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed");
      return;
    }
    setMsg("Sent.");
  };

  const applyTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setCompose({ ...compose, subject: t.subject, html: t.body });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <SettingsSubnav />
      <div>
        <h1 className="app-page-title">Email</h1>
        <p className="app-page-sub">Connect Gmail or Outlook — send as the connected mailbox</p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="flex gap-2">
        <a className="app-btn app-btn-primary" href="/api/oauth/google/start">
          Connect Gmail
        </a>
        <a className="app-btn" href="/api/oauth/microsoft/start">
          Connect Outlook
        </a>
      </div>

      <div className="app-card overflow-hidden">
        <table className="app-table">
          <thead>
            <tr>
              <th>From</th>
              <th>Provider</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td className="font-data">{a.from_email}</td>
                <td>{a.provider}</td>
                <td>
                  <span
                    className={`status-pill ${
                      a.status === "connected"
                        ? "status-pill-lime"
                        : a.status === "needs_reauth"
                          ? "status-pill-red"
                          : "status-pill-blue"
                    }`}
                  >
                    {a.status}
                  </span>
                </td>
                <td>
                  <button type="button" className="app-btn" onClick={() => disconnect(a.id)}>
                    Disconnect
                  </button>
                </td>
              </tr>
            ))}
            {!accounts.length && (
              <tr>
                <td colSpan={4} style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  No accounts connected
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="app-card p-5 space-y-3">
        <h2 className="app-section-title">One-off send</h2>
        <select
          className="app-input"
          value={compose.accountId}
          onChange={(e) => setCompose({ ...compose, accountId: e.target.value })}
        >
          <option value="">From account…</option>
          {accounts
            .filter((a) => a.status === "connected")
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.from_email}
              </option>
            ))}
        </select>
        <select
          className="app-input"
          value={compose.contactId}
          onChange={(e) => setCompose({ ...compose, contactId: e.target.value })}
        >
          <option value="">To contact…</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.email})
            </option>
          ))}
        </select>
        <select className="app-input" defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
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
        <button type="button" className="app-btn app-btn-primary" onClick={sendOneOff}>
          Send
        </button>
        {msg && (
          <p className="text-xs" style={{ color: "var(--forest)", fontWeight: 600 }}>
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
