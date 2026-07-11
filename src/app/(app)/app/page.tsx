import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/org";
import Link from "next/link";
import { LineChart } from "lucide-react";

export default async function DashboardPage() {
  const ctx = await getMembership();
  const supabase = await createClient();

  if (!ctx?.org) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <LineChart size={22} strokeWidth={1.5} />
        </div>
        <h1 className="app-page-title">No organization yet.</h1>
        <p className="app-page-sub" style={{ maxWidth: 420 }}>
          Organization bootstrap failed. Check the banner above or sign out and try again.
        </p>
      </div>
    );
  }

  const orgId = ctx.org.id;

  const [{ count: contactCount }, { data: accounts }, { data: campaigns }] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId),
      supabase
        .from("email_accounts")
        .select("id, from_email, status")
        .eq("org_id", orgId),
      supabase
        .from("campaigns")
        .select("id, name, status")
        .eq("org_id", orgId)
        .eq("status", "paused"),
    ]);

  const needsReauth = (accounts || []).filter((a) => a.status === "needs_reauth");
  const empty = !contactCount;

  if (empty) {
    return (
      <div>
        {(needsReauth.length > 0 || (campaigns || []).length > 0) && (
          <div className="app-error-banner" style={{ marginBottom: 24 }}>
            <span>
              {needsReauth.length > 0 && (
                <>
                  Email needs reauth: {needsReauth.map((a) => a.from_email).join(", ")}.{" "}
                  <Link href="/app/settings/email" className="underline">
                    Fix in settings
                  </Link>
                </>
              )}
              {(campaigns || []).length > 0 && (
                <> Paused campaigns: {(campaigns || []).map((c) => c.name).join(", ")}</>
              )}
            </span>
          </div>
        )}
        <div className="empty-state">
          <div className="empty-icon">
            <LineChart size={22} strokeWidth={1.5} />
          </div>
          <h1 className="app-page-title">No sales activity yet.</h1>
          <p className="app-page-sub" style={{ maxWidth: 440, marginTop: 12, lineHeight: 1.6 }}>
            Your pipeline is currently clear. Start building your momentum by adding your first
            prospect to the system.
          </p>
          <Link href="/app/contacts?new=1" className="app-btn app-btn-primary" style={{ marginTop: 24 }}>
            + Add your first lead
          </Link>
        </div>
      </div>
    );
  }

  const [{ data: deals }, { data: tasks }] = await Promise.all([
    supabase
      .from("deals")
      .select("id, title, value, currency, stage_id, pipeline_stages(name)")
      .eq("org_id", orgId)
      .limit(8),
    supabase
      .from("tasks")
      .select("id, title, due_at, status")
      .eq("org_id", orgId)
      .eq("status", "open")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(8),
  ]);

  const pipelineValue = (deals || []).reduce((sum, d) => sum + Number(d.value || 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="app-page-title">Dashboard</h1>
        <p className="app-page-sub">{ctx.org.name} · pipeline snapshot</p>
      </div>

      {(needsReauth.length > 0 || (campaigns || []).length > 0) && (
        <div className="app-error-banner">
          <span>
            {needsReauth.length > 0 && (
              <>
                Email needs reauth: {needsReauth.map((a) => a.from_email).join(", ")}.{" "}
                <Link href="/app/settings/email">Fix in settings</Link>
              </>
            )}
            {(campaigns || []).length > 0 && (
              <> Paused: {(campaigns || []).map((c) => c.name).join(", ")}</>
            )}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="app-card p-5">
          <div className="app-label">Open pipeline value</div>
          <div className="app-stat-value font-data mt-2">
            {pipelineValue.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            })}
          </div>
        </div>
        <div className="app-card p-5">
          <div className="app-label">Contacts</div>
          <div className="app-stat-value font-data mt-2">{contactCount ?? 0}</div>
        </div>
        <div className="app-card p-5">
          <div className="app-label">Open tasks</div>
          <div className="app-stat-value font-data mt-2">{tasks?.length ?? 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="app-card overflow-hidden">
          <div className="app-card-header">Recent deals</div>
          <table className="app-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Stage</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {(deals || []).map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/app/deals/${d.id}`}>{d.title}</Link>
                  </td>
                  <td>
                    <span className="status-pill status-pill-blue">
                      {(d.pipeline_stages as { name?: string } | null)?.name || "—"}
                    </span>
                  </td>
                  <td className="font-data">
                    {Number(d.value).toLocaleString(undefined, {
                      style: "currency",
                      currency: d.currency || "USD",
                      maximumFractionDigits: 0,
                    })}
                  </td>
                </tr>
              ))}
              {!deals?.length && (
                <tr>
                  <td colSpan={3} className="empty-row">
                    No deals yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="app-card overflow-hidden">
          <div className="app-card-header">Due tasks</div>
          <table className="app-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {(tasks || []).map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href="/app/tasks">{t.title}</Link>
                  </td>
                  <td className="font-data">
                    {t.due_at ? new Date(t.due_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {!tasks?.length && (
                <tr>
                  <td colSpan={2} className="empty-row">
                    No open tasks
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
