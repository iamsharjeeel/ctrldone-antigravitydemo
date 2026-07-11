import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: membership } = await supabase
          .from("org_members")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (!membership) {
          const tz = "UTC";
          await supabase.rpc("bootstrap_ctrldone_org", {
            p_user_id: user.id,
            p_timezone: tz,
          });
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
