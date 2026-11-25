import { intlLocale, type Locale } from "@/i18n/config";
import { fmt, selectPlural } from "@/i18n/format";
import type lint from "@/i18n/messages/en/lint";
import type { Translation } from "@/i18n/types";
import type { LintIssue } from "./types";

// The lint namespace as the UI reads it (src/i18n/messages/<locale>/lint.ts).
export type LintMessages = Translation<typeof lint>;

const QUOTED: ReadonlySet<string> = new Set(["phrase", "word", "past"]);

// "a", "b" and "c": English keeps its own list style; other languages use Intl's.
export function joinList(
  items: readonly string[],
  locale: Locale,
  type: "conjunction" | "disjunction" = "conjunction",
): string {
  if (locale === "en") {
    if (items.length < 2) return items.join("");
    return `${items.slice(0, -1).join(", ")} ${type === "conjunction" ? "and" : "or"} ${items.at(-1)}`;
  }
  return new Intl.ListFormat(intlLocale(locale), { type }).format(items);
}

function number(value: number, locale: Locale): string {
  return locale === "en" ? String(value) : new Intl.NumberFormat(intlLocale(locale)).format(value);
}

// An issue's message in the UI's language; issues without an id keep their English message.
export function issueText(issue: LintIssue, messages: LintMessages, locale: Locale): string {
  const id = issue.messageId;
  if (!id) return issue.message;
  const params = issue.params ?? {};
  const quote = (text: string) => fmt(messages.quote, { text });
  if (id === "stock") {
    const phrases = Array.isArray(params.phrases) ? params.phrases.map(quote) : [];
    const template = selectPlural(locale, messages.issues.stock, phrases.length);
    return fmt(template, { phrases: joinList(phrases, locale) });
  }
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "number") values[key] = number(value, locale);
    else if (typeof value === "string") values[key] = QUOTED.has(key) ? quote(value) : value;
  }
  return fmt(messages.issues[id], values);
}
