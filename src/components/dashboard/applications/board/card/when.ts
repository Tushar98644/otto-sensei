import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import { DAY_MS, dayOffset } from "@/lib/time";
import type { ApplicationsMessages } from "../../../i18n";
import { cardColumn, daysInStage, isOverdue, needsAction, type BoardCard } from "../board";

export function span(days: number, { when }: ApplicationsMessages, format: Format): string {
  if (days < 14) return format.plural(when.days, days);
  if (days < 60) return format.plural(when.weeks, Math.floor(days / 7));
  return format.plural(when.months, Math.floor(days / 30));
}

const MONTH = { month: "short" } as const;
const WEEKDAY = { weekday: "long" } as const;
const FULL = { month: "long", day: "numeric", year: "numeric" } as const;

export type InterviewWhen = {
  month: string;
  day: string;
  lead: string;
  detail: string;
  spoken: string;
  past: boolean;
  soon: boolean;
};

export function interviewWhen(
  at: number,
  now: number,
  t: ApplicationsMessages,
  format: Format,
): InterviewWhen {
  const { when } = t;
  const date = new Date(at);
  const month = format.date(date, MONTH).toLocaleUpperCase(format.locale);
  const day = String(date.getDate());
  const weekday = format.date(date, WEEKDAY);
  const sameYear = now <= 0 || date.getFullYear() === new Date(now).getFullYear();
  const detail = fmt(when.interviewOn, {
    day: sameYear ? weekday : `${weekday}, ${date.getFullYear()}`,
  });
  const spoken = format.date(date, FULL);
  if (now <= 0) {
    return { month, day, lead: weekday, detail: when.interview, spoken, past: false, soon: false };
  }
  const offset = dayOffset(at, now);
  const lead =
    offset === 0
      ? when.today
      : offset === 1
        ? when.tomorrow
        : offset > 1
          ? fmt(when.in, { span: span(offset, t, format) })
          : offset === -1
            ? when.yesterday
            : fmt(when.ago, { span: span(-offset, t, format) });
  return { month, day, lead, detail, spoken, past: offset < 0, soon: offset === 0 || offset === 1 };
}

export type StageTime = { text: string; late: boolean };

// Fresh cards say nothing: time only shows once it starts to mean something for that stage.
export function stageTime(
  card: BoardCard,
  now: number,
  t: ApplicationsMessages,
  format: Format,
): StageTime | null {
  const { when } = t;
  if (now <= 0) return null;
  if (card.kind === "to_apply") {
    const days = daysInStage(card, now);
    return days >= 7
      ? {
          text: fmt(card.item.job ? when.saved : when.tailored, { span: span(days, t, format) }),
          late: false,
        }
      : null;
  }
  const { application } = card;
  const days = daysInStage(card, now);
  switch (cardColumn(card)) {
    case "applied": {
      const since = Math.max(0, Math.floor((now - application.appliedAt) / DAY_MS));
      if (since < 7) return null;
      return {
        text: fmt(when.applied, { span: span(since, t, format) }),
        late: isOverdue(card, now) && !needsAction(card, now),
      };
    }
    case "interview":
      return application.interviewAt === null && days >= 7
        ? { text: fmt(when.interviewing, { span: span(days, t, format) }), late: false }
        : null;
    case "offer":
      return days >= 3
        ? { text: fmt(when.offer, { span: span(days, t, format) }), late: false }
        : null;
    default:
      return null;
  }
}
