"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

async function ensureOrgClient() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const { data: membership } = await supabase
    .from("org_members")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (membership) return { error: null };
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const { error } = await supabase.rpc("bootstrap_ctrldone_org", {
    p_user_id: user.id,
    p_timezone: tz,
  });
  return { error: error?.message || null };
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/app";

  useEffect(() => {
    document.documentElement.setAttribute("data-shell", "login");
    document.documentElement.setAttribute("data-theme", "light");
    return () => {
      document.documentElement.removeAttribute("data-shell");
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        const boot = await ensureOrgClient();
        if (boot.error) throw new Error(boot.error);
        router.push(next);
        router.refresh();
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const boot = await ensureOrgClient();
      if (boot.error) throw new Error(boot.error);
      router.push(next);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <Link href="/" className="login-brand">
        <Logo />
      </Link>
      <div className="login-card">
        <h1 className="login-title">Welcome back</h1>
        <p className="login-sub">Sign in to continue to your workspace</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <input
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
            autoComplete="email"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          <div className="login-row">
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 13 }}
            >
              {mode === "signin" ? "Create account" : "Have an account? Sign in"}
            </button>
          </div>
          <button type="submit" disabled={loading} className="login-btn-primary">
            {loading ? "…" : mode === "signup" ? "Create account →" : "Sign In →"}
          </button>
        </form>

        <div className="login-divider">OR</div>

        <button type="button" className="login-btn-google" onClick={onGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.5 5.5-6.5 6.9l.1.1 6.2 5.2C36.9 41.1 44 36 44 24c0-1.3-.1-2.5-.4-3.5z" />
          </svg>
          Continue with Google
        </button>

        {message && (
          <p className="mt-4 text-sm" style={{ color: "#b91c1c" }}>
            {message}
          </p>
        )}
      </div>
      <p className="login-footer">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={() => setMode("signup")}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}
        >
          Request Access
        </button>
      </p>
    </div>
  );
}
