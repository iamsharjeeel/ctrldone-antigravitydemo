"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

type Field = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
};

type FormData = {
  id: string;
  name: string;
  fields: Field[];
};

export default function HostedFormPage() {
  const params = useParams();
  const id = String(params.id || "");
  const [form, setForm] = useState<FormData | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  useEffect(() => {
    document.documentElement.setAttribute("data-shell", "login");
    document.documentElement.setAttribute("data-theme", "light");
    return () => {
      document.documentElement.removeAttribute("data-shell");
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/forms/${id}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed");
        setForm(j);
        const init: Record<string, string> = {};
        for (const f of j.fields || []) init[f.key] = "";
        setValues(init);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const r = await fetch(`/api/forms/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Submit failed");
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
      setStatus("idle");
    }
  };

  if (error && !form) {
    return (
      <div className="login-wrap">
        <Link href="/" className="login-brand">
          <Logo />
        </Link>
        <div className="login-card">
          <h1 className="login-title">Form unavailable</h1>
          <p className="login-sub">{error}</p>
        </div>
      </div>
    );
  }

  if (!form) {
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
          <h1 className="login-title">Thanks</h1>
          <p className="login-sub">Your response was submitted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <Link href="/" className="login-brand">
        <Logo />
      </Link>
      <div className="login-card">
        <h1 className="login-title">{form.name}</h1>
        <p className="login-sub">Fill out the form below</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          {(form.fields || []).map((f) => (
            <label key={f.key} className="block text-xs" style={{ color: "var(--text-muted)" }}>
              {f.label}
              {f.required ? " *" : ""}
              {f.type === "boolean" ? (
                <select
                  className="login-input mt-1"
                  value={values[f.key] || ""}
                  required={!!f.required}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                >
                  <option value="">Select…</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              ) : (
                <input
                  className="login-input mt-1"
                  type={
                    f.type === "number"
                      ? "number"
                      : f.type === "date"
                        ? "date"
                        : f.key === "email"
                          ? "email"
                          : "text"
                  }
                  value={values[f.key] || ""}
                  required={!!f.required}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              )}
            </label>
          ))}
          <button type="submit" className="login-btn-primary" disabled={status === "submitting"}>
            {status === "submitting" ? "…" : "Submit →"}
          </button>
        </form>
        {error && (
          <p className="mt-3 text-sm" style={{ color: "#b91c1c" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
