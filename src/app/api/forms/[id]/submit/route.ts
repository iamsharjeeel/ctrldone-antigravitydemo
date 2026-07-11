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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const payload = body?.payload && typeof body.payload === "object" ? body.payload : body;

  if (!id) {
    return NextResponse.json({ error: "missing_form_id" }, { status: 400 });
  }

  const supabase = anonClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("submit_form", {
    p_form_id: id,
    p_payload: payload || {},
  });

  if (error) {
    const msg = error.message || "error";
    const status =
      msg.includes("form_not_found")
        ? 404
        : msg.includes("missing")
          ? 400
          : 500;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ ok: true, contactId: data });
}
