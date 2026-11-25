import { APP_CHROME_NAMESPACES } from "@/i18n/app-namespaces";
import type { Namespace } from "@/i18n/messages";

// The Account page's client components read these, on /account and in the dashboard.
export const ACCOUNT_NAMESPACES = ["account", "calendar"] as const satisfies readonly Namespace[];

// /account stands alone, so it also sends what the dashboard's layout would: Otto's lines, the app's dialogs and the work profile.
export const ACCOUNT_PAGE_NAMESPACES = [
  ...ACCOUNT_NAMESPACES,
  ...APP_CHROME_NAMESPACES,
  "workProfile",
] as const satisfies readonly Namespace[];
