import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_POINTS: Record<string, number> = {
  form_submit: 10,
  open: 1,
  click: 3,
  reply: 5,
};

export async function getScoringPoints(
  supabase: SupabaseClient,
  orgId: string,
  eventType: string
): Promise<number | null> {
  const { data } = await supabase
    .from("scoring_rules")
    .select("points, enabled")
    .eq("org_id", orgId)
    .eq("event_type", eventType)
    .maybeSingle();

  if (data) {
    if (!data.enabled) return null;
    return data.points;
  }
  return DEFAULT_POINTS[eventType] ?? null;
}

export async function insertScoringEvent(
  supabase: SupabaseClient,
  opts: { orgId: string; contactId: string; eventType: string }
) {
  const points = await getScoringPoints(supabase, opts.orgId, opts.eventType);
  if (points === null) return { error: null as null, skipped: true };

  const { error } = await supabase.from("scoring_events").insert({
    org_id: opts.orgId,
    contact_id: opts.contactId,
    event_type: opts.eventType,
    points,
  });
  return { error, skipped: false };
}
