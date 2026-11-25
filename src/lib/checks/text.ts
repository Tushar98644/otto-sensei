import type { Locale } from "@/i18n/config";
import { fmt, selectPlural } from "@/i18n/format";
import { formatFor } from "@/i18n/intl";
import type fileChecksEn from "@/i18n/messages/en/file-checks";
import type { PluralForms, Translation } from "@/i18n/types";
import { joinList } from "@/lib/lint/i18n";
import type { RecruiterCheck } from "./types";

export type FileCheckMessages = Translation<typeof fileChecksEn>;

type CheckWords = Pick<RecruiterCheck, "title" | "detail" | "fix">;

function number(value: number, locale: Locale): string {
  return locale === "en" ? String(value) : formatFor(locale).number(value);
}

// A check's words rebuilt in a language from its copy; a check saved without one keeps its English.
export function checkText(check: RecruiterCheck, t: FileCheckMessages, locale: Locale): CheckWords {
  const { copy } = check;
  const result = copy ? t.results[copy.key] : undefined;
  if (!copy || !result) return { title: check.title, detail: check.detail, fix: check.fix };
  const units: Partial<Record<string, PluralForms>> = t.units;
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(copy.params ?? {})) {
    if (typeof value === "string") values[key] = value;
    else if (typeof value === "number") {
      const unit = units[key];
      const shown = number(value, locale);
      values[key] = unit ? fmt(selectPlural(locale, unit, value), { count: shown }) : shown;
    } else values[key] = joinList(value.map((section) => t.sections[section]), locale);
  }
  const count = copy.params?.count;
  const detail =
    typeof result.detail === "string"
      ? result.detail
      : selectPlural(locale, result.detail, typeof count === "number" ? count : 0);
  return {
    title: fmt(result.title, values),
    detail: fmt(detail, values),
    fix: check.fix === null || !copy.fix ? null : fmt(t.fixes[copy.fix], values),
  };
}

export function localizeCheck(
  check: RecruiterCheck,
  t: FileCheckMessages,
  locale: Locale,
): RecruiterCheck {
  return locale === "en" ? check : { ...check, ...checkText(check, t, locale) };
}
