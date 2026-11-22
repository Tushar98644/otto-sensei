import { hasProTools, planIncludes, type PlanId } from "@/config/plans";

// Every plan rule of Otto for Chrome lives here, so the server and the extension agree.
export const EXTENSION_TOOLS = ["badge", "save", "tailor", "letter", "fill"] as const;
export type ExtensionTool = (typeof EXTENSION_TOOLS)[number];

export type ExtensionAccess = Record<ExtensionTool, boolean>;

export function extensionAccess(plan: PlanId): ExtensionAccess {
  return {
    // The badge covers the match, the eligibility line and the panel: free for everyone.
    badge: true,
    save: true,
    tailor: planIncludes(plan, "tailor"),
    letter: planIncludes(plan, "letter"),
    // Fill with Otto (phase 2) is Pro and Max only.
    fill: hasProTools(plan),
  };
}
