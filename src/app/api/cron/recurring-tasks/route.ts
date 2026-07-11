import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function nextDue(from: Date, rule: string): Date {
  const d = new Date(from);
  if (rule === "daily") d.setDate(d.getDate() + 1);
  else if (rule === "weekly") d.setDate(d.getDate() + 7);
  else if (rule === "monthly") d.setMonth(d.getMonth() + 1);
  return d;
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: done } = await admin
    .from("tasks")
    .select(
      "id, org_id, title, due_at, assignee_id, contact_id, deal_id, priority, task_type, recurrence_rule"
    )
    .eq("status", "done")
    .not("recurrence_rule", "is", null)
    .limit(200);

  let created = 0;

  for (const task of done || []) {
    if (!task.recurrence_rule) continue;

    const { data: child } = await admin
      .from("tasks")
      .select("id")
      .eq("parent_task_id", task.id)
      .limit(1)
      .maybeSingle();
    if (child) continue;

    const base = task.due_at ? new Date(task.due_at) : new Date();
    const due = nextDue(base, task.recurrence_rule);

    const { error } = await admin.from("tasks").insert({
      org_id: task.org_id,
      title: task.title,
      due_at: due.toISOString(),
      assignee_id: task.assignee_id,
      contact_id: task.contact_id,
      deal_id: task.deal_id,
      priority: task.priority || "normal",
      task_type: task.task_type,
      recurrence_rule: task.recurrence_rule,
      parent_task_id: task.id,
      status: "open",
    });
    if (!error) created++;
  }

  return NextResponse.json({ ok: true, created });
}
