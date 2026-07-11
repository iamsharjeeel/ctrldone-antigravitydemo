import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  if (!code) return NextResponse.redirect(`${appUrl}/app/settings/email?error=missing_code`);

  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        code,
        redirect_uri: `${appUrl}/api/oauth/microsoft/callback`,
        grant_type: "authorization_code",
      }),
    }
  );
  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/app/settings/email?error=token`);
  }
  const tokens = await tokenRes.json();

  const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const me = await meRes.json();
  const email = me.mail || me.userPrincipalName;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  const { data: mem } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!mem) return NextResponse.redirect(`${appUrl}/app/settings/email?error=no_org`);

  await supabase.from("email_accounts").upsert(
    {
      org_id: mem.org_id,
      provider: "microsoft",
      from_email: email,
      access_token_encrypted: encryptSecret(tokens.access_token),
      refresh_token_encrypted: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token)
        : null,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      status: "connected",
      created_by: user.id,
    },
    { onConflict: "org_id,from_email" }
  );

  return NextResponse.redirect(`${appUrl}/app/settings/email?connected=microsoft`);
}
