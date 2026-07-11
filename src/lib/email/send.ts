import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

type Account = {
  id: string;
  org_id: string;
  provider: "google" | "microsoft";
  from_email: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  status: string;
};

async function refreshGoogle(account: Account): Promise<string> {
  if (!account.refresh_token_encrypted) throw new Error("No refresh token");
  const refresh = decryptSecret(account.refresh_token_encrypted);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("google_reauth");
  const json = await res.json();
  const admin = createAdminClient();
  await admin
    .from("email_accounts")
    .update({
      access_token_encrypted: encryptSecret(json.access_token),
      token_expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
      status: "connected",
    })
    .eq("id", account.id);
  return json.access_token as string;
}

async function refreshMicrosoft(account: Account): Promise<string> {
  if (!account.refresh_token_encrypted) throw new Error("No refresh token");
  const refresh = decryptSecret(account.refresh_token_encrypted);
  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: refresh,
        grant_type: "refresh_token",
        scope: "https://graph.microsoft.com/Mail.Send offline_access",
      }),
    }
  );
  if (!res.ok) throw new Error("microsoft_reauth");
  const json = await res.json();
  const admin = createAdminClient();
  await admin
    .from("email_accounts")
    .update({
      access_token_encrypted: encryptSecret(json.access_token),
      refresh_token_encrypted: json.refresh_token
        ? encryptSecret(json.refresh_token)
        : account.refresh_token_encrypted,
      token_expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
      status: "connected",
    })
    .eq("id", account.id);
  return json.access_token as string;
}

export async function getAccessToken(account: Account): Promise<string> {
  const expired =
    !account.token_expires_at ||
    new Date(account.token_expires_at).getTime() < Date.now() + 60_000;
  if (!expired && account.access_token_encrypted) {
    return decryptSecret(account.access_token_encrypted);
  }
  if (account.provider === "google") return refreshGoogle(account);
  return refreshMicrosoft(account);
}

async function fetchGmailMessageMeta(
  token: string,
  messageId: string
): Promise<{ rfcMessageId?: string; threadId?: string }> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Message-ID`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return {};
  const json = (await res.json()) as {
    threadId?: string;
    payload?: { headers?: { name: string; value: string }[] };
  };
  const raw = json.payload?.headers?.find(
    (h) => h.name.toLowerCase() === "message-id"
  )?.value;
  const rfcMessageId = raw?.replace(/^<|>$/g, "").trim();
  return { rfcMessageId, threadId: json.threadId };
}

export async function markNeedsReauth(accountId: string, orgId: string) {
  const admin = createAdminClient();
  await admin
    .from("email_accounts")
    .update({ status: "needs_reauth" })
    .eq("id", accountId);
  await admin
    .from("campaigns")
    .update({ status: "paused" })
    .eq("org_id", orgId)
    .eq("email_account_id", accountId)
    .eq("status", "active");
}

export async function sendViaAccount(opts: {
  account: Account;
  to: string;
  subject: string;
  body: string;
}): Promise<
  | { ok: true; id?: string; threadId?: string }
  | { ok: false; reauth: boolean; error: string }
> {
  try {
    const token = await getAccessToken(opts.account);
    if (opts.account.provider === "google") {
      const raw = [
        `From: ${opts.account.from_email}`,
        `To: ${opts.to}`,
        `Subject: ${opts.subject}`,
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=utf-8",
        "",
        opts.body,
      ].join("\r\n");
      const encoded = Buffer.from(raw)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const res = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: encoded }),
        }
      );
      if (res.status === 401) {
        await markNeedsReauth(opts.account.id, opts.account.org_id);
        return { ok: false, reauth: true, error: "needs_reauth" };
      }
      if (!res.ok) {
        return { ok: false, reauth: false, error: await res.text() };
      }
      const json = (await res.json()) as { id?: string; threadId?: string };
      let id = json.id;
      let threadId = json.threadId;
      if (json.id) {
        const meta = await fetchGmailMessageMeta(token, json.id);
        if (meta.rfcMessageId) id = meta.rfcMessageId;
        if (meta.threadId) threadId = meta.threadId;
      }
      return { ok: true, id, threadId };
    }

    const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: opts.subject,
          body: { contentType: "HTML", content: opts.body },
          toRecipients: [{ emailAddress: { address: opts.to } }],
        },
        saveToSentItems: true,
      }),
    });
    if (res.status === 401) {
      await markNeedsReauth(opts.account.id, opts.account.org_id);
      return { ok: false, reauth: true, error: "needs_reauth" };
    }
    if (!res.ok) {
      return { ok: false, reauth: false, error: await res.text() };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "send_failed";
    if (msg.includes("reauth")) {
      await markNeedsReauth(opts.account.id, opts.account.org_id);
      return { ok: false, reauth: true, error: msg };
    }
    return { ok: false, reauth: false, error: msg };
  }
}

export function applyMergeTags(
  template: string,
  contact: { name?: string | null; email?: string | null; company?: string | null }
) {
  const first = (contact.name || "").split(" ")[0] || "";
  return template
    .replaceAll("{{first_name}}", first)
    .replaceAll("{{name}}", contact.name || "")
    .replaceAll("{{email}}", contact.email || "")
    .replaceAll("{{company}}", contact.company || "");
}
