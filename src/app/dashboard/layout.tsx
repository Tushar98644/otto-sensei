import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/dashboard/app-shell";
import { ROUTES } from "@/components/site/routes";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { template: "%s · Dashboard", default: "Dashboard" },
  robots: { index: false, follow: false },
};

// Same stone canvas as the studio (--color-surface-muted).
export const viewport: Viewport = { themeColor: "#eef3ef" };

// Checked on the server so a signed-out visitor never sees an empty dashboard flash. A dead cookie
// goes through /api/auth/expired, which clears it, so the home page stops redirecting here.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/api/auth/expired?next=${encodeURIComponent(ROUTES.dashboard)}`);
  return <AppShell initialUser={user}>{children}</AppShell>;
}
