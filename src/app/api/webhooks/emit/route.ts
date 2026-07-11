import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dispatchWebhook, type WebhookEvent } from "@/lib/webhooks";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const orgId = String(body.orgId || "");
  const event = body.event as WebhookEvent;
  const payload = (body.payload || {}) as Record<string, unknown>;

  if (!orgId || !event) {
    return NextResponse.json({ error: "orgId and event required" }, { status: 400 });
  }

  const { data: mem } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!mem) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await dispatchWebhook(orgId, event, payload);
  return NextResponse.json({ ok: true });
}
