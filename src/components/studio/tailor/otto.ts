import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import { countText } from "../count";
import { whole } from "../otto";

type ProvenCount = { proven: number; total: number };

// What Otto says over the screener, in the page's language.
export function screenerLine(
  t: Messages["studioTailor"]["otto"]["screener"],
  format: Format,
  must: ProvenCount,
  nice: ProvenCount,
): string {
  const mustTotal = whole(must.total);
  const niceTotal = whole(nice.total);
  if (mustTotal === 0) {
    if (niceTotal === 0) return t.noRequirements;
    const shown = Math.min(whole(nice.proven), niceTotal);
    return fmt(t.niceOnly, { shown, total: niceTotal });
  }
  const proven = Math.min(whole(must.proven), mustTotal);
  if (proven === mustTotal) {
    return mustTotal === 1 ? t.oneProven : fmt(t.allProven, { total: mustTotal });
  }
  if (proven === 0) return fmt(t.noneProven, { total: mustTotal });
  return countText(format, t.someProven, mustTotal - proven, { proven, total: mustTotal });
}
