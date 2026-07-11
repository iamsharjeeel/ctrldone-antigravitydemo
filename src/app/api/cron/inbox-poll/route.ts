import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccessToken, markNeedsReauth } from "@/lib/email/send";
import { insertScoringEvent } from "@/lib/scoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EmailAccount = {
  id: string;
  org_id: string;
  provider: "google" | "microsoft";
  from_email: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  status: string;
  last_synced_at: string | null;
};

type GmailHeader = { name: string; value: string };

type GmailMessage = {
  id: string;
  threadId?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailHeader[];
    parts?: { mimeType?: string; body?: { data?: string } }[];
    body?: { data?: string };
  };
  snippet?: string;
};

function headerValue(headers: GmailHeader[] | undefined, name: string) {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function normalizeMessageId(raw: string) {
  return raw.replace(/^<|>$/g, "").trim().toLowerCase();
}

function extractMessageIds(raw: string): string[] {
  if (!raw) return [];
  const matches = raw.match(/<[^>]+>/g);
  if (matches?.length) return matches.map(normalizeMessageId).filter(Boolean);
  return [normalizeMessageId(raw)].filter(Boolean);
}

function isBounceMessage(from: string, subject: string) {
  const fromL = from.toLowerCase();
  const subjectL = subject.toLowerCase();
  return (
    fromL.includes("mailer-daemon") ||
    fromL.includes("mail delivery subsystem") ||
    fromL.includes("postmaster") ||
    subjectL.includes("delivery status notification") ||
    subjectL.includes("undeliverable") ||
    subjectL.includes("delivery failure") ||
    subjectL.includes("returned mail")
  );
}

function extractEmails(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  return (matches || []).map((e) => e.toLowerCase());
}

function decodeBodySnippet(msg: GmailMessage): string {
  const parts = msg.payload?.parts || [];
  for (const part of parts) {
    if (part.body?.data) {
      try {
        return Buffer.from(part.body.data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
          "utf8"
        );
      } catch {
        /* ignore */
      }
    }
  }
  if (msg.payload?.body?.data) {
    try {
      return Buffer.from(
        msg.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
      ).toString("utf8");
    } catch {
      /* ignore */
    }
  }
  return msg.snippet || "";
}

async function listRecentMessages(
  token: string,
  afterEpochSec: number
): Promise<{ id: string }[]> {
  const q = `in:inbox after:${afterEpochSec}`;
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", "40");
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("needs_reauth");
  if (!res.ok) throw new Error(await res.text());
  const json = (await res.json()) as { messages?: { id: string }[] };
  return json.messages || [];
}

async function getMessage(token: string, id: string): Promise<GmailMessage> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (res.status === 401) throw new Error("needs_reauth");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: accounts } = await admin
    .from("email_accounts")
    .select("*")
    .eq("provider", "google")
    .eq("status", "connected");

  let replies = 0;
  let bounces = 0;
  let scanned = 0;
  let errors = 0;

  for (const account of (accounts || []) as EmailAccount[]) {
    const syncedAt = new Date().toISOString();
    try {
      const token = await getAccessToken(account);
      const afterSec = account.last_synced_at
        ? Math.floor(new Date(account.last_synced_at).getTime() / 1000) - 60
        : Math.floor(Date.now() / 1000) - 60 * 60 * 24;

      const listed = await listRecentMessages(token, afterSec);

      for (const item of listed) {
        scanned++;
        let msg: GmailMessage;
        try {
          msg = await getMessage(token, item.id);
        } catch {
          errors++;
          continue;
        }

        const headers = msg.payload?.headers || [];
        const from = headerValue(headers, "From");
        const subject = headerValue(headers, "Subject");
        const inReplyTo = headerValue(headers, "In-Reply-To");
        const references = headerValue(headers, "References");
        const refIds = [
          ...extractMessageIds(inReplyTo),
          ...extractMessageIds(references),
        ];
        const uniqueRefIds = [...new Set(refIds)];

        const { data: already } = await admin
          .from("activities")
          .select("id")
          .eq("org_id", account.org_id)
          .contains("meta", { provider_inbox_message_id: msg.id })
          .limit(1)
          .maybeSingle();
        if (already) continue;

        if (isBounceMessage(from, subject)) {
          const bodyText = decodeBodySnippet(msg);
          const candidateEmails = extractEmails(`${from} ${subject} ${bodyText}`).filter(
            (e) => e !== account.from_email.toLowerCase()
          );

          let matchedSend: {
            id: string;
            enrollment_id: string;
            org_id: string;
          } | null = null;

          if (uniqueRefIds.length) {
            const { data: byMsg } = await admin
              .from("campaign_sends")
              .select("id, enrollment_id, org_id, provider_message_id")
              .eq("org_id", account.org_id)
              .in("provider_message_id", uniqueRefIds)
              .limit(1)
              .maybeSingle();
            if (byMsg) matchedSend = byMsg;
          }

          if (!matchedSend && msg.threadId) {
            const { data: byThread } = await admin
              .from("campaign_sends")
              .select("id, enrollment_id, org_id")
              .eq("org_id", account.org_id)
              .eq("provider_thread_id", msg.threadId)
              .limit(1)
              .maybeSingle();
            if (byThread) matchedSend = byThread;
          }

          let contactId: string | null = null;
          let bounceEmail: string | null = candidateEmails[0] || null;

          if (matchedSend) {
            const { data: enrollment } = await admin
              .from("campaign_enrollments")
              .select("contact_id")
              .eq("id", matchedSend.enrollment_id)
              .maybeSingle();
            contactId = enrollment?.contact_id || null;
            if (contactId) {
              const { data: contact } = await admin
                .from("contacts")
                .select("email")
                .eq("id", contactId)
                .maybeSingle();
              if (contact?.email) bounceEmail = contact.email.toLowerCase();
            }

            await admin
              .from("campaign_sends")
              .update({ status: "failed", error: `bounce: ${subject || "undeliverable"}` })
              .eq("id", matchedSend.id);
          }

          if (bounceEmail) {
            const { data: existingSupp } = await admin
              .from("suppression_list")
              .select("id")
              .eq("org_id", account.org_id)
              .ilike("email", bounceEmail)
              .maybeSingle();
            if (!existingSupp) {
              await admin.from("suppression_list").insert({
                org_id: account.org_id,
                contact_id: contactId,
                email: bounceEmail,
                reason: "bounce",
              });
            }

            if (contactId) {
              await admin.from("activities").insert({
                org_id: account.org_id,
                contact_id: contactId,
                type: "system",
                body: `Email bounced: ${bounceEmail}`,
                meta: {
                  provider_inbox_message_id: msg.id,
                  bounce: true,
                  subject,
                },
              });
            }
            bounces++;
          }
          continue;
        }

        if (!uniqueRefIds.length && !msg.threadId) continue;

        let send: {
          id: string;
          enrollment_id: string;
          org_id: string;
          provider_message_id: string | null;
          provider_thread_id: string | null;
        } | null = null;

        if (uniqueRefIds.length) {
          const { data } = await admin
            .from("campaign_sends")
            .select("id, enrollment_id, org_id, provider_message_id, provider_thread_id")
            .eq("org_id", account.org_id)
            .in("provider_message_id", uniqueRefIds)
            .limit(1)
            .maybeSingle();
          if (data) send = data;
        }

        if (!send && msg.threadId) {
          const { data } = await admin
            .from("campaign_sends")
            .select("id, enrollment_id, org_id, provider_message_id, provider_thread_id")
            .eq("org_id", account.org_id)
            .eq("provider_thread_id", msg.threadId)
            .limit(1)
            .maybeSingle();
          if (data) send = data;
        }

        if (!send) continue;

        const { data: enrollment } = await admin
          .from("campaign_enrollments")
          .select("contact_id")
          .eq("id", send.enrollment_id)
          .maybeSingle();
        if (!enrollment?.contact_id) continue;

        const { data: dupReply } = await admin
          .from("activities")
          .select("id")
          .eq("org_id", account.org_id)
          .eq("contact_id", enrollment.contact_id)
          .eq("type", "email_replied")
          .contains("meta", { provider_inbox_message_id: msg.id })
          .limit(1)
          .maybeSingle();
        if (dupReply) continue;

        await admin.from("activities").insert({
          org_id: account.org_id,
          contact_id: enrollment.contact_id,
          type: "email_replied",
          body: subject || "Reply received",
          meta: {
            provider_inbox_message_id: msg.id,
            provider_thread_id: msg.threadId || null,
            campaign_send_id: send.id,
            from,
          },
        });

        await insertScoringEvent(admin, {
          orgId: account.org_id,
          contactId: enrollment.contact_id,
          eventType: "reply",
        });

        replies++;
      }

      await admin
        .from("email_accounts")
        .update({ last_synced_at: syncedAt })
        .eq("id", account.id);
    } catch (e) {
      errors++;
      const msg = e instanceof Error ? e.message : "inbox_poll_failed";
      if (msg.includes("reauth") || msg === "needs_reauth") {
        await markNeedsReauth(account.id, account.org_id);
      }
    }
  }

  return NextResponse.json({ ok: true, scanned, replies, bounces, errors });
}
