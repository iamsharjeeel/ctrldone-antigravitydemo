"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SettingsSubnav from "@/components/app/SettingsSubnav";
import ErrorBanner from "@/components/app/ErrorBanner";

type Availability = {
  days: number[];
  start: string;
  end: string;
};

const DAY_LABELS: { n: number; label: string }[] = [
  { n: 1, label: "Mon" },
  { n: 2, label: "Tue" },
  { n: 3, label: "Wed" },
  { n: 4, label: "Thu" },
  { n: 5, label: "Fri" },
  { n: 6, label: "Sat" },
  { n: 7, label: "Sun" },
];

export default function BookingSettingsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [pageId, setPageId] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [duration, setDuration] = useState(30);
  const [availability, setAvailability] = useState<Availability>({
    days: [1, 2, 3, 4, 5],
    start: "09:00",
    end: "18:00",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
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
      setOrgId(mem.org_id);
      const { data: page } = await supabase
        .from("booking_pages")
        .select("id, slug, duration_minutes, availability")
        .eq("org_id", mem.org_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (page) {
        setPageId(page.id);
        setSlug(page.slug);
        setDuration(page.duration_minutes);
        const a = page.availability as Availability;
        setAvailability({
          days: a?.days || [1, 2, 3, 4, 5],
          start: String(a?.start || "09:00").slice(0, 5),
          end: String(a?.end || "18:00").slice(0, 5),
        });
      } else {
        const base = (user.email || "me").split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "-");
        setSlug(base || "me");
      }
    };
    load();
  }, []);

  const toggleDay = (n: number) => {
    setAvailability((prev) => {
      const has = prev.days.includes(n);
      const days = has ? prev.days.filter((d) => d !== n) : [...prev.days, n].sort();
      return { ...prev, days };
    });
  };

  const save = async () => {
    if (!orgId || !userId) return;
    setError(null);
    setSaved(false);
    const cleanSlug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!cleanSlug) {
      setError("Slug is required.");
      return;
    }
    if (availability.days.length === 0) {
      setError("Pick at least one available day.");
      return;
    }
    const supabase = createClient();
    const row = {
      org_id: orgId,
      user_id: userId,
      slug: cleanSlug,
      duration_minutes: duration,
      availability,
    };
    const { data, error: upsertErr } = pageId
      ? await supabase.from("booking_pages").update(row).eq("id", pageId).select("id, slug").single()
      : await supabase.from("booking_pages").insert(row).select("id, slug").single();
    if (upsertErr) {
      setError(upsertErr.message);
      return;
    }
    setPageId(data.id);
    setSlug(data.slug);
    setSaved(true);
  };

  const publicUrl = slug ? `${origin}/book/${slug}` : "";

  return (
    <div className="space-y-4 max-w-lg">
      <SettingsSubnav />
      <div>
        <h1 className="app-page-title">Booking link</h1>
        <p className="app-page-sub">
          Public scheduling page — guests pick a slot and land as contacts
        </p>
      </div>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <div className="app-card p-4 space-y-3">
        <label className="text-xs block" style={{ color: "var(--text-muted)" }}>
          Slug
          <input
            className="app-input mt-1 font-data"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="your-name"
          />
        </label>
        {publicUrl && (
          <p className="text-meta">
            Public URL:{" "}
            <a href={publicUrl} target="_blank" rel="noreferrer" style={{ color: "var(--signal-blue)" }}>
              {publicUrl}
            </a>
          </p>
        )}
        <label className="text-xs block" style={{ color: "var(--text-muted)" }}>
          Duration (minutes)
          <input
            className="app-input mt-1 font-data"
            type="number"
            min={5}
            max={480}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 30)}
          />
        </label>
        <div>
          <p className="field-label mb-2">Available days</p>
          <div className="segmented flex flex-wrap gap-2">
            {DAY_LABELS.map((d) => (
              <button
                key={d.n}
                type="button"
                className="segmented-btn"
                data-active={availability.days.includes(d.n)}
                onClick={() => toggleDay(d.n)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs block" style={{ color: "var(--text-muted)" }}>
            Hours start
            <input
              className="app-input mt-1 font-data"
              type="time"
              value={availability.start}
              onChange={(e) => setAvailability({ ...availability, start: e.target.value })}
            />
          </label>
          <label className="text-xs block" style={{ color: "var(--text-muted)" }}>
            Hours end
            <input
              className="app-input mt-1 font-data"
              type="time"
              value={availability.end}
              onChange={(e) => setAvailability({ ...availability, end: e.target.value })}
            />
          </label>
        </div>
        <button type="button" className="app-btn app-btn-primary" onClick={save}>
          Save
        </button>
        {saved && (
          <p className="text-xs" style={{ color: "var(--signal-lime)" }}>
            Saved
          </p>
        )}
      </div>
    </div>
  );
}
