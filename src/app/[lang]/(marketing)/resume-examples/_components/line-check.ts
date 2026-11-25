import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { contentLangOf } from "@/lib/i18n/languages";
import { lintBullet } from "@/lib/lint/bullets";
import { issueText } from "@/lib/lint/i18n";

// What Otto's line check says first about a weak line: the page language's pack reads it, in that language's words.
export function lineCheckNote(weak: string, locale: Locale, lint: Messages["lint"]): string {
  const lang = contentLangOf(locale);
  if (!lang || lang === "en") return lintBullet(weak)[0]?.message ?? "";
  const issue = lintBullet(weak, { kind: "work", lang })[0];
  return issue ? issueText(issue, lint, locale) : "";
}
