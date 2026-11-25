import { fmt } from "@/i18n/format";
import { formatFor, type Format } from "@/i18n/intl";
import matchCheckEn from "@/i18n/messages/en/match-check";
import type { MatchCheck, MatchCount, MatchStatus } from "./check";

export type MatchCheckMessages = typeof matchCheckEn;

const english = () => formatFor("en");

export function matchHeadline(
  { found, total }: Pick<MatchCheck, "found" | "total">,
  t: MatchCheckMessages = matchCheckEn,
  format: Format = english(),
): string {
  if (total === 0) return t.result.none;
  return format.plural(t.result.headline, total, { found: format.number(found) });
}

export function countLine(
  label: string,
  { found, total }: MatchCount,
  t: MatchCheckMessages = matchCheckEn,
  format: Format = english(),
): string | null {
  if (total === 0) return null;
  return fmt(t.result.count, {
    label,
    found: format.number(found),
    total: format.number(total),
  });
}

export function listedNote(
  listed: number,
  t: MatchCheckMessages = matchCheckEn,
  format: Format = english(),
): string | null {
  if (listed === 0) return null;
  return format.plural(t.result.listed, listed);
}

export function matchOtto(
  check: Pick<MatchCheck, "found" | "total" | "must">,
  t: MatchCheckMessages = matchCheckEn,
  format: Format = english(),
): string {
  const { found, total, must } = check;
  if (total === 0) return t.otto.none;
  if (found === total) return format.plural(t.otto.all, total);
  if (must.total > 0 && must.found < must.total) {
    return format.plural(t.otto.mustLeft, must.total - must.found, {
      total: format.number(must.total),
    });
  }
  return format.plural(t.otto.some, total, { found: format.number(found) });
}

export const STATUS_LABELS: Record<MatchStatus, string> = matchCheckEn.result.status;
