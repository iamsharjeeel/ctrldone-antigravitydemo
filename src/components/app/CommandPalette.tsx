"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Item =
  | { type: "action"; label: string; go: string }
  | { type: "contact"; label: string; sub: string | null; go: string };

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string; email: string | null }[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
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

  const items: Item[] = useMemo(
    () => [
      { type: "action", label: "Create task → Activity", go: "/app/activity" },
      { type: "action", label: "Enroll in campaign → Campaigns", go: "/app/campaigns" },
      ...hits.map((h): Item => ({
        type: "contact",
        label: h.name,
        sub: h.email,
        go: `/app/contacts/${h.id}`,
      })),
    ],
    [hits]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [q, open]);

  const go = (path: string) => {
    router.push(path);
    setOpen(false);
    setQ("");
  };

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
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => Math.min(items.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              const item = items[activeIndex];
              if (item) go(item.go);
            }
          }}
        />
        <ul>
          {items.map((item, i) => (
            <li key={`${item.type}-${item.go}-${i}`}>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-hover)]"
                style={i === activeIndex ? { background: "var(--surface-hover)" } : undefined}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => go(item.go)}
              >
                {item.label}
                {item.type === "contact" && item.sub && (
                  <span className="font-data text-xs" style={{ color: "var(--text-muted)" }}>
                    {" "}
                    {item.sub}
                  </span>
                )}
              </button>
            </li>
          ))}
          {q.trim() && !hits.length && (
            <li className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
              No contacts found for &ldquo;{q}&rdquo;
            </li>
          )}
        </ul>
        <div className="command-hint">
          <span>
            <span className="command-kbd">↑</span>
            <span className="command-kbd">↓</span> Navigate
          </span>
          <span>
            <span className="command-kbd">↵</span> Select
          </span>
          <span>
            <span className="command-kbd">Esc</span> Close
          </span>
        </div>
      </div>
    </div>
  );
}
