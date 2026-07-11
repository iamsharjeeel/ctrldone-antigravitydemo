"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SettingsSubnav from "@/components/app/SettingsSubnav";

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<
    { id: string; role: string; user_id: string }[]
  >([]);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [seatLimit, setSeatLimit] = useState(3);
  const [visibilityMode, setVisibilityMode] = useState("open");
  const [orgId, setOrgId] = useState<string | null>(null);

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
    if (!mem) return;
    setOrgId(mem.org_id);
    const { data } = await supabase
      .from("org_members")
      .select("id, role, user_id")
      .eq("org_id", mem.org_id);
    setMembers(data || []);
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("seat_limit")
      .eq("org_id", mem.org_id)
      .maybeSingle();
    if (sub?.seat_limit) setSeatLimit(sub.seat_limit);
    const { data: org } = await supabase
      .from("orgs")
      .select("visibility_mode")
      .eq("id", mem.org_id)
      .maybeSingle();
    if (org?.visibility_mode) setVisibilityMode(org.visibility_mode);
  };

  useEffect(() => {
    load();
  }, []);

  const invite = async () => {
    if (!orgId) return;
    if (members.length >= seatLimit) {
      setMsg(
        `Seat limit reached (${members.length}/${seatLimit}). Upgrade on Billing to invite more.`
      );
      return;
    }
    setMsg(
      `Invite flow: create the user in Supabase Auth for ${email}, then add them via org_members (admin). Magic-link signup + bootstrap attaches first user as owner.`
    );
  };

  return (
    <div className="space-y-4 max-w-xl">
      <SettingsSubnav />
      <div>
        <h1 className="app-page-title">Team</h1>
        <p className="app-page-sub">
          Invite users into the internal CTRLDONE org · seats{" "}
          <span className="font-data">
            {members.length}/{seatLimit}
          </span>
        </p>
      </div>

      <div className="app-card p-4">
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Roles: <strong>owner</strong> / <strong>admin</strong> see all contacts, deals, and
          tasks. <strong>member</strong> sees everything when visibility is open; when{" "}
          <Link href="/app/settings/org" style={{ color: "var(--forest)" }}>
            owner-scoped
          </Link>{" "}
          is on (currently <span className="font-data">{visibilityMode}</span>), members only
          see records they own or are assigned to.
        </p>
      </div>

      <div className="app-card overflow-hidden">
        <table className="app-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td className="font-data text-xs">{m.user_id}</td>
                <td>
                  <span className="status-pill status-pill-blue">{m.role}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <input
          className="app-input"
          placeholder="colleague@ctrldone.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="button" className="app-btn app-btn-primary" onClick={invite}>
          Invite
        </button>
      </div>
      {msg && (
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {msg}{" "}
          {members.length >= seatLimit && (
            <Link href="/app/settings/billing" style={{ color: "var(--forest)" }}>
              Manage billing
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
