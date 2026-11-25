import type { UsagePeriod } from "@/config/plans";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";

// lib/usage-copy's sentences in the page's language; English reads the same as there.
type Usage = Messages["studio"]["usage"];
type PeriodLike = UsagePeriod | "month" | "trial" | null | undefined;

const SHORT_DATE = { month: "short", day: "numeric" } as const;

export function thisPeriodIn(t: Usage, period: PeriodLike): string {
  const kind = typeof period === "string" ? period : period?.kind;
  return kind === "trial" ? t.thisTrial : t.thisMonth;
}

function resetDayIn(format: Format, period: UsagePeriod | null | undefined): string | null {
  return period ? format.date(period.resetsAt, SHORT_DATE) : null;
}

export function resetWhenIn(t: Usage, format: Format, period: UsagePeriod | null | undefined): string {
  const day = resetDayIn(format, period);
  if (!day) return t.whenRenews;
  return fmt(period?.renews ? t.onDayRenews : t.onDay, { day });
}

export function resetSentenceIn(
  t: Usage,
  format: Format,
  period: UsagePeriod | null | undefined,
): string {
  if (period?.kind === "trial") return fmt(t.fullAllowance, { day: resetDayIn(format, period) ?? "" });
  return fmt(t.reset, { when: resetWhenIn(t, format, period) });
}
