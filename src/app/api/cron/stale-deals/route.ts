import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: orgs } = await admin.from("orgs").select("id, stale_deal_days");
  let created = 0;

  for (const org of orgs || []) {
    const cutoff = new Date(
      Date.now() - (org.stale_deal_days || 14) * 86400_000
    ).toISOString();
    const { data: deals } = await admin
      .from("deals")
      .select("id, title, contact_id, owner_id")
      .eq("org_id", org.id)
      .lt("stage_entered_at", cutoff)
      .limit(100);

    for (const deal of deals || []) {
      const { data: existing } = await admin
        .from("tasks")
        .select("id")
        .eq("deal_id", deal.id)
        .eq("status", "open")
        .ilike("title", "Stale deal%")
        .maybeSingle();
      if (existing) continue;

      await admin.from("tasks").insert({
        org_id: org.id,
        title: `Stale deal: ${deal.title}`,
        deal_id: deal.id,
        contact_id: deal.contact_id,
        assignee_id: deal.owner_id,
        status: "open",
        due_at: new Date().toISOString(),
      });
      created++;
    }
  }

  return NextResponse.json({ ok: true, created });
}
