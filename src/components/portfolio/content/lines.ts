import type { ChecklistItem } from "@/lib/portfolio/content-uses";
import { PORTFOLIO_SECTION_LABELS, type PortfolioSection } from "@/lib/portfolio/types";

// What Otto says above the content cards. Same voice rules as ../lines.ts (first person, at most
// 18 words), checked by lines.test.ts next to this file.

export const CONTENT_LINES = {
  loading: "I'm pulling in your GitHub numbers and photo. One moment.",
  resumeOnly: "This design draws your resume only. What you add here shows in the richer designs.",
  complete: "Everything this design uses is filled in. Have a look at the preview.",
  // `missing` is the labels still to do, already joined ("photo and screenshots").
  missing: (missing: string) =>
    `This design also shows your ${missing}. Add those and the page is done.`,
} as const;

/** "photo, screenshots and talks", lowercased, at most three named. */
export function missingList(items: readonly ChecklistItem[]): string {
  const names = items
    .filter((item) => !item.done && !item.hidden)
    .map((item) => item.label.toLowerCase());
  const shown = names.length > 3 ? [...names.slice(0, 2), "a few more"] : names;
  if (shown.length <= 1) return shown[0] ?? "";
  return `${shown.slice(0, -1).join(", ")} and ${shown.at(-1)}`;
}

/** "Hidden on your page: Experience and Skills", for a card whose sections are switched off. */
export function hiddenOnPage(
  hidden: readonly PortfolioSection[],
  sections: readonly PortfolioSection[],
): string | undefined {
  const off = sections
    .filter((section) => hidden.includes(section))
    .map((section) => PORTFOLIO_SECTION_LABELS[section]);
  if (off.length === 0) return undefined;
  const names = off.length === 1 ? off[0] : `${off.slice(0, -1).join(", ")} and ${off.at(-1)}`;
  return `Hidden on your page: ${names}`;
}
