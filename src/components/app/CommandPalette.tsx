"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Item =
  | { type: "action"; label: string; go: string; group: "Actions" }
  | { type: "contact"; label: string; sub: string | null; go: string; group: "Contacts" }
  | { type: "deal"; label: string; sub: string | null; go: string; group: "Deals" }
  | { type: "task"; label: string; sub: string | null; go: string; group: "Tasks" };

type ContactHit = { id: string; name: string; email: string | null };
type DealHit = { id: string; title: string; value: number | null; currency: string | null };
type TaskHit = { id: string; title: string; status: string; due_at: string | null };

const ACTIONS: Item[] = [
  { type: "action", label: "Create task → Tasks", go: "/app/tasks", group: "Actions" },
  { type: "action", label: "Enroll in campaign → Campaigns", go: "/app/campaigns", group: "Actions" },
  { type: "action", label: "Open Pipeline", go: "/app/pipelines", group: "Actions" },
  { type: "action", label: "Open Contacts", go: "/app/contacts", group: "Actions" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [contacts, setContacts] = useState<ContactHit[]>([]);
  const [deals, setDeals] = useState<DealHit[]>([]);
  const [tasks, setTasks] = useState<TaskHit[]>([]);
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
      setContacts([]);
      setDeals([]);
      setTasks([]);
      return;
    }
    const term = q.trim();
    let cancelled = false;
    const run = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: mem } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (!mem || cancelled) return;

      const [cRes, dRes, tRes] = await Promise.all([
        supabase
          .from("contacts")
          .select("id, name, email")
          .eq("org_id", mem.org_id)
          .or(`name.ilike.%${term}%,email.ilike.%${term}%`)
          .limit(6),
        supabase
          .from("deals")
          .select("id, title, value, currency")
          .eq("org_id", mem.org_id)
          .ilike("title", `%${term}%`)
          .limit(6),
        supabase
          .from("tasks")
          .select("id, title, status, due_at")
          .eq("org_id", mem.org_id)
          .neq("status", "cancelled")
          .ilike("title", `%${term}%`)
          .limit(6),
      ]);
      if (cancelled) return;
      setContacts(cRes.data || []);
      setDeals(dRes.data || []);
      setTasks(tRes.data || []);
    };
    const t = window.setTimeout(run, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q, open]);

  const items: Item[] = useMemo(() => {
    const term = q.trim().toLowerCase();
    const actions = term
      ? ACTIONS.filter((a) => a.label.toLowerCase().includes(term))
      : ACTIONS;

    const contactItems: Item[] = contacts.map((h) => ({
      type: "contact",
      label: h.name,
      sub: h.email,
      go: `/app/contacts/${h.id}`,
      group: "Contacts",
    }));

    const dealItems: Item[] = deals.map((h) => ({
      type: "deal",
      label: h.title,
      sub:
        h.value != null
          ? Number(h.value).toLocaleString(undefined, {
              style: "currency",
              currency: h.currency || "USD",
              maximumFractionDigits: 0,
            })
          : null,
      go: `/app/deals/${h.id}`,
      group: "Deals",
    }));

    const taskItems: Item[] = tasks.map((h) => ({
      type: "task",
      label: h.title,
      sub: [h.status, h.due_at ? new Date(h.due_at).toLocaleDateString() : null]
        .filter(Boolean)
        .join(" · "),
      go: "/app/tasks",
      group: "Tasks",
    }));

    return [...actions, ...contactItems, ...dealItems, ...taskItems];
  }, [q, contacts, deals, tasks]);

  const rows = useMemo(() => {
    type Row =
      | { kind: "header"; label: string }
      | { kind: "item"; item: Item; index: number };
    const out: Row[] = [];
    let lastGroup = "";
    items.forEach((item, index) => {
      if (item.group !== lastGroup) {
        out.push({ kind: "header", label: item.group });
        lastGroup = item.group;
      }
      out.push({ kind: "item", item, index });
    });
    return out;
  }, [items]);

  useEffect(() => {
    setActiveIndex(0);
  }, [q, open, items.length]);

  const go = (path: string) => {
    router.push(path);
    setOpen(false);
    setQ("");
  };

  if (!open) return null;

  const hasSearchHits = contacts.length + deals.length + tasks.length > 0;

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
          placeholder="Search contacts, deals, tasks…"
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
        <ul style={{ maxHeight: 360, overflow: "auto" }}>
          {rows.map((row, ri) => {
            if (row.kind === "header") {
              return (
                <li key={`h-${row.label}-${ri}`} className="app-label" style={{ padding: "10px 16px 4px" }}>
                  {row.label}
                </li>
              );
            }
            const { item, index } = row;
            return (
              <li key={`${item.type}-${item.go}-${item.label}-${index}`}>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-hover)]"
                  style={
                    index === activeIndex
                      ? { background: "var(--surface-hover)", fontWeight: 600 }
                      : { fontWeight: 500 }
                  }
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => go(item.go)}
                >
                  {item.label}
                  {"sub" in item && item.sub && (
                    <span
                      className="font-data text-xs"
                      style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                    >
                      {" "}
                      {item.sub}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {q.trim() && !hasSearchHits && items.length === 0 && (
            <li
              className="px-4 py-6 text-sm text-center"
              style={{ color: "var(--text-secondary)", fontWeight: 500 }}
            >
              No results for &ldquo;{q}&rdquo;
            </li>
          )}
          {q.trim() && !hasSearchHits && items.every((i) => i.type === "action") && items.length > 0 && (
            <li
              className="px-4 py-3 text-sm text-center"
              style={{ color: "var(--text-secondary)", fontWeight: 500 }}
            >
              No contacts, deals, or tasks for &ldquo;{q}&rdquo;
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
