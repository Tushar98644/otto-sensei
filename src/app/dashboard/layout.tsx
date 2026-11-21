import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { mePayload } from "@/app/api/me/payload";
import { AppShell } from "@/components/dashboard/app-shell";
import { ROUTES } from "@/components/site/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { log } from "@/lib/log";
import { REQUEST_PATH_HEADER, requestedPathWithin } from "@/lib/request-path";

export const metadata: Metadata = {
  title: { template: "%s · Dashboard", default: "Dashboard" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#eef3ef" };

// A dead cookie goes through /api/auth/expired, or src/proxy.ts would loop it back here.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    const asked = (await headers()).get(REQUEST_PATH_HEADER);
    const next = requestedPathWithin(asked, ROUTES.dashboard);
    redirect(`/api/auth/expired?next=${encodeURIComponent(next)}`);
  }
  // Spares the browser a GET /api/me before its first request; without it the browser asks itself.
  const me = await mePayload(user).catch((error: unknown) => {
    log.warn("dashboard.me_failed", {}, error);
    return null;
  });
  return (
    <AppShell initialUser={user} initialMe={me}>
      {children}
    </AppShell>
  );
}
