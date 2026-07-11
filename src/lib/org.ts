import { createClient } from "@/lib/supabase/server";

export async function getMembership() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role, orgs(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) return { user, membership: null, org: null };

  return {
    user,
    membership,
    org: membership.orgs as unknown as {
      id: string;
      name: string;
      default_timezone: string;
      business_hours_start: string;
      business_hours_end: string;
      business_days: number[];
      stale_deal_days: number;
    },
  };
}

export async function ensureOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { orgId: null as string | null, error: "Not signed in" };

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership?.org_id) {
    return { orgId: membership.org_id as string, error: null as string | null };
  }

  const tz = "UTC";
  const { data, error } = await supabase.rpc("bootstrap_ctrldone_org", {
    p_user_id: user.id,
    p_timezone: tz,
  });

  if (error) {
    return { orgId: null as string | null, error: error.message };
  }

  return { orgId: data as string, error: null as string | null };
}
