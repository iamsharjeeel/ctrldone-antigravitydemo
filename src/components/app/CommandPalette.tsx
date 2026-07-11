"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string; email: string | null }[]>([]);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || !q.trim()) {
      setHits([]);
      return;
    }
    const run = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("contacts")
        .select("id, name, email")
        .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(8);
      setHits(data || []);
    };
    run();
  }, [q, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="app-card w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          className="app-input"
          style={{ border: "none", height: 44, borderRadius: 0 }}
          placeholder="Jump to contact, or type a command…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul>
          <li>
            <button
              type="button"
              className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-hover)]"
              onClick={() => {
                router.push("/app/activity");
                setOpen(false);
              }}
            >
              Create task → Activity
            </button>
          </li>
          <li>
            <button
              type="button"
              className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-hover)]"
              onClick={() => {
                router.push("/app/campaigns");
                setOpen(false);
              }}
            >
              Enroll in campaign → Campaigns
            </button>
          </li>
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-hover)]"
                onClick={() => {
                  router.push(`/app/contacts/${h.id}`);
                  setOpen(false);
                }}
              >
                {h.name}{" "}
                <span className="font-data text-xs" style={{ color: "var(--text-muted)" }}>
                  {h.email}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
