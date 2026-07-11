import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe not configured. Set STRIPE_SECRET_KEY." },
      { status: 501 }
    );
  }
  if (!process.env.STRIPE_PRICE_STARTER && !process.env.STRIPE_PRICE_PRO) {
    return NextResponse.json(
      { error: "Set STRIPE_PRICE_STARTER or STRIPE_PRICE_PRO." },
      { status: 501 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = body.plan === "pro" ? "pro" : "starter";
  const priceId =
    plan === "pro"
      ? process.env.STRIPE_PRICE_PRO
      : process.env.STRIPE_PRICE_STARTER;
  if (!priceId) {
    return NextResponse.json({ error: `No price for plan ${plan}` }, { status: 501 });
  }

  const { data: mem } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!mem || !["owner", "admin"].includes(mem.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("*")
    .eq("org_id", mem.org_id)
    .maybeSingle();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("success_url", `${appUrl}/app/settings/billing?checkout=success`);
  params.set("cancel_url", `${appUrl}/app/settings/billing?checkout=cancel`);
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("client_reference_id", mem.org_id);
  params.set("metadata[org_id]", mem.org_id);
  if (sub?.stripe_customer_id) {
    params.set("customer", sub.stripe_customer_id);
  } else if (user.email) {
    params.set("customer_email", user.email);
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const json = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { error: json.error?.message || "checkout_failed" },
      { status: 400 }
    );
  }
  return NextResponse.json({ url: json.url, id: json.id });
}
