import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: "code",
    redirect_uri: `${appUrl}/api/oauth/microsoft/callback`,
    response_mode: "query",
    scope: "openid offline_access https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read",
    state: user.id,
  });

  return NextResponse.redirect(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`
  );
}
