"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SettingsSubnav from "@/components/app/SettingsSubnav";

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<
    { id: string; role: string; user_id: string }[]
  >([]);
  const [email, setEmail] = useState("");
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
    if (!mem) return;
    const { data } = await supabase
      .from("org_members")
      .select("id, role, user_id")
      .eq("org_id", mem.org_id);
    setMembers(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const invite = async () => {
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
          Invite users into the internal CTRLDONE org
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
          {msg}
        </p>
      )}
    </div>
  );
}
