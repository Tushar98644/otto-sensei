import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { ChecklistItem } from "@/lib/portfolio/content-uses";
import type { PortfolioSection } from "@/lib/portfolio/types";
import { joinAnd, lowerFor, type ContentMessages, type PortfolioMessages } from "../i18n";

export function missingList(
  words: ContentMessages,
  format: Format,
  items: readonly ChecklistItem[],
): string {
  const names = items
    .filter((item) => !item.done && !item.hidden)
    .map((item) => lowerFor(format, item.label));
  const shown = names.length > 3 ? [...names.slice(0, 2), words.checklist.aFewMore] : names;
  return joinAnd(words.checklist.and, shown);
}

export function hiddenOnPage(
  words: ContentMessages,
  sections: PortfolioMessages["sections"],
  hidden: readonly PortfolioSection[],
  wanted: readonly PortfolioSection[],
): string | undefined {
  const off = wanted.filter((section) => hidden.includes(section)).map((s) => sections[s]);
  if (off.length === 0) return undefined;
  return fmt(words.checklist.hiddenOnPage, { names: joinAnd(words.checklist.and, off) });
}
