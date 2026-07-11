"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/app/settings/email", label: "Email" },
  { href: "/app/settings/templates", label: "Templates" },
  { href: "/app/settings/fields", label: "Fields" },
  { href: "/app/settings/pipelines", label: "Pipelines" },
  { href: "/app/settings/automations", label: "Automations" },
  { href: "/app/settings/scoring", label: "Scoring" },
  { href: "/app/settings/booking", label: "Booking" },
  { href: "/app/settings/forms", label: "Forms" },
  { href: "/app/settings/notifications", label: "Notifications" },
  { href: "/app/settings/suppression", label: "Suppression" },
  { href: "/app/settings/audit", label: "Audit" },
  { href: "/app/settings/org", label: "Organization" },
  { href: "/app/settings/team", label: "Team" },
];

export default function SettingsSubnav() {
  const pathname = usePathname();
  return (
    <nav className="settings-subnav">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          data-active={pathname.startsWith(l.href)}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
