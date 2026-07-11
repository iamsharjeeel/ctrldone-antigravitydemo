"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Contact } from "@/lib/types";
import ErrorBanner from "@/components/app/ErrorBanner";
import ContactInspector from "@/components/app/ContactInspector";
import { ChevronLeft, ChevronRight, Filter, Plus, Upload, Users } from "lucide-react";
import Papa from "papaparse";

const PAGE_SIZE = 10;

type ContactRow = Contact & {
  deal_value?: number;
  stage_name?: string | null;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatActivity(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `Today, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ContactsPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [q, setQ] = useState(search.get("q") || "");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(search.get("new") === "1");
  const [showFilter, setShowFilter] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "" });
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [csvPreview, setCsvPreview] = useState<{
    headers: string[];
    rows: Record<string, string>[];
    mapping: Record<string, string>;
  } | null>(null);
  const [importErrors, setImportErrors] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inspectorId, setInspectorId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: "", stage: "", tag: "" });
  const [segments, setSegments] = useState<{ id: string; name: string; filters: { status?: string; stage?: string; tag?: string } }[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [segmentName, setSegmentName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; org_id: string }[]>([]);
  const [bulkCampaignId, setBulkCampaignId] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeKeepId, setMergeKeepId] = useState("");
  const [merging, setMerging] = useState(false);

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
      setError("No organization found. Sign out and sign up again.");
      return;
    }
    setOrgId(mem.org_id);

    let query = supabase
      .from("contacts")
      .select("*")
      .eq("org_id", mem.org_id)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (q.trim()) {
      query = query.or(
        `name.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%,company.ilike.%${q.trim()}%`
      );
    }

    const { data, error: loadErr } = await query;
    if (loadErr) {
      setError(loadErr.message);
      return;
    }

    const list = (data as Contact[]) || [];
    const { data: deals } = await supabase
      .from("deals")
      .select("contact_id, value, pipeline_stages(name)")
      .eq("org_id", mem.org_id)
      .not("contact_id", "is", null);

    const byContact = new Map<string, { value: number; stage: string | null }>();
    (deals || []).forEach((d) => {
      if (!d.contact_id) return;
      const prev = byContact.get(d.contact_id);
      const value = Number(d.value || 0) + (prev?.value || 0);
      const stage =
        (d.pipeline_stages as { name?: string } | null)?.name || prev?.stage || null;
      byContact.set(d.contact_id, { value, stage });
    });

    setContacts(
      list.map((c) => ({
        ...c,
        deal_value: byContact.get(c.id)?.value || 0,
        stage_name: byContact.get(c.id)?.stage || c.status,
      }))
    );

    const { data: camps } = await supabase
      .from("campaigns")
      .select("id, name, org_id")
      .eq("org_id", mem.org_id)
      .neq("status", "archived");
    setCampaigns(camps || []);

    const { data: segs } = await supabase
      .from("saved_segments")
      .select("id, name, filters")
      .eq("org_id", mem.org_id)
      .order("name");
    setSegments(
      (segs || []).map((s) => ({
        id: s.id,
        name: s.name,
        filters: (s.filters || {}) as { status?: string; stage?: string; tag?: string },
      }))
    );
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (filters.status && c.status !== filters.status) return false;
      if (
        filters.stage &&
        !(c.stage_name || "").toLowerCase().includes(filters.stage.toLowerCase())
      )
        return false;
      if (
        filters.tag &&
        !(c.tags || []).some((t) => t.toLowerCase().includes(filters.tag.toLowerCase()))
      )
        return false;
      return true;
    });
  }, [contacts, filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [filtered, page]
  );

  const duplicateEmails = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of contacts) {
      const email = (c.email || "").trim().toLowerCase();
      if (!email) continue;
      counts.set(email, (counts.get(email) || 0) + 1);
    }
    const dups = new Set<string>();
    for (const [email, n] of counts) {
      if (n > 1) dups.add(email);
    }
    return dups;
  }, [contacts]);

  const selectedContacts = useMemo(
    () => contacts.filter((c) => selected.has(c.id)),
    [contacts, selected]
  );

  const statuses = useMemo(
    () => Array.from(new Set(contacts.map((c) => c.status).filter(Boolean))),
    [contacts]
  );

  const createContact = async () => {
    if (!orgId || !form.name.trim()) return;
    setError(null);
    const supabase = createClient();
    const email = form.email.trim().toLowerCase();
    if (email) {
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("org_id", orgId)
        .ilike("email", email)
        .maybeSingle();
      if (existing) {
        setError("Duplicate email — contact already exists.");
        return;
      }
    }
    const { data, error: insertErr } = await supabase
      .from("contacts")
      .insert({
        org_id: orgId,
        name: form.name.trim(),
        email: email || null,
        company: form.company.trim() || null,
        source: "manual",
      })
      .select("id")
      .single();
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setShowCreate(false);
    setForm({ name: "", email: "", company: "" });
    if (data?.id) {
      void fetch("/api/webhooks/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          event: "contact.created",
          payload: { contact: { id: data.id, name: form.name.trim(), email } },
        }),
      });
      router.push(`/app/contacts/${data.id}`);
    } else load();
  };

  const onCsv = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields || [];
        const mapping: Record<string, string> = {};
        headers.forEach((h) => {
          const key = h.toLowerCase();
          if (key.includes("email")) mapping[h] = "email";
          else if (key.includes("name") || key.includes("full")) mapping[h] = "name";
          else if (key.includes("company") || key.includes("org")) mapping[h] = "company";
          else if (key.includes("phone")) mapping[h] = "phone";
          else mapping[h] = "skip";
        });
        setCsvPreview({ headers, rows: result.data.slice(0, 50), mapping });
        setImportErrors("");
      },
    });
  };

  const commitCsv = async () => {
    if (!orgId || !csvPreview) return;
    setError(null);
    const supabase = createClient();
    const errors: { row: number; error: string }[] = [];
    let ok = 0;

    for (let i = 0; i < csvPreview.rows.length; i++) {
      const row = csvPreview.rows[i];
      const mapped: Record<string, string> = {};
      for (const [col, field] of Object.entries(csvPreview.mapping)) {
        if (field !== "skip" && row[col]) mapped[field] = row[col].trim();
      }
      if (!mapped.name && !mapped.email) {
        errors.push({ row: i + 1, error: "Missing name and email" });
        continue;
      }
      if (mapped.email) {
        const { data: existing } = await supabase
          .from("contacts")
          .select("id")
          .eq("org_id", orgId)
          .ilike("email", mapped.email)
          .maybeSingle();
        if (existing) {
          errors.push({ row: i + 1, error: `Duplicate email ${mapped.email}` });
          continue;
        }
      }
      const { error: insertErr } = await supabase.from("contacts").insert({
        org_id: orgId,
        name: mapped.name || mapped.email,
        email: mapped.email || null,
        phone: mapped.phone || null,
        company: mapped.company || null,
        source: "csv",
      });
      if (insertErr) errors.push({ row: i + 1, error: insertErr.message });
      else ok++;
    }

    const { error: actErr } = await supabase.from("activities").insert({
      org_id: orgId,
      type: "import",
      body: `CSV import: ${ok} created, ${errors.length} errors`,
      meta: { errors },
    });
    if (actErr) setError(actErr.message);

    if (errors.length) setImportErrors(Papa.unparse(errors));
    setCsvPreview(null);
    load();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    const ids = pageRows.map((c) => c.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const bulkEnroll = async () => {
    if (!orgId || !bulkCampaignId || selected.size === 0) return;
    setError(null);
    const supabase = createClient();
    const camp = campaigns.find((c) => c.id === bulkCampaignId);
    if (!camp) return;
    const { data: steps } = await supabase
      .from("campaign_steps")
      .select("id, position")
      .eq("campaign_id", bulkCampaignId)
      .order("position")
      .limit(1);
    const first = steps?.[0];
    const rows = Array.from(selected).map((contact_id) => ({
      org_id: orgId,
      campaign_id: bulkCampaignId,
      contact_id,
      current_step_id: first?.id || null,
      next_run_at: new Date().toISOString(),
      status: "pending" as const,
    }));
    const { error: enrollErr } = await supabase
      .from("campaign_enrollments")
      .upsert(rows, { onConflict: "campaign_id,contact_id" });
    if (enrollErr) {
      setError(enrollErr.message);
      return;
    }
    setSelected(new Set());
    setBulkCampaignId("");
  };

  const bulkAddTag = async () => {
    if (!bulkTag.trim() || selected.size === 0) return;
    setError(null);
    const supabase = createClient();
    const tag = bulkTag.trim();
    for (const id of selected) {
      const c = contacts.find((x) => x.id === id);
      if (!c) continue;
      const tags = Array.from(new Set([...(c.tags || []), tag]));
      await supabase.from("contacts").update({ tags }).eq("id", id);
    }
    setBulkTag("");
    setSelected(new Set());
    load();
  };

  const exportSelected = () => {
    const rows = contacts.filter((c) => selected.has(c.id));
    const csv = Papa.unparse(
      rows.map((c) => ({
        name: c.name,
        email: c.email || "",
        company: c.company || "",
        phone: c.phone || "",
        status: c.status,
        tags: (c.tags || []).join(";"),
      }))
    );
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = "contacts-export.csv";
    a.click();
  };

  const openMerge = () => {
    if (selected.size < 2) return;
    const first = Array.from(selected)[0];
    setMergeKeepId(first);
    setMergeOpen(true);
  };

  const runMerge = async () => {
    if (!mergeKeepId || selected.size < 2) return;
    const mergeIds = Array.from(selected).filter((id) => id !== mergeKeepId);
    if (!mergeIds.length) return;
    setMerging(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcErr } = await supabase.rpc("merge_contacts", {
      p_keep_id: mergeKeepId,
      p_merge_ids: mergeIds,
    });
    setMerging(false);
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }
    setMergeOpen(false);
    setSelected(new Set());
    setInspectorId(mergeKeepId);
    load();
  };

  const stageClass = (name: string | null | undefined) => {
    const n = (name || "").toLowerCase();
    if (n.includes("won")) return "stage-dot stage-dot-won";
    if (n.includes("lost")) return "stage-dot stage-dot-lost";
    return "stage-dot";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="app-page-title">Contacts</h1>
          <p className="app-page-sub">Manage and track your client relationships.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="app-btn" onClick={() => setShowFilter((v) => !v)}>
            <Filter size={14} /> Filter
          </button>
          <label className="app-btn cursor-pointer">
            <Upload size={14} /> Import CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])}
            />
          </label>
          <button
            type="button"
            className="app-btn app-btn-primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={14} /> Add Contact
          </button>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="flex flex-wrap gap-2">
        <input
          className="app-input"
          style={{ maxWidth: 280 }}
          placeholder="Search contacts…"
          value={q}
          onChange={(e) => {
            setPage(0);
            setQ(e.target.value);
          }}
        />
      </div>

      {showFilter && (
        <div className="app-card p-5 flex flex-wrap gap-3 items-end">
          <label className="text-sm" style={{ fontWeight: 600 }}>
            Status
            <select
              className="app-input mt-1"
              style={{ minWidth: 140 }}
              value={filters.status}
              onChange={(e) => {
                setPage(0);
                setFilters({ ...filters, status: e.target.value });
              }}
            >
              <option value="">All</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm" style={{ fontWeight: 600 }}>
            Stage
            <input
              className="app-input mt-1"
              style={{ minWidth: 140 }}
              placeholder="e.g. New"
              value={filters.stage}
              onChange={(e) => {
                setPage(0);
                setFilters({ ...filters, stage: e.target.value });
              }}
            />
          </label>
          <label className="text-sm" style={{ fontWeight: 600 }}>
            Tag
            <input
              className="app-input mt-1"
              style={{ minWidth: 140 }}
              placeholder="Tag"
              value={filters.tag}
              onChange={(e) => {
                setPage(0);
                setFilters({ ...filters, tag: e.target.value });
              }}
            />
          </label>
          <button
            type="button"
            className="app-btn"
            onClick={() => setFilters({ status: "", stage: "", tag: "" })}
          >
            Clear
          </button>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className="app-input"
              style={{ maxWidth: 180 }}
              placeholder="Segment name"
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
            />
            <button
              type="button"
              className="app-btn app-btn-primary"
              onClick={async () => {
                if (!orgId || !segmentName.trim()) return;
                setError(null);
                const supabase = createClient();
                const { error: insertErr } = await supabase.from("saved_segments").upsert(
                  {
                    org_id: orgId,
                    name: segmentName.trim(),
                    filters,
                    created_by: userId,
                  },
                  { onConflict: "org_id,name" }
                );
                if (insertErr) {
                  setError(insertErr.message);
                  return;
                }
                setSegmentName("");
                load();
              }}
            >
              Save as segment
            </button>
          </div>
        </div>
      )}

      {segments.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="app-label">Segments</span>
          {segments.map((s) => (
            <button
              key={s.id}
              type="button"
              className="app-btn"
              style={
                activeSegmentId === s.id
                  ? { background: "var(--forest)", color: "#fff", borderColor: "var(--forest)" }
                  : undefined
              }
              onClick={() => {
                setActiveSegmentId(s.id);
                setPage(0);
                setShowFilter(true);
                setFilters({
                  status: s.filters.status || "",
                  stage: s.filters.stage || "",
                  tag: s.filters.tag || "",
                });
              }}
            >
              {s.name}
            </button>
          ))}
          {activeSegmentId && (
            <button
              type="button"
              className="app-btn"
              onClick={() => {
                setActiveSegmentId(null);
                setFilters({ status: "", stage: "", tag: "" });
              }}
            >
              Clear segment
            </button>
          )}
        </div>
      )}

      {selected.size > 0 && (
        <div className="bulk-bar">
          <span className="text-sm" style={{ fontWeight: 600 }}>
            {selected.size} selected
          </span>
          <select
            className="app-input"
            style={{ maxWidth: 200 }}
            value={bulkCampaignId}
            onChange={(e) => setBulkCampaignId(e.target.value)}
          >
            <option value="">Enroll in campaign…</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="app-btn app-btn-primary"
            disabled={!bulkCampaignId}
            onClick={bulkEnroll}
          >
            Enroll
          </button>
          <input
            className="app-input"
            style={{ maxWidth: 160 }}
            placeholder="Add tag"
            value={bulkTag}
            onChange={(e) => setBulkTag(e.target.value)}
          />
          <button type="button" className="app-btn" onClick={bulkAddTag}>
            Tag
          </button>
          <button type="button" className="app-btn" onClick={exportSelected}>
            Export CSV
          </button>
          {selected.size >= 2 && (
            <button type="button" className="app-btn" onClick={openMerge}>
              Merge
            </button>
          )}
          <button type="button" className="app-btn" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      {showCreate && (
        <div className="app-card p-5 space-y-3 max-w-md">
          <input
            className="app-input"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="app-input"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="app-input"
            placeholder="Company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
          <div className="flex gap-2">
            <button type="button" className="app-btn app-btn-primary" onClick={createContact}>
              Create
            </button>
            <button type="button" className="app-btn" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {csvPreview && (
        <div className="app-card p-5 space-y-3">
          <h3 className="app-section-title">CSV preview (first 50 rows)</h3>
          <div className="grid gap-2">
            {csvPreview.headers.map((h) => (
              <div key={h} className="flex items-center gap-2 text-sm">
                <span className="w-40 truncate" style={{ fontWeight: 600 }}>
                  {h}
                </span>
                <select
                  className="app-input"
                  style={{ maxWidth: 160 }}
                  value={csvPreview.mapping[h]}
                  onChange={(e) =>
                    setCsvPreview({
                      ...csvPreview,
                      mapping: { ...csvPreview.mapping, [h]: e.target.value },
                    })
                  }
                >
                  <option value="skip">skip</option>
                  <option value="name">name</option>
                  <option value="email">email</option>
                  <option value="phone">phone</option>
                  <option value="company">company</option>
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" className="app-btn app-btn-primary" onClick={commitCsv}>
              Commit import
            </button>
            <button type="button" className="app-btn" onClick={() => setCsvPreview(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {importErrors && (
        <div className="app-card p-4">
          <p className="text-sm mb-2" style={{ color: "var(--signal-red)", fontWeight: 600 }}>
            Some rows failed — download error CSV
          </p>
          <a
            className="app-btn"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(importErrors)}`}
            download="import-errors.csv"
          >
            Download errors
          </a>
        </div>
      )}

      <div className="app-card overflow-hidden">
        <table className="app-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  checked={
                    pageRows.length > 0 && pageRows.every((c) => selected.has(c.id))
                  }
                  onChange={toggleSelectAllPage}
                />
              </th>
              <th>Name</th>
              <th>Company</th>
              <th>Value</th>
              <th>Stage</th>
              <th>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((c) => (
              <tr
                key={c.id}
                className="cursor-pointer"
                onClick={() => setInspectorId(c.id)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                  />
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <span className="avatar-circle">{initials(c.name)}</span>
                    <div>
                      <Link
                        href={`/app/contacts/${c.id}`}
                        style={{ fontWeight: 600 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {c.name}
                      </Link>
                      {c.email &&
                        duplicateEmails.has(c.email.trim().toLowerCase()) && (
                          <div>
                            <span className="status-pill status-pill-red" style={{ marginTop: 4 }}>
                              Possible duplicate
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                </td>
                <td>{c.company || "—"}</td>
                <td className="font-data">
                  {(c.deal_value || 0).toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  })}
                </td>
                <td>
                  <span className="inline-flex items-center gap-2">
                    <span className={stageClass(c.stage_name)} />
                    {c.stage_name || "—"}
                  </span>
                </td>
                <td className="text-meta">
                  {formatActivity(c.updated_at)}
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={6}>
                  <div className="empty-inline">
                    <div className="empty-inline-icon">
                      <Users size={20} strokeWidth={1.5} />
                    </div>
                    <p className="empty-row" style={{ marginBottom: 4 }}>No contacts yet.</p>
                    <button
                      type="button"
                      className="app-btn app-btn-primary"
                      style={{ marginTop: 8 }}
                      onClick={() => setShowCreate(true)}
                    >
                      <Plus size={14} /> Add Contact
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div
          className="flex items-center justify-between px-4 h-12 border-t text-sm text-meta"
          style={{ borderColor: "var(--border)" }}
        >
          <span>
            Showing {filtered.length ? page * PAGE_SIZE + 1 : 0}-
            {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} contacts
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              className="pagination-btn"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="pagination-btn"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-meta">
        Tip: click a row to inspect, or open the name for full detail.{" "}
        <Link href="/app/settings/email" className="underline">
          Connect Gmail
        </Link>
      </p>

      {mergeOpen && (
        <div className="modal-backdrop" onClick={() => setMergeOpen(false)}>
          <div className="modal-card space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="app-section-title">Merge contacts</h2>
            <p className="text-sm text-meta">
              Pick which contact to keep. Deals, tasks, activities, and tags from the others
              move onto the kept contact. Duplicate campaign enrollments are skipped.
            </p>
            <div className="space-y-2">
              {selectedContacts.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 app-card p-3 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="merge-keep"
                    checked={mergeKeepId === c.id}
                    onChange={() => setMergeKeepId(c.id)}
                  />
                  <span>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    {c.email && (
                      <span className="font-data text-xs text-meta" style={{ marginLeft: 8 }}>
                        {c.email}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="app-btn app-btn-primary"
                disabled={!mergeKeepId || merging}
                onClick={runMerge}
              >
                {merging ? "Merging…" : "Merge"}
              </button>
              <button type="button" className="app-btn" onClick={() => setMergeOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ContactInspector
        contactId={inspectorId}
        onClose={() => setInspectorId(null)}
        onSaved={load}
      />
    </div>
  );
}
