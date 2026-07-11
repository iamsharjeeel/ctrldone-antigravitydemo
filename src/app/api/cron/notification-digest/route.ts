import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendViaAccount } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("org_id, user_id")
    .eq("channel", "email_digest")
    .eq("enabled", true);

  let sent = 0;
  let skipped = 0;

  for (const pref of prefs || []) {
    const { data: unread } = await admin
      .from("notifications")
      .select("id, title, body, created_at")
      .eq("org_id", pref.org_id)
      .eq("user_id", pref.user_id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!unread?.length) {
      skipped++;
      continue;
    }

    const { data: userData } = await admin.auth.admin.getUserById(pref.user_id);
    const to = userData?.user?.email;
    if (!to) {
      skipped++;
      continue;
    }

    const { data: account } = await admin
      .from("email_accounts")
      .select(
        "id, org_id, provider, from_email, access_token_encrypted, refresh_token_encrypted, token_expires_at, status"
      )
      .eq("org_id", pref.org_id)
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();

    if (!account) {
      skipped++;
      continue;
    }

    const lines = unread
      .map(
        (n) =>
          `<li><strong>${escapeHtml(n.title)}</strong>${
            n.body ? ` — ${escapeHtml(n.body)}` : ""
          }</li>`
      )
      .join("");
    const body = `<p>You have ${unread.length} unread notification(s):</p><ul>${lines}</ul>`;

    const result = await sendViaAccount({
      account: account as {
        id: string;
        org_id: string;
        provider: "google" | "microsoft";
        from_email: string;
        access_token_encrypted: string | null;
        refresh_token_encrypted: string | null;
        token_expires_at: string | null;
        status: string;
      },
      to,
      subject: `CTRLDONE daily digest (${unread.length})`,
      body,
    });

    if (result.ok) sent++;
    else skipped++;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
