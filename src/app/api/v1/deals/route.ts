import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchWebhook } from "@/lib/webhooks";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await verifyApiKey(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 50), 100);
  const { data, error } = await admin
    .from("deals")
    .select(
      "id, title, value, currency, stage_id, pipeline_id, contact_id, owner_id, expected_close, created_at"
    )
    .eq("org_id", auth.orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiKey(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const title = String(body.title || "").trim();
  const stageId = String(body.stage_id || "").trim();
  const pipelineId = String(body.pipeline_id || "").trim();
  if (!title || !stageId || !pipelineId) {
    return NextResponse.json(
      { error: "title, stage_id, and pipeline_id required" },
      { status: 400 }
    );
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("deals")
    .insert({
      org_id: auth.orgId,
      title,
      stage_id: stageId,
      pipeline_id: pipelineId,
      value: body.value != null ? Number(body.value) : 0,
      currency: body.currency ? String(body.currency) : "USD",
      contact_id: body.contact_id || null,
      owner_id: body.owner_id || null,
    })
    .select(
      "id, title, value, currency, stage_id, pipeline_id, contact_id, owner_id, created_at"
    )
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await dispatchWebhook(auth.orgId, "deal.created", { deal: data });
  return NextResponse.json({ data }, { status: 201 });
}
