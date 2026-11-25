import { APP_CHROME_NAMESPACES } from "@/i18n/app-namespaces";
import type { Namespace } from "@/i18n/messages";

// The messages the dashboard's client components read; the layout sends only these to the browser.
export const DASHBOARD_NAMESPACES = [
  ...APP_CHROME_NAMESPACES,
  "dashboard",
  "jobs",
  "applications",
  "interview",
  "letters",
  "share",
  "shareLinks",
  "onboarding",
  "careerLog",
  "workProfile",
] as const satisfies readonly Namespace[];

// Read by one page's parts only, so the page sends them in its own MessagesFor and every other page stays lighter.
export const PAGE_NAMESPACES = {
  interview: ["prep", "calendar"],
  applications: ["email"],
  formats: ["formats"],
} as const satisfies Record<string, readonly Namespace[]>;
