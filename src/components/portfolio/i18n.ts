import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";

export type PortfolioMessages = Messages["portfolio"];
export type ContentMessages = Messages["portfolioContent"];

// "a, b and c", as the English has always read (no serial comma).
export function joinAnd(template: string, items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return fmt(template, { list: items.slice(0, -1).join(", "), last: items.at(-1) ?? "" });
}

// A label inside a sentence: German keeps its nouns capitalized.
export function lowerFor(format: Format, label: string): string {
  return format.locale === "de" ? label : label.toLocaleLowerCase(format.locale);
}
