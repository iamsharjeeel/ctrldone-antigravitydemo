import { Poppins } from "next/font/google";
import AppShell from "@/components/app/AppShell";
import "../app.css";
import { createClient } from "@/lib/supabase/server";
import { ensureOrg } from "@/lib/org";
import { redirect } from "next/navigation";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: bootstrapError } = await ensureOrg();

  return (
    <div className={poppins.variable} style={{ fontFamily: "var(--font-sans)" }}>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.setAttribute('data-shell','app');document.documentElement.setAttribute('data-theme','light');`,
        }}
      />
      {bootstrapError && (
        <div
          style={{
            padding: "10px 40px",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: 13,
            borderBottom: "1px solid #fecaca",
          }}
        >
          Organization setup failed: {bootstrapError}
        </div>
      )}
      <AppShell userEmail={user.email}>{children}</AppShell>
    </div>
  );
}
