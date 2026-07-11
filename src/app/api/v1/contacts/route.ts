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
    .from("contacts")
    .select("id, name, email, phone, company, status, tags, source, owner_id, created_at")
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
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contacts")
    .insert({
      org_id: auth.orgId,
      name,
      email: body.email ? String(body.email).trim().toLowerCase() : null,
      phone: body.phone ? String(body.phone).trim() : null,
      company: body.company ? String(body.company).trim() : null,
      status: body.status ? String(body.status) : "lead",
      source: body.source ? String(body.source) : "api",
    })
    .select("id, name, email, phone, company, status, source, created_at")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await dispatchWebhook(auth.orgId, "contact.created", { contact: data });
  return NextResponse.json({ data }, { status: 201 });
}
