import type { Namespace } from "@/i18n/messages";

// The portfolio editor's words, added to the dashboard's own on this page only.
export const PORTFOLIO_NAMESPACES = [
  "portfolio",
  "portfolioContent",
] as const satisfies readonly Namespace[];
