"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ErrorBanner from "@/components/app/ErrorBanner";
import SettingsSubnav from "@/components/app/SettingsSubnav";

type Sub = {
  plan: string;
  seat_limit: number;
  status: string;
  stripe_customer_id: string | null;
};

export default function BillingSettingsPage() {
  const [sub, setSub] = useState<Sub | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: mem } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!mem) {
      setError("No organization found.");
      return;
    }
    const { data, error: loadErr } = await supabase
      .from("subscriptions")
      .select("plan, seat_limit, status, stripe_customer_id")
      .eq("org_id", mem.org_id)
      .maybeSingle();
    if (loadErr) {
      setError(loadErr.message);
      return;
    }
    if (!data) {
      const { data: created } = await supabase
        .from("subscriptions")
        .insert({
          org_id: mem.org_id,
          plan: "trial",
          seat_limit: 3,
          status: "trialing",
        })
        .select("plan, seat_limit, status, stripe_customer_id")
        .single();
      setSub(created);
    } else {
      setSub(data);
    }
    const { count } = await supabase
      .from("org_members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", mem.org_id);
    setMemberCount(count || 0);
  };

  useEffect(() => {
    load();
  }, []);

  const checkout = async (plan: "starter" | "pro") => {
    setError(null);
    setMsg("");
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Checkout unavailable");
      return;
    }
    if (json.url) window.location.href = json.url;
  };

  const portal = async () => {
    setError(null);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Portal unavailable");
      return;
    }
    if (json.url) window.location.href = json.url;
  };

  return (
    <div className="space-y-6 max-w-lg">
      <SettingsSubnav />
      <div>
        <h1 className="app-page-title">Billing</h1>
        <p className="app-page-sub">Plan, seats, and Stripe customer portal</p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="app-card p-5 space-y-3">
        {sub ? (
          <>
            <div className="flex items-center gap-2">
              <span className="status-pill status-pill-blue">{sub.plan}</span>
              <span
                className={`status-pill ${
                  sub.status === "active" || sub.status === "trialing"
                    ? "status-pill-lime"
                    : "status-pill-red"
                }`}
              >
                {sub.status}
              </span>
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Seats:{" "}
              <span className="font-data">
                {memberCount} / {sub.seat_limit}
              </span>
            </p>
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Loading…
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            className="app-btn app-btn-primary"
            onClick={() => checkout("starter")}
          >
            Upgrade starter
          </button>
          <button type="button" className="app-btn" onClick={() => checkout("pro")}>
            Upgrade pro
          </button>
          <button type="button" className="app-btn" onClick={portal}>
            Manage billing
          </button>
        </div>
        {msg && (
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
