"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

type Booked = { start_at: string; end_at: string };
type PageData = {
  id: string;
  slug: string;
  duration_minutes: number;
  availability: { days?: number[]; start?: string; end?: string };
  org_name: string;
  booked: Booked[];
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseTime(t: string) {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export default function BookPage() {
  const params = useParams();
  const slug = String(params.slug || "");
  const [page, setPage] = useState<PageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  useEffect(() => {
    document.documentElement.setAttribute("data-shell", "login");
    document.documentElement.setAttribute("data-theme", "light");
    return () => {
      document.documentElement.removeAttribute("data-shell");
    };
  }, []);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/bookings?slug=${encodeURIComponent(slug)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "not_found");
        setPage(j);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [slug]);

  const day = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [dayOffset]);

  const slots = useMemo(() => {
    if (!page) return [];
    const days = page.availability?.days || [1, 2, 3, 4, 5];
    const isoDow = ((day.getDay() + 6) % 7) + 1;
    if (!days.includes(isoDow)) return [];
    const { h: sh, m: sm } = parseTime(page.availability?.start || "09:00");
    const { h: eh, m: em } = parseTime(page.availability?.end || "18:00");
    const duration = page.duration_minutes || 30;
    const booked = (page.booked || []).map((b) => ({
      start: new Date(b.start_at),
      end: new Date(b.end_at),
    }));
    const out: Date[] = [];
    const cursor = new Date(day);
    cursor.setHours(sh, sm, 0, 0);
    const endBound = new Date(day);
    endBound.setHours(eh, em, 0, 0);
    const now = new Date();
    while (cursor.getTime() + duration * 60000 <= endBound.getTime()) {
      const end = new Date(cursor.getTime() + duration * 60000);
      const taken = booked.some((b) => overlaps(cursor, end, b.start, b.end));
      if (!taken && cursor > now) out.push(new Date(cursor));
      cursor.setMinutes(cursor.getMinutes() + duration);
    }
    return out;
  }, [page, day]);

  const book = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !name.trim() || !email.trim()) return;
    setStatus("submitting");
    setError(null);
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          guest_name: name.trim(),
          guest_email: email.trim(),
          start_at: selected,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Booking failed");
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
      setStatus("idle");
    }
  };

  if (error && !page) {
    return (
      <div className="login-wrap">
        <Link href="/" className="login-brand">
          <Logo />
        </Link>
        <div className="login-card">
          <h1 className="login-title">Booking unavailable</h1>
          <p className="login-sub">{error}</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <p className="login-sub">Loading…</p>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="login-wrap">
        <Link href="/" className="login-brand">
          <Logo />
        </Link>
        <div className="login-card">
          <h1 className="login-title">You&apos;re booked</h1>
          <p className="login-sub">
            {new Date(selected!).toLocaleString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <Link href="/" className="login-brand">
        <Logo />
      </Link>
      <div className="login-card" style={{ maxWidth: 440 }}>
        <h1 className="login-title">Book with {page.org_name}</h1>
        <p className="login-sub">{page.duration_minutes}-minute meeting</p>

        <div className="login-row mt-6" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="login-btn-google"
            style={{ flex: 1, padding: "10px 12px" }}
            onClick={() => setDayOffset((d) => Math.max(0, d - 1))}
            disabled={dayOffset === 0}
          >
            ← Prev
          </button>
          <span className="text-sm" style={{ fontWeight: 600 }}>
            {day.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
          <button
            type="button"
            className="login-btn-google"
            style={{ flex: 1, padding: "10px 12px" }}
            onClick={() => setDayOffset((d) => d + 1)}
          >
            Next →
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            maxHeight: 220,
            overflowY: "auto",
            marginBottom: 16,
          }}
        >
          {slots.length === 0 && (
            <p className="login-sub" style={{ gridColumn: "1 / -1" }}>
              No open slots this day
            </p>
          )}
          {slots.map((s) => {
            const iso = s.toISOString();
            const active = selected === iso;
            return (
              <button
                key={iso}
                type="button"
                className={active ? "login-btn-primary" : "login-btn-google"}
                style={{ padding: "10px 8px", fontSize: 13 }}
                onClick={() => setSelected(iso)}
              >
                {s.toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </button>
            );
          })}
        </div>

        <form onSubmit={book} className="space-y-3">
          <input
            className="login-input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="login-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="login-btn-primary"
            disabled={!selected || status === "submitting"}
          >
            {status === "submitting" ? "…" : "Confirm booking →"}
          </button>
        </form>
        {error && (
          <p className="mt-3 text-sm" style={{ color: "#b91c1c" }}>
            {error}
          </p>
        )}
        <p className="login-footer" style={{ marginTop: 16 }}>
          {toLocalDateKey(day)}
        </p>
      </div>
    </div>
  );
}
