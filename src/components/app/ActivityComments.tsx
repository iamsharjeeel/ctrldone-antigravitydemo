"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications";

type Comment = {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
};

type Member = {
  user_id: string;
  email: string;
  display_name: string;
};

export default function ActivityComments({
  activityId,
  orgId,
  compact = false,
}: {
  activityId: string;
  orgId: string;
  compact?: boolean;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data } = await supabase
      .from("activity_comments")
      .select("id, body, author_id, created_at")
      .eq("activity_id", activityId)
      .order("created_at", { ascending: true });
    setComments((data as Comment[]) || []);

    const { data: dir } = await supabase.rpc("org_member_directory", {
      p_org_id: orgId,
    });
    setMembers((dir as Member[]) || []);
  }, [activityId, orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const mentionSuggestions = (() => {
    const at = body.lastIndexOf("@");
    if (at < 0) return [];
    const partial = body.slice(at + 1).split(/\s/)[0]?.toLowerCase() || "";
    if (!partial && body[body.length - 1] !== "@") return [];
    return members
      .filter((m) => {
        const name = (m.display_name || "").toLowerCase();
        const email = (m.email || "").toLowerCase();
        const local = email.split("@")[0] || "";
        return (
          name.includes(partial) ||
          local.includes(partial) ||
          email.includes(partial)
        );
      })
      .slice(0, 5);
  })();

  const notifyMentions = async (text: string, authorId: string) => {
    const tokens = Array.from(text.matchAll(/@([A-Za-z0-9._-]+)/g)).map(
      (m) => m[1].toLowerCase()
    );
    if (!tokens.length) return;
    const supabase = createClient();
    const matched = members.filter((m) => {
      const name = (m.display_name || "").toLowerCase();
      const local = (m.email || "").split("@")[0]?.toLowerCase() || "";
      return tokens.some(
        (t) => name === t || local === t || name.replace(/\s+/g, "") === t
      );
    });
    for (const m of matched) {
      if (m.user_id === authorId) continue;
      try {
        await createNotification(supabase, {
          orgId,
          userId: m.user_id,
          type: "mention",
          title: "You were mentioned",
          body: text.slice(0, 140),
          link: "/app/activity",
        });
      } catch {
        /* notifications table optional until #9 migration applied */
      }
    }
  };

  const submit = async () => {
    if (!body.trim() || !userId) return;
    setError(null);
    const supabase = createClient();
    const { error: insertErr } = await supabase.from("activity_comments").insert({
      org_id: orgId,
      activity_id: activityId,
      author_id: userId,
      body: body.trim(),
    });
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    await notifyMentions(body.trim(), userId);
    setBody("");
    setOpen(true);
    load();
  };

  const pickMention = (m: Member) => {
    const at = body.lastIndexOf("@");
    const prefix = at >= 0 ? body.slice(0, at) : body;
    setBody(`${prefix}@${m.display_name.replace(/\s+/g, "")} `);
  };

  return (
    <div className={compact ? "mt-2" : "mt-3"} style={{ paddingLeft: compact ? 8 : 12 }}>
      {comments.length > 0 && (
        <ul className="space-y-2 mb-2">
          {comments.map((c) => (
            <li
              key={c.id}
              className="text-sm"
              style={{
                borderLeft: "2px solid var(--border)",
                paddingLeft: 10,
                color: "var(--text-secondary)",
              }}
            >
              <span className="font-data text-xs text-meta">
                {new Date(c.created_at).toLocaleString()}
              </span>
              <p className="mt-0.5">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
      {!open ? (
        <button
          type="button"
          className="text-xs"
          style={{ color: "var(--signal-blue)", fontWeight: 600 }}
          onClick={() => setOpen(true)}
        >
          Reply{comments.length ? ` (${comments.length})` : ""}
        </button>
      ) : (
        <div className="space-y-2">
          <textarea
            className="app-input"
            style={{ height: 56, paddingTop: 8 }}
            placeholder="Reply… use @name to mention"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {mentionSuggestions.length > 0 && (
            <div className="app-card p-2 space-y-1">
              {mentionSuggestions.map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  className="app-btn"
                  style={{ width: "100%", justifyContent: "flex-start" }}
                  onClick={() => pickMention(m)}
                >
                  @{m.display_name}{" "}
                  <span className="text-meta font-data text-xs">{m.email}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" className="app-btn app-btn-primary" onClick={submit}>
              Post
            </button>
            <button
              type="button"
              className="app-btn"
              onClick={() => {
                setOpen(false);
                setBody("");
              }}
            >
              Cancel
            </button>
          </div>
          {error && (
            <p className="text-xs" style={{ color: "var(--signal-red)" }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
