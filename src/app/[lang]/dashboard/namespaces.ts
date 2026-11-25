import type { Namespace } from "@/i18n/messages";

// The messages the dashboard's client components read; the layout sends only these to the browser.
export const DASHBOARD_NAMESPACES = [
  "dashboard",
  "jobs",
  "applications",
  "interview",
  "letters",
] as const satisfies readonly Namespace[];
