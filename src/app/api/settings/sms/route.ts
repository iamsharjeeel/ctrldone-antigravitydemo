import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto";

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
  const accountSid = String(body.account_sid || "").trim();
  const authToken = String(body.auth_token || "").trim();
  const fromNumber = String(body.from_number || "").trim();

  if (!accountSid || !fromNumber) {
    return NextResponse.json(
      { error: "account_sid and from_number required" },
      { status: 400 }
    );
  }

  const { data: mem } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!mem || !["owner", "admin"].includes(mem.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("sms_accounts")
    .select("id, auth_token_encrypted")
    .eq("org_id", mem.org_id)
    .maybeSingle();

  if (!authToken && !existing) {
    return NextResponse.json({ error: "auth_token required" }, { status: 400 });
  }

  const row = {
    org_id: mem.org_id,
    provider: "twilio" as const,
    account_sid: accountSid,
    auth_token_encrypted: authToken
      ? encryptSecret(authToken)
      : (existing!.auth_token_encrypted as string),
    from_number: fromNumber,
  };

  const { data, error } = await supabase
    .from("sms_accounts")
    .upsert(row, { onConflict: "org_id" })
    .select("id, org_id, provider, account_sid, from_number")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data: mem } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!mem || !["owner", "admin"].includes(mem.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { error } = await supabase
    .from("sms_accounts")
    .delete()
    .eq("org_id", mem.org_id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
