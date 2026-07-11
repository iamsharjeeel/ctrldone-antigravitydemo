import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/org";
import Link from "next/link";

type StageRow = {
  stage_id: string;
  stage_name: string;
  stage_position: number;
  deal_count: number;
  avg_days: number;
};

type RepRow = {
  user_id: string;
  deals_won: number;
  tasks_done: number;
};

export default async function ReportsPage() {
  const ctx = await getMembership();
  const supabase = await createClient();

  if (!ctx?.org) {
    return (
      <div className="empty-state">
        <h1 className="app-page-title">No organization yet.</h1>
      </div>
    );
  }

  const orgId = ctx.org.id;

  const { data: pipe } = await supabase
    .from("pipelines")
    .select("id, name")
    .eq("org_id", orgId)
    .eq("is_default", true)
    .maybeSingle();

  const pipelineId = pipe?.id;

  const [{ data: stages }, { data: reps }] = await Promise.all([
    pipelineId
      ? supabase.rpc("report_stage_conversion", {
          p_org_id: orgId,
          p_pipeline_id: pipelineId,
        })
      : Promise.resolve({ data: [] as StageRow[] }),
    supabase.rpc("report_rep_performance", { p_org_id: orgId }),
  ]);

  const stageRows = (stages || []) as StageRow[];
  const repRows = (reps || []) as RepRow[];
  const maxDays = Math.max(1, ...stageRows.map((s) => Number(s.avg_days) || 0));

  const memberIds = repRows.map((r) => r.user_id);
  const labels: Record<string, string> = {};
  for (const id of memberIds) {
    labels[id] = id.slice(0, 8);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="app-page-title">Reports</h1>
        <p className="app-page-sub">
          Pipeline velocity and rep performance
          {pipe ? ` · ${pipe.name}` : ""}.
        </p>
      </div>

      <div className="app-card" style={{ padding: 20 }}>
        <div className="app-label" style={{ marginBottom: 16 }}>
          Avg days in stage
        </div>
        {!stageRows.length && (
          <p className="empty-inline">No pipeline stages to report.</p>
        )}
        <div className="space-y-3">
          {stageRows.map((s) => {
            const days = Number(s.avg_days) || 0;
            const pct = Math.round((days / maxDays) * 100);
            return (
              <div key={s.stage_id}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span style={{ fontWeight: 600 }}>{s.stage_name}</span>
                  <span className="font-data text-meta">
                    {days}d · {s.deal_count} deals
                  </span>
                </div>
                <div
                  style={{
                    height: 10,
                    borderRadius: "var(--radius-pill)",
                    background: "var(--surface-2)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      borderRadius: "var(--radius-pill)",
                      background: "var(--forest)",
                      minWidth: days > 0 ? 4 : 0,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="app-card overflow-hidden">
        <div className="app-label" style={{ padding: "16px 20px 8px" }}>
          Rep performance (this month)
        </div>
        <table className="app-table dense">
          <thead>
            <tr>
              <th>Rep</th>
              <th>Deals won</th>
              <th>Tasks done</th>
            </tr>
          </thead>
          <tbody>
            {repRows.map((r) => (
              <tr key={r.user_id}>
                <td className="font-data">{labels[r.user_id]}</td>
                <td className="font-data">{r.deals_won}</td>
                <td className="font-data">{r.tasks_done}</td>
              </tr>
            ))}
            {!repRows.length && (
              <tr>
                <td colSpan={3} className="empty-row">
                  No wins or completed tasks this month.{" "}
                  <Link href="/app/pipelines">Open pipeline</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
