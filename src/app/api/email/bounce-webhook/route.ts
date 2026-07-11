import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  const bounceSecret = process.env.BOUNCE_WEBHOOK_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  if (bounceSecret && secret === bounceSecret) return true;
  if (cronSecret && secret === cronSecret) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { email?: string; org_id?: string; reason?: string; contact_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }

  const reason = body.reason === "complaint" ? "bounce" : body.reason || "bounce";
  if (!["unsubscribe", "bounce", "manual"].includes(reason)) {
    return NextResponse.json({ error: "invalid_reason" }, { status: 400 });
  }

  const admin = createAdminClient();
  let orgId = body.org_id || null;

  if (!orgId) {
    const { data: contact } = await admin
      .from("contacts")
      .select("id, org_id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();
    if (!contact) {
      return NextResponse.json({ error: "org_id_required" }, { status: 400 });
    }
    orgId = contact.org_id;
    body.contact_id = body.contact_id || contact.id;
  }

  const { data: existing } = await admin
    .from("suppression_list")
    .select("id")
    .eq("org_id", orgId)
    .ilike("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, already: true });
  }

  const { error } = await admin.from("suppression_list").insert({
    org_id: orgId,
    contact_id: body.contact_id || null,
    email,
    reason,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
