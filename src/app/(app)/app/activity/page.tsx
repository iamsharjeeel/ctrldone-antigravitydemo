"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ErrorBanner from "@/components/app/ErrorBanner";
import ActivityComments from "@/components/app/ActivityComments";
import { ArrowRight, Clock3 } from "lucide-react";

type Activity = {
  id: string;
  type: string;
  body: string | null;
  created_at: string;
  contact_id: string | null;
  deal_id: string | null;
  contacts?: { name?: string } | null;
};

export default function ActivityPage() {
  const [items, setItems] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openTaskCount, setOpenTaskCount] = useState(0);
  const [orgId, setOrgId] = useState<string | null>(null);

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

    const { data, error: loadErr } = await supabase
      .from("activities")
      .select("id, type, body, created_at, contact_id, deal_id, contacts(name)")
      .eq("org_id", mem.org_id)
      .order("created_at", { ascending: false })
      .limit(80);
    if (loadErr) {
      setError(loadErr.message);
      return;
    }
    setItems((data as Activity[]) || []);

    const { count } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("org_id", mem.org_id)
      .eq("assignee_id", user.id)
      .eq("status", "open");
    setOpenTaskCount(count || 0);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="app-page-title">Activity</h1>
        <p className="app-page-sub">Recent timeline across contacts and deals.</p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 app-card p-6">
          <h2 className="app-section-title" style={{ marginBottom: 20 }}>
            Timeline
          </h2>
          <div className="timeline">
            {items.map((a) => (
              <div key={a.id} className="timeline-item">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span
                    className={
                      a.type === "email_replied"
                        ? "status-pill status-pill-blue"
                        : undefined
                    }
                    style={
                      a.type === "email_replied"
                        ? undefined
                        : { fontWeight: 600, textTransform: "capitalize" }
                    }
                  >
                    {a.type.replace(/_/g, " ")}
                  </span>
                  {a.contacts?.name && (
                    <Link
                      href={a.contact_id ? `/app/contacts/${a.contact_id}` : "#"}
                      className="text-sm"
                      style={{ color: "var(--forest)", fontWeight: 600 }}
                    >
                      {a.contacts.name}
                    </Link>
                  )}
                  <span className="text-xs text-meta">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
                {a.body && <p className="mt-2 text-sm text-meta">{a.body}</p>}
                {orgId && <ActivityComments activityId={a.id} orgId={orgId} />}
              </div>
            ))}
            {!items.length && (
              <div className="empty-inline">
                <div className="empty-inline-icon">
                  <Clock3 size={20} strokeWidth={1.5} />
                </div>
                <p className="empty-row">No activity yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="app-card p-5 space-y-4">
          <div className="app-label">My tasks</div>
          <div className="app-stat-value font-data">{openTaskCount}</div>
          <p className="text-sm text-meta">
            open task{openTaskCount === 1 ? "" : "s"} assigned to you.
          </p>
          <Link href="/app/tasks" className="app-btn app-btn-primary" style={{ width: "100%" }}>
            Open Tasks <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
