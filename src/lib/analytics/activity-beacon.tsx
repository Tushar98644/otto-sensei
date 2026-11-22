"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { dashboardSection, emailLanding, withoutUtm, type EmailLanding } from "./landing";

// Read once, then taken off the address, so a reload or a copied link never counts the click again.
function takeEmailLanding(): EmailLanding | null {
  const landing = emailLanding(window.location.search);
  if (landing)
    window.history.replaceState(window.history.state, "", withoutUtm(window.location.href));
  return landing;
}

function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

function whenIdle(run: () => void): void {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 4_000 });
  } else {
    window.setTimeout(run, 1_500);
  }
}

// Straight to fetch, not lib/api/client: a note like this must not drop the layout's seeded answers.
function send(body: object): void {
  fetch("/api/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => {});
}

export function ActivityBeacon(): null {
  const pathname = usePathname();

  useEffect(() => {
    const section = dashboardSection(pathname);
    if (!section) return;
    const email = takeEmailLanding();
    const body = { section, timeZone: deviceTimeZone(), ...(email ? { email } : {}) };
    whenIdle(() => send(body));
  }, [pathname]);

  return null;
}
