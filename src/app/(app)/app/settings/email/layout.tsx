import { Suspense } from "react";

export default function EmailSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<div className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</div>}>{children}</Suspense>;
}
