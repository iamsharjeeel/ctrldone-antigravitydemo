import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyMergeTags, sendViaAccount } from "@/lib/email/send";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { accountId, contactId, subject, html } = body as {
    accountId: string;
    contactId: string;
    subject: string;
    html: string;
  };

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();
  if (!contact?.email) {
    return NextResponse.json({ error: "contact_email_missing" }, { status: 400 });
  }

  const { data: suppressed } = await supabase
    .from("suppression_list")
    .select("id")
    .eq("org_id", contact.org_id)
    .ilike("email", contact.email)
    .maybeSingle();
  if (suppressed) {
    return NextResponse.json({ error: "suppressed" }, { status: 400 });
  }

  const { data: account } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("id", accountId)
    .single();
  if (!account || account.status === "needs_reauth") {
    return NextResponse.json({ error: "account_unavailable" }, { status: 400 });
  }

  const result = await sendViaAccount({
    account,
    to: contact.email,
    subject: applyMergeTags(subject, contact),
    body: applyMergeTags(html, contact),
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  await supabase.from("activities").insert({
    org_id: contact.org_id,
    contact_id: contact.id,
    actor_id: user.id,
    type: "email_sent",
    body: subject,
    meta: { provider_message_id: result.id },
  });

  return NextResponse.json({ ok: true, id: result.id });
}
