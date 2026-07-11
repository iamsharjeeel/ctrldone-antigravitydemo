"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export type ContactAttr = {
  id: string;
  key: string;
  label: string;
  field_type: string;
  options: unknown;
};

function displayValue(raw: unknown): string {
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    return String(raw);
  }
  if (raw == null) return "";
  return JSON.stringify(raw).replace(/^"|"$/g, "");
}

function optionsList(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options.map((o) => String(o)).filter(Boolean);
}

export default function CustomFieldsEditor({
  orgId,
  contactId,
}: {
  orgId: string;
  contactId: string;
}) {
  const [attrs, setAttrs] = useState<ContactAttr[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: a } = await supabase
      .from("contact_attributes")
      .select("id, key, label, field_type, options")
      .eq("org_id", orgId)
      .order("label");
    setAttrs((a as ContactAttr[]) || []);

    const { data: vals } = await supabase
      .from("contact_attribute_values")
      .select("attribute_id, value")
      .eq("contact_id", contactId);
    const map: Record<string, unknown> = {};
    (vals || []).forEach((v: { attribute_id: string; value: unknown }) => {
      map[v.attribute_id] = v.value;
    });
    setValues(map);
    setLoaded(true);
  }, [orgId, contactId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveAttr = async (attributeId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [attributeId]: value }));
    const supabase = createClient();
    await supabase.from("contact_attribute_values").upsert(
      {
        org_id: orgId,
        contact_id: contactId,
        attribute_id: attributeId,
        value,
      },
      { onConflict: "contact_id,attribute_id" }
    );
  };

  if (!loaded) {
    return (
      <div className="space-y-2" aria-busy="true">
        <div className="skeleton-line" style={{ width: "50%" }} />
        <div className="skeleton-line" style={{ width: "80%" }} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="app-label">Custom fields</div>
        <Link
          href="/app/settings/fields"
          className="text-xs"
          style={{ fontWeight: 600, color: "var(--forest)" }}
        >
          Manage
        </Link>
      </div>
      {attrs.map((a) => {
        const raw = values[a.id];
        const display = displayValue(raw);
        const options = optionsList(a.options);

        if (a.field_type === "boolean") {
          return (
            <label
              key={a.id}
              className="flex items-center gap-2 text-sm"
              style={{ fontWeight: 500 }}
            >
              <input
                type="checkbox"
                checked={Boolean(raw)}
                onChange={(e) => saveAttr(a.id, e.target.checked)}
              />
              {a.label}
            </label>
          );
        }

        if (a.field_type === "select") {
          return (
            <label key={a.id} className="field-label block">
              {a.label}
              <select
                className="app-input mt-1"
                value={display}
                onChange={(e) => saveAttr(a.id, e.target.value)}
              >
                <option value="">—</option>
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        return (
          <label key={a.id} className="field-label block">
            {a.label}
            <input
              className="app-input mt-1"
              type={
                a.field_type === "number"
                  ? "number"
                  : a.field_type === "date"
                    ? "date"
                    : "text"
              }
              value={display}
              onChange={(e) =>
                saveAttr(
                  a.id,
                  a.field_type === "number"
                    ? e.target.value === ""
                      ? null
                      : Number(e.target.value)
                    : e.target.value
                )
              }
            />
          </label>
        );
      })}
      {!attrs.length && (
        <p className="text-sm" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
          No custom fields. Define them in Settings → Fields.
        </p>
      )}
    </div>
  );
}
