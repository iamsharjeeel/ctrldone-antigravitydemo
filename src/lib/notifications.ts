import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateNotificationInput = {
  orgId: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
};

export async function createNotification(
  supabase: SupabaseClient,
  input: CreateNotificationInput
) {
  const { error } = await supabase.from("notifications").insert({
    org_id: input.orgId,
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
  });
  return { error };
}
