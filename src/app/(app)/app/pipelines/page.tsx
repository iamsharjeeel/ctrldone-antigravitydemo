"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ErrorBanner from "@/components/app/ErrorBanner";
import { Filter, Plus, X } from "lucide-react";

type Stage = { id: string; name: string; position: number };
type ContactOpt = { id: string; name: string; company: string | null };
type Deal = {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage_id: string;
  contact_id: string | null;
  expected_close: string | null;
  stage_entered_at: string | null;
  contacts?: { name?: string; company?: string | null } | null;
};

function daysInStage(entered: string | null) {
  if (!entered) return null;
  const ms = Date.now() - new Date(entered).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export default function PipelinesPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<ContactOpt[]>([]);
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [pipelineName, setPipelineName] = useState("Pipeline");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [staleDays, setStaleDays] = useState(14);
  const [showNew, setShowNew] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [form, setForm] = useState({ title: "", value: "0", contact_id: "" });
  const [filters, setFilters] = useState({
    minValue: "",
    hasContact: false,
    staleOnly: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const load = useCallback(async () => {
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

    const { data: org } = await supabase
      .from("orgs")
      .select("stale_deal_days")
      .eq("id", mem.org_id)
      .maybeSingle();
    if (org?.stale_deal_days) setStaleDays(org.stale_deal_days);

    const { data: pipes, error: pipeErr } = await supabase
      .from("pipelines")
      .select("id, name, is_default")
      .eq("org_id", mem.org_id)
      .order("is_default", { ascending: false });
    if (pipeErr) {
      setError(pipeErr.message);
      return;
    }
    const pipe = pipes?.[0];
    if (!pipe) {
      setError("No pipeline found. Re-run org bootstrap.");
      return;
    }
    setPipelineId(pipe.id);
    setPipelineName(pipe.name);

    const { data: st } = await supabase
      .from("pipeline_stages")
      .select("id, name, position")
      .eq("pipeline_id", pipe.id)
      .order("position");
    setStages((st || []).filter((s) => s.name.toLowerCase() !== "lost"));

    const { data: d, error: dealErr } = await supabase
      .from("deals")
      .select(
        "id, title, value, currency, stage_id, contact_id, expected_close, stage_entered_at, contacts(name, company)"
      )
      .eq("pipeline_id", pipe.id);
    if (dealErr) {
      setError(dealErr.message);
      return;
    }
    setDeals((d as Deal[]) || []);

    const { data: c } = await supabase
      .from("contacts")
      .select("id, name, company")
      .eq("org_id", mem.org_id)
      .order("name")
      .limit(200);
    setContacts((c as ContactOpt[]) || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredDeals = useMemo(() => {
    const min = Number(filters.minValue) || 0;
    return deals.filter((d) => {
      if (min && Number(d.value || 0) < min) return false;
      if (filters.hasContact && !d.contact_id) return false;
      if (filters.staleOnly) {
        const days = daysInStage(d.stage_entered_at);
        if (days === null || days < staleDays) return false;
      }
      return true;
    });
  }, [deals, filters, staleDays]);

  const moveDeal = async (dealId: string, stageId: string) => {
    const supabase = createClient();
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || !orgId) return;
    setError(null);
    const before = { stage_id: deal.stage_id };
    const { error: updateErr } = await supabase
      .from("deals")
      .update({ stage_id: stageId, stage_entered_at: new Date().toISOString() })
      .eq("id", dealId);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    const { error: actErr } = await supabase.from("activities").insert({
      org_id: orgId,
      deal_id: dealId,
      contact_id: deal.contact_id,
      type: "stage_change",
      body: "Moved to stage",
      meta: { from: deal.stage_id, to: stageId },
    });
    if (actErr) {
      setError(actErr.message);
      return;
    }
    await supabase.from("audit_log").insert({
      org_id: orgId,
      action: "stage_change",
      entity_type: "deal",
      entity_id: dealId,
      before,
      after: { stage_id: stageId },
    });
    load();
  };

  const createDeal = async () => {
    if (!orgId || !pipelineId || !stages[0] || !form.title.trim()) return;
    setError(null);
    const supabase = createClient();
    const { error: insertErr } = await supabase.from("deals").insert({
      org_id: orgId,
      pipeline_id: pipelineId,
      stage_id: stages[0].id,
      title: form.title.trim(),
      value: Number(form.value) || 0,
      contact_id: form.contact_id || null,
    });
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setForm({ title: "", value: "0", contact_id: "" });
    setShowNew(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="app-page-title">{pipelineName} Pipeline</h1>
          <p className="app-page-sub">Showing all active deals. Last updated just now.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="app-btn"
            onClick={() => setShowFilter((v) => !v)}
          >
            <Filter size={14} /> Filter
          </button>
          <button
            type="button"
            className="app-btn app-btn-primary"
            onClick={() => setShowNew(true)}
          >
            <Plus size={14} /> New Deal
          </button>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {showFilter && (
        <div className="app-card p-5 space-y-3 max-w-lg">
          <div className="flex items-center justify-between">
            <h2 className="app-section-title">Filters</h2>
            <button type="button" className="top-nav-icon" onClick={() => setShowFilter(false)}>
              <X size={16} />
            </button>
          </div>
          <input
            className="app-input"
            type="number"
            placeholder="Min value"
            value={filters.minValue}
            onChange={(e) => setFilters({ ...filters, minValue: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm" style={{ fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={filters.hasContact}
              onChange={(e) => setFilters({ ...filters, hasContact: e.target.checked })}
            />
            Has contact linked
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={filters.staleOnly}
              onChange={(e) => setFilters({ ...filters, staleOnly: e.target.checked })}
            />
            Stale only ({staleDays}+ days in stage)
          </label>
          <button
            type="button"
            className="app-btn"
            onClick={() => setFilters({ minValue: "", hasContact: false, staleOnly: false })}
          >
            Clear
          </button>
        </div>
      )}

      {showNew && (
        <div className="app-card p-5 space-y-3 max-w-md">
          <input
            className="app-input"
            placeholder="Deal title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="app-input"
            placeholder="Value"
            type="number"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />
          <select
            className="app-input"
            value={form.contact_id}
            onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
          >
            <option value="">No contact</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` · ${c.company}` : ""}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="button" className="app-btn app-btn-primary" onClick={createDeal}>
              Create
            </button>
            <button type="button" className="app-btn" onClick={() => setShowNew(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="kanban-board">
        {stages.map((stage) => {
          const column = filteredDeals.filter((d) => d.stage_id === stage.id);
          const total = column.reduce((s, d) => s + Number(d.value || 0), 0);
          const isWon = stage.name.toLowerCase() === "won";
          return (
            <div
              key={stage.id}
              className={`kanban-col${dragOverStage === stage.id ? " drag-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverStage !== stage.id) setDragOverStage(stage.id);
              }}
              onDragLeave={() => setDragOverStage((s) => (s === stage.id ? null : s))}
              onDrop={(e) => {
                setDragOverStage(null);
                const id = e.dataTransfer.getData("text/deal-id");
                if (id) moveDeal(id, stage.id);
              }}
            >
              <div className="kanban-col-head">
                <span className="kanban-col-title">
                  {stage.name} {column.length}
                </span>
                <span
                  className={`kanban-col-meta${isWon ? " kanban-col-meta--won" : ""}`}
                >
                  {total.toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div>
                {column.map((deal) => {
                  const days = daysInStage(deal.stage_entered_at);
                  return (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/deal-id", deal.id)}
                      className={`deal-card${isWon ? " deal-card--won" : ""}`}
                    >
                      <div className="flex items-center gap-2 deal-card-meta mb-2">
                        <span
                          className={isWon ? "stage-dot stage-dot-won" : "stage-dot"}
                        />
                        {deal.contacts?.company || "—"}
                      </div>
                      <Link href={`/app/deals/${deal.id}`} className="deal-card-title">
                        {deal.title}
                      </Link>
                      {deal.contacts?.name && (
                        <div className="deal-card-meta">{deal.contacts.name}</div>
                      )}
                      <div className="deal-card-value font-data">
                        {Number(deal.value).toLocaleString(undefined, {
                          style: "currency",
                          currency: deal.currency || "USD",
                          maximumFractionDigits: 0,
                        })}
                      </div>
                      <div className="deal-card-footer">
                        <span>
                          Close{" "}
                          {deal.expected_close
                            ? new Date(deal.expected_close).toLocaleDateString()
                            : "—"}
                        </span>
                        <span>{days !== null ? `${days}d in stage` : "—"}</span>
                      </div>
                    </div>
                  );
                })}
                {!column.length && (
                  <div className="kanban-empty">No deals in this stage</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
