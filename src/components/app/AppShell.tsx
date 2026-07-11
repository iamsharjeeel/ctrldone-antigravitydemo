"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Settings, Search, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CommandPalette from "@/components/app/CommandPalette";
import Logo from "@/components/Logo";

const nav = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/contacts", label: "Contacts" },
  { href: "/app/pipelines", label: "Pipeline" },
  { href: "/app/tasks", label: "Tasks" },
  { href: "/app/activity", label: "Activity" },
];

const settingsLinks = [
  { href: "/app/settings/email", label: "Email" },
  { href: "/app/settings/templates", label: "Templates" },
  { href: "/app/settings/fields", label: "Fields" },
  { href: "/app/settings/suppression", label: "Suppression" },
  { href: "/app/settings/audit", label: "Audit" },
  { href: "/app/settings/org", label: "Organization" },
  { href: "/app/settings/team", label: "Team" },
  { href: "/app/campaigns", label: "Campaigns" },
];

type Notif = { id: string; title: string; sub: string; href: string };

export default function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-shell", "app");
    document.documentElement.setAttribute("data-theme", "light");
    return () => {
      document.documentElement.removeAttribute("data-shell");
    };
  }, []);

  const loadNotifs = useCallback(async () => {
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
    if (!mem) return;

    const items: Notif[] = [];

    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, due_at")
      .eq("org_id", mem.org_id)
      .eq("assignee_id", user.id)
      .eq("status", "open")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(5);
    (tasks || []).forEach((t) => {
      items.push({
        id: `task-${t.id}`,
        title: t.title,
        sub: t.due_at
          ? `Due ${new Date(t.due_at).toLocaleDateString()}`
          : "Open task",
        href: "/app/tasks",
      });
    });

    const { data: acts } = await supabase
      .from("activities")
      .select("id, type, body, created_at")
      .eq("org_id", mem.org_id)
      .order("created_at", { ascending: false })
      .limit(5);
    (acts || []).forEach((a) => {
      items.push({
        id: `act-${a.id}`,
        title: a.type.replace(/_/g, " "),
        sub: a.body || new Date(a.created_at).toLocaleString(),
        href: "/app/activity",
      });
    });

    const { data: camps } = await supabase
      .from("campaigns")
      .select("id, name, status")
      .eq("org_id", mem.org_id)
      .eq("status", "paused")
      .limit(5);
    (camps || []).forEach((c) => {
      items.push({
        id: `camp-${c.id}`,
        title: `Paused: ${c.name}`,
        sub: "Campaign paused",
        href: "/app/campaigns",
      });
    });

    const { data: accounts } = await supabase
      .from("email_accounts")
      .select("id, email, status")
      .eq("org_id", mem.org_id)
      .eq("status", "needs_reauth")
      .limit(5);
    (accounts || []).forEach((a) => {
      items.push({
        id: `email-${a.id}`,
        title: "Email needs reauth",
        sub: a.email || "Reconnect account",
        href: "/app/settings/email",
      });
    });

    setNotifs(items);
  }, []);

  useEffect(() => {
    loadNotifs();
  }, [loadNotifs, pathname]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  const initials = (userEmail || "CD")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/app/contacts?q=${encodeURIComponent(term)}`);
  };

  const badgeCount = notifs.filter(
    (n) =>
      n.id.startsWith("task-") ||
      n.id.startsWith("camp-") ||
      n.id.startsWith("email-")
  ).length;

  return (
    <div className="app-shell">
      <header className="top-nav">
        <Link href="/app" className="top-nav-brand">
          <Logo />
        </Link>
        <nav className="top-nav-links">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="top-nav-link"
              data-active={isActive(item.href)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="top-nav-right">
          <form className="top-nav-search" onSubmit={onSearch}>
            <Search size={14} strokeWidth={1.75} />
            <input
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </form>
          <div style={{ position: "relative" }} ref={notifRef}>
            <button
              type="button"
              className="top-nav-icon"
              title="Notifications"
              aria-label="Notifications"
              onClick={() => {
                setNotifOpen((v) => !v);
                setMenuOpen(false);
                loadNotifs();
              }}
            >
              <Bell size={18} strokeWidth={1.75} />
              {badgeCount > 0 && (
                <span className="nav-badge">{badgeCount > 9 ? "9+" : badgeCount}</span>
              )}
            </button>
            {notifOpen && (
              <div className="app-card notif-panel">
                <div
                  className="app-label"
                  style={{ padding: "8px 12px 4px" }}
                >
                  Notifications
                </div>
                {notifs.length === 0 && (
                  <div className="notif-item-sub" style={{ padding: 12 }}>
                    You&apos;re all caught up.
                  </div>
                )}
                {notifs.map((n) => (
                  <Link
                    key={n.id}
                    href={n.href}
                    className="notif-item"
                    onClick={() => setNotifOpen(false)}
                  >
                    <div className="notif-item-title" style={{ textTransform: "capitalize" }}>
                      {n.title}
                    </div>
                    <div className="notif-item-sub">{n.sub}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/app/settings/email"
            className="top-nav-icon"
            title="Settings"
            aria-label="Settings"
          >
            <Settings size={18} strokeWidth={1.75} />
          </Link>
          <div style={{ position: "relative" }} ref={menuRef}>
            <button
              type="button"
              className="top-nav-avatar"
              onClick={() => {
                setMenuOpen((v) => !v);
                setNotifOpen(false);
              }}
              title={userEmail || "Account"}
            >
              {initials}
            </button>
            {menuOpen && (
              <div
                className="app-card"
                style={{
                  position: "absolute",
                  right: 0,
                  top: 40,
                  minWidth: 200,
                  padding: 8,
                  zIndex: 60,
                }}
              >
                {settingsLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="app-btn"
                    style={{
                      width: "100%",
                      justifyContent: "flex-start",
                      border: "none",
                    }}
                    onClick={() => setMenuOpen(false)}
                  >
                    {l.label}
                  </Link>
                ))}
                <button
                  type="button"
                  className="app-btn"
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    border: "none",
                  }}
                  onClick={logout}
                >
                  <LogOut size={14} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="app-main">{children}</main>
      <CommandPalette />
    </div>
  );
}
