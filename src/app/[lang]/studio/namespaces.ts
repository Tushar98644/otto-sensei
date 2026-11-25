import type { Namespace } from "@/i18n/messages";

// Every namespace the studio's client components read; payload.test.ts keeps them under a byte budget.
export const STUDIO_NAMESPACES = [
  "studio",
  "studioEditor",
  "lint",
] as const satisfies readonly Namespace[];
