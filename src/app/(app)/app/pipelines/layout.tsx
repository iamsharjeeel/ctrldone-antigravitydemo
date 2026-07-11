import { Suspense } from "react";

export default function PipelinesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="text-sm" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
          Loading…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
