import { createAdminClient } from "@/lib/supabase/admin";
import { signWebhookPayload } from "@/lib/api-auth";

export type WebhookEvent =
  | "contact.created"
  | "deal.stage_changed"
  | "deal.created";

export async function dispatchWebhook(
  orgId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  try {
    const admin = createAdminClient();
    const { data: subs } = await admin
      .from("webhook_subscriptions")
      .select("id, url, secret, event_types, enabled")
      .eq("org_id", orgId)
      .eq("enabled", true);

    for (const sub of subs || []) {
      const types = (sub.event_types as string[]) || [];
      if (types.length && !types.includes(event)) continue;
      const body = JSON.stringify({
        event,
        org_id: orgId,
        created_at: new Date().toISOString(),
        data: payload,
      });
      const signature = signWebhookPayload(sub.secret as string, body);
      void fetch(sub.url as string, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CTRLDONE-Signature": signature,
          "X-CTRLDONE-Event": event,
        },
        body,
      }).catch(() => {});
    }
  } catch {
    return;
  }
}
