import type { Namespace } from "@/i18n/messages";

// The Account page's client components read these, on /account and in the dashboard.
export const ACCOUNT_NAMESPACES = ["account"] as const satisfies readonly Namespace[];
