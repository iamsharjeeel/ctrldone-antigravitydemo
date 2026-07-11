import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `cd_${randomBytes(32).toString("hex")}`;
  return { raw, prefix: raw.slice(0, 12), hash: hashApiKey(raw) };
}

export async function verifyApiKey(
  bearer: string | null
): Promise<{ orgId: string; keyId: string } | null> {
  if (!bearer) return null;
  const raw = bearer.replace(/^Bearer\s+/i, "").trim();
  if (!raw) return null;
  const hash = hashApiKey(raw);
  const admin = createAdminClient();
  const { data } = await admin
    .from("api_keys")
    .select("id, org_id, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();
  if (!data || data.revoked_at) return null;
  await admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return { orgId: data.org_id as string, keyId: data.id as string };
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function signWebhookPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}
