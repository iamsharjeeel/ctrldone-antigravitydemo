import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), v];
    })
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

function planFromPrice(priceId: string | undefined): {
  plan: "trial" | "starter" | "pro";
  seat_limit: number;
} {
  if (priceId && process.env.STRIPE_PRICE_PRO && priceId === process.env.STRIPE_PRICE_PRO) {
    return { plan: "pro", seat_limit: 25 };
  }
  if (
    priceId &&
    process.env.STRIPE_PRICE_STARTER &&
    priceId === process.env.STRIPE_PRICE_STARTER
  ) {
    return { plan: "starter", seat_limit: 10 };
  }
  return { plan: "starter", seat_limit: 10 };
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (secret) {
    if (!verifyStripeSignature(raw, sig, secret)) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
    }
  }

  let event: {
    type: string;
    data?: { object?: Record<string, unknown> };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const admin = createAdminClient();
  const obj = (event.data?.object || {}) as Record<string, unknown>;

  if (event.type === "checkout.session.completed") {
    const orgId = String(
      (obj.metadata as Record<string, string> | undefined)?.org_id || ""
    );
    const customerId = String(obj.customer || "");
    const subscriptionId = String(obj.subscription || "");
    if (orgId) {
      await admin.from("subscriptions").upsert(
        {
          org_id: orgId,
          stripe_customer_id: customerId || null,
          stripe_subscription_id: subscriptionId || null,
          plan: "starter",
          seat_limit: 10,
          status: "active",
        },
        { onConflict: "org_id" }
      );
    }
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscriptionId = String(obj.id || "");
    const customerId = String(obj.customer || "");
    const statusRaw = String(obj.status || "");
    const items = obj.items as
      | { data?: { price?: { id?: string } }[] }
      | undefined;
    const priceId = items?.data?.[0]?.price?.id;
    const { plan, seat_limit } = planFromPrice(priceId);
    const status =
      event.type === "customer.subscription.deleted"
        ? "canceled"
        : statusRaw === "active"
          ? "active"
          : statusRaw === "past_due"
            ? "past_due"
            : statusRaw === "trialing"
              ? "trialing"
              : "canceled";

    const { data: existing } = await admin
      .from("subscriptions")
      .select("id, org_id")
      .or(
        `stripe_subscription_id.eq.${subscriptionId},stripe_customer_id.eq.${customerId}`
      )
      .limit(1)
      .maybeSingle();

    if (existing) {
      await admin
        .from("subscriptions")
        .update({
          stripe_subscription_id: subscriptionId || null,
          stripe_customer_id: customerId || null,
          plan,
          seat_limit,
          status,
        })
        .eq("id", existing.id);
    }
  }

  return NextResponse.json({ received: true });
}
