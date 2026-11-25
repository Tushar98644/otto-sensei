import { APP_CHROME_NAMESPACES } from "@/i18n/app-namespaces";
import type { Namespace } from "@/i18n/messages";

// Every namespace the studio's client components read; payload.test.ts keeps them under a byte budget.
export const STUDIO_NAMESPACES = [
  ...APP_CHROME_NAMESPACES,
  "studio",
  "studioEditor",
  "studioSections",
  "studioTailor",
  "studioDownload",
  "jobForm",
  "onboarding",
  "accountMenu",
  "lint",
  "fileChecks",
  "matchCheck",
  "careerLogLines",
  "share",
  "shareLinks",
  "formats",
  "github",
] as const satisfies readonly Namespace[];
