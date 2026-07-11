"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { createClient } from "@/lib/supabase/client";
import type { Campaign, CampaignStep, EmailAccount } from "@/lib/types";

export default function CampaignBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [steps, setSteps] = useState<CampaignStep[]>([]);
  const [view, setView] = useState<"list" | "canvas">("list");
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [enrollIds, setEnrollIds] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [stats, setStats] = useState({
    enrolled: 0,
    sent: 0,
    failed: 0,
    opened: 0,
    clicked: 0,
    replied: 0,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const locked = campaign?.status === "active";

  const loadStats = useCallback(async (orgId: string, campaignId: string) => {
    const supabase = createClient();
    const { data: enrollments } = await supabase
      .from("campaign_enrollments")
      .select("id, contact_id")
      .eq("campaign_id", campaignId);
    const enrollmentIds = (enrollments || []).map((e) => e.id);
    const contactIds = Array.from(
      new Set((enrollments || []).map((e) => e.contact_id).filter(Boolean))
    );

    let sent = 0;
    let failed = 0;
    if (enrollmentIds.length) {
      const { count: sentCount } = await supabase
        .from("campaign_sends")
        .select("id", { count: "exact", head: true })
        .in("enrollment_id", enrollmentIds)
        .eq("status", "sent");
      const { count: failedCount } = await supabase
        .from("campaign_sends")
        .select("id", { count: "exact", head: true })
        .in("enrollment_id", enrollmentIds)
        .eq("status", "failed");
      sent = sentCount || 0;
      failed = failedCount || 0;
    }

    let opened = 0;
    let clicked = 0;
    let replied = 0;
    if (contactIds.length) {
      const { data: events } = await supabase
        .from("scoring_events")
        .select("event_type")
        .eq("org_id", orgId)
        .in("contact_id", contactIds)
        .in("event_type", ["open", "click", "reply"]);
      for (const ev of events || []) {
        if (ev.event_type === "open") opened += 1;
        if (ev.event_type === "click") clicked += 1;
        if (ev.event_type === "reply") replied += 1;
      }

      const { count: openActs } = await supabase
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("type", "email_opened")
        .filter("meta->>campaign_id", "eq", campaignId);
      if ((openActs || 0) > opened) opened = openActs || 0;
    }

    setStats({
      enrolled: enrollments?.length || 0,
      sent,
      failed,
      opened,
      clicked,
      replied,
    });
  }, []);

  const syncCanvas = (list: CampaignStep[]) => {
    setNodes(
      list.map((s, i) => ({
        id: s.id,
        position: { x: s.canvas_x || i * 220, y: s.canvas_y || 40 },
        data: { label: `${s.position + 1}. ${s.type}` },
        style: {
          border: "1px solid var(--border)",
          borderRadius: 7,
          background: "var(--surface)",
          color: "var(--text)",
          fontSize: 12,
          padding: 8,
          width: 160,
        },
      }))
    );
    const eds: Edge[] = [];
    list.forEach((s) => {
      if (s.next_step_id) {
        eds.push({
          id: `${s.id}-${s.next_step_id}`,
          source: s.id,
          target: s.next_step_id,
        });
      }
    });
    setEdges(eds);
  };

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: c } = await supabase.from("campaigns").select("*").eq("id", id).single();
    setCampaign(c as Campaign);
    const { data: s } = await supabase
      .from("campaign_steps")
      .select("*")
      .eq("campaign_id", id)
      .order("position");
    const list = (s as CampaignStep[]) || [];
    setSteps(list);
    syncCanvas(list);

    if (c) {
      const { data: acc } = await supabase
        .from("email_accounts")
        .select("id, org_id, provider, from_email, status")
        .eq("org_id", c.org_id);
      setAccounts((acc as EmailAccount[]) || []);
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("id, name")
        .eq("org_id", c.org_id)
        .limit(100);
      setContacts(contactsData || []);
      await loadStats(c.org_id, id);
    }
  }, [id, loadStats]);

  useEffect(() => {
    load();
  }, [load]);

  const persistAudit = async (before: unknown, after: unknown) => {
    if (!campaign) return;
    const supabase = createClient();
    await supabase.from("audit_log").insert({
      org_id: campaign.org_id,
      action: "campaign_steps_edit",
      entity_type: "campaign",
      entity_id: campaign.id,
      before,
      after,
    });
  };

  const addStep = async (type: CampaignStep["type"]) => {
    if (!campaign || locked) return;
    const supabase = createClient();
    const before = steps;
    const position = steps.length;
    const config =
      type === "wait"
        ? { duration_hours: 24 }
        : type === "email"
          ? { subject: "Hello {{first_name}}", body: "<p>Hi {{first_name}},</p>" }
          : type === "sms"
            ? { body: "Hi {{first_name}}" }
            : { stub: true };

    const { data } = await supabase
      .from("campaign_steps")
      .insert({
        org_id: campaign.org_id,
        campaign_id: campaign.id,
        type,
        config,
        position,
        canvas_x: position * 220,
        canvas_y: 40,
      })
      .select("*")
      .single();

    if (data && steps.length) {
      const prev = steps[steps.length - 1];
      await supabase
        .from("campaign_steps")
        .update({ next_step_id: data.id })
        .eq("id", prev.id);
    }
    await persistAudit(before, [...steps, data]);
    load();
  };

  const updateStepConfig = async (stepId: string, config: Record<string, unknown>) => {
    if (locked) return;
    const supabase = createClient();
    await supabase.from("campaign_steps").update({ config }).eq("id", stepId);
    await persistAudit(steps, { stepId, config });
    load();
  };

  const setStatus = async (status: Campaign["status"]) => {
    if (!campaign) return;
    const supabase = createClient();

    if (status === "active") {
      if (!campaign.email_account_id) {
        setMsg("Select a send-from account first.");
        return;
      }
      const { data: acc } = await supabase
        .from("email_accounts")
        .select("status")
        .eq("id", campaign.email_account_id)
        .single();
      if (!acc || acc.status !== "connected") {
        setMsg("Email account health check failed — connect or reauth.");
        return;
      }
    }

    if (status === "active" && campaign.status === "paused") {
      const { data: enrollments } = await supabase
        .from("campaign_enrollments")
        .select("id, current_step_id")
        .eq("campaign_id", campaign.id)
        .in("status", ["pending", "waiting", "processing"]);
      const stepIds = new Set(steps.map((s) => s.id));
      for (const e of enrollments || []) {
        if (e.current_step_id && !stepIds.has(e.current_step_id)) {
          await supabase
            .from("campaign_enrollments")
            .update({
              current_step_id: steps[0]?.id || null,
              status: "pending",
              next_run_at: new Date().toISOString(),
            })
            .eq("id", e.id);
        }
      }
    }

    await supabase.from("campaigns").update({ status }).eq("id", campaign.id);
    setMsg(`Status → ${status}`);
    load();
  };

  const saveAccount = async (accountId: string) => {
    if (!campaign) return;
    const supabase = createClient();
    await supabase
      .from("campaigns")
      .update({ email_account_id: accountId })
      .eq("id", campaign.id);
    load();
  };

  const enroll = async () => {
    if (!campaign || !enrollIds.length) return;
    const supabase = createClient();
    const first = steps[0];
    const rows = enrollIds.map((contact_id) => ({
      org_id: campaign.org_id,
      campaign_id: campaign.id,
      contact_id,
      current_step_id: first?.id || null,
      next_run_at: new Date().toISOString(),
      status: "pending" as const,
    }));
    await supabase.from("campaign_enrollments").upsert(rows, {
      onConflict: "campaign_id,contact_id",
    });
    setMsg(`Enrolled ${rows.length} contacts`);
    await loadStats(campaign.org_id, campaign.id);
  };

  const onNodeDragStop = async (_: unknown, node: Node) => {
    if (locked) return;
    const supabase = createClient();
    await supabase
      .from("campaign_steps")
      .update({ canvas_x: node.position.x, canvas_y: node.position.y })
      .eq("id", node.id);
  };

  const smsEnabled = Boolean(
    process.env.NEXT_PUBLIC_TWILIO_ENABLED === "1" ||
      process.env.TWILIO_ACCOUNT_SID
  );

  if (!campaign) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <Link href="/app/campaigns" className="text-sm" style={{ color: "var(--text-muted)" }}>
        ← Campaigns
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium">{campaign.name}</h1>
          <span
            className={`status-pill mt-2 inline-flex ${
              campaign.status === "active"
                ? "status-pill-lime"
                : campaign.status === "paused"
                  ? "status-pill-red"
                  : "status-pill-blue"
            }`}
          >
            {campaign.status}
          </span>
          {locked && (
            <p className="text-xs mt-2" style={{ color: "var(--signal-red)" }}>
              Active campaigns are locked — pause to edit steps.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`app-btn ${view === "list" ? "app-btn-primary" : ""}`} onClick={() => setView("list")}>
            List
          </button>
          <button type="button" className={`app-btn ${view === "canvas" ? "app-btn-primary" : ""}`} onClick={() => setView("canvas")}>
            Canvas
          </button>
          {campaign.status !== "active" && (
            <button type="button" className="app-btn app-btn-primary" onClick={() => setStatus("active")}>
              Activate
            </button>
          )}
          {campaign.status === "active" && (
            <button type="button" className="app-btn" onClick={() => setStatus("paused")}>
              Pause
            </button>
          )}
          {campaign.status === "paused" && (
            <button type="button" className="app-btn app-btn-primary" onClick={() => setStatus("active")}>
              Resume
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {(
          [
            ["Enrolled", stats.enrolled],
            ["Sent", stats.sent],
            ["Failed", stats.failed],
            ["Opened", stats.opened],
            ["Clicked", stats.clicked],
            ["Replied", stats.replied],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="app-card p-4">
            <div className="app-label">{label}</div>
            <div className="app-stat-value font-data mt-2">{value}</div>
          </div>
        ))}
      </div>

      <div className="app-card p-4 flex flex-wrap gap-3 items-end">
        <label className="text-xs" style={{ color: "var(--text-muted)" }}>
          Send from
          <select
            className="app-input mt-1"
            style={{ minWidth: 220 }}
            value={campaign.email_account_id || ""}
            onChange={(e) => saveAccount(e.target.value)}
            disabled={locked}
          >
            <option value="">Select account…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.from_email} ({a.status})
              </option>
            ))}
          </select>
        </label>
        {!locked && (
          <>
            <button type="button" className="app-btn" onClick={() => addStep("email")}>
              + Email
            </button>
            <button type="button" className="app-btn" onClick={() => addStep("wait")}>
              + Wait
            </button>
            <button
              type="button"
              className="app-btn"
              onClick={() => addStep("sms")}
              title={smsEnabled ? "SMS" : "SMS UI available — set Twilio env to enable send"}
            >
              + SMS
            </button>
          </>
        )}
      </div>

      {view === "list" && (
        <div className="space-y-3">
          {steps.map((s) => (
            <div key={s.id} className="app-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-data text-xs" style={{ color: "var(--text-muted)" }}>
                  {String(s.position + 1).padStart(2, "0")}
                </span>
                <span className="status-pill status-pill-blue">{s.type}</span>
              </div>
              {s.type === "email" && (
                <div className="space-y-2">
                  <input
                    className="app-input"
                    disabled={locked}
                    value={String(s.config.subject || "")}
                    onChange={(e) =>
                      updateStepConfig(s.id, { ...s.config, subject: e.target.value })
                    }
                    placeholder="Subject"
                  />
                  <textarea
                    className="app-input"
                    style={{ height: 80, paddingTop: 8 }}
                    disabled={locked}
                    value={String(s.config.body || "")}
                    onChange={(e) =>
                      updateStepConfig(s.id, { ...s.config, body: e.target.value })
                    }
                  />
                </div>
              )}
              {s.type === "wait" && (
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Duration hours
                  <input
                    className="app-input mt-1 font-data"
                    type="number"
                    disabled={locked}
                    value={Number(s.config.duration_hours || 24)}
                    onChange={(e) =>
                      updateStepConfig(s.id, {
                        ...s.config,
                        duration_hours: Number(e.target.value),
                      })
                    }
                  />
                </label>
              )}
              {s.type === "sms" && (
                <div className="space-y-1">
                  <textarea
                    className="app-input"
                    style={{ height: 64, paddingTop: 8 }}
                    disabled={locked}
                    value={String(s.config.body || "")}
                    onChange={(e) =>
                      updateStepConfig(s.id, { ...s.config, body: e.target.value })
                    }
                    placeholder="SMS body — {{first_name}} supported"
                  />
                  <p className="text-xs font-data" style={{ color: "var(--text-muted)" }}>
                    {String(s.config.body || "").length}/160
                    {String(s.config.body || "").length > 160 ? " (multi-segment)" : ""}
                  </p>
                </div>
              )}
              {s.type === "condition" && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Condition stub — not evaluated in Phase 1
                </p>
              )}
            </div>
          ))}
          {!steps.length && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No steps yet
            </p>
          )}
        </div>
      )}

      {view === "canvas" && (
        <div className="app-card" style={{ height: 420 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            fitView
            nodesDraggable={!locked}
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      )}

      <div className="app-card p-4 space-y-2">
        <h2 className="text-sm font-medium">Enroll contacts</h2>
        <select
          multiple
          className="app-input"
          style={{ height: 120 }}
          value={enrollIds}
          onChange={(e) =>
            setEnrollIds(Array.from(e.target.selectedOptions).map((o) => o.value))
          }
        >
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="button" className="app-btn app-btn-primary" onClick={enroll}>
          Enroll selected
        </button>
      </div>

      {msg && (
        <p className="text-xs font-data" style={{ color: "var(--signal-lime)" }}>
          {msg}
        </p>
      )}
    </div>
  );
}
