import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(req: NextRequest) {
  const slug = String(req.nextUrl.searchParams.get("slug") || "").trim();
  if (!slug) {
    return NextResponse.json({ error: "missing_slug" }, { status: 400 });
  }
  const supabase = anonClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }
  const { data, error } = await supabase.rpc("get_booking_page", { p_slug: slug });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const slug = String(body.slug || "").trim();
  const guestName = String(body.guest_name || body.name || "").trim();
  const guestEmail = String(body.guest_email || body.email || "").trim().toLowerCase();
  const startAt = String(body.start_at || "").trim();

  if (!slug || !guestName || !guestEmail || !startAt) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const supabase = anonClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("create_booking", {
    p_slug: slug,
    p_guest_name: guestName,
    p_guest_email: guestEmail,
    p_start_at: startAt,
  });

  if (error) {
    const msg = error.message || "error";
    const status =
      msg.includes("slot_taken") || msg.includes("outside_availability") || msg.includes("slot_in_past")
        ? 409
        : msg.includes("page_not_found")
          ? 404
          : msg.includes("missing_fields") || msg.includes("suppressed")
            ? 400
            : 500;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ ok: true, bookingId: data });
}
