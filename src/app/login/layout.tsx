import { Poppins } from "next/font/google";
import { Suspense } from "react";
import "../app.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={poppins.variable} style={{ fontFamily: "var(--font-sans)" }}>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.setAttribute('data-shell','login');document.documentElement.setAttribute('data-theme','light');`,
        }}
      />
      <Suspense fallback={<div className="login-wrap" />}>{children}</Suspense>
    </div>
  );
}
