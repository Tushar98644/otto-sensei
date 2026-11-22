import { DAY_MS } from "@/lib/time";
import { cardColumn, daysInStage, isOverdue, needsAction, type BoardCard } from "../board";

export function dayOffset(at: number, now: number): number {
  const a = new Date(at);
  const b = new Date(now);
  const day = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((day(a) - day(b)) / DAY_MS);
}

export function span(days: number): string {
  if (days < 14) return days === 1 ? "1 day" : `${days} days`;
  if (days < 60) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
}

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short" });
const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const FULL = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

export type InterviewWhen = {
  month: string;
  day: string;
  lead: string;
  detail: string;
  spoken: string;
  past: boolean;
  soon: boolean;
};

export function interviewWhen(at: number, now: number): InterviewWhen {
  const date = new Date(at);
  const month = MONTH.format(date).toUpperCase();
  const day = String(date.getDate());
  const weekday = WEEKDAY.format(date);
  const sameYear = now <= 0 || date.getFullYear() === new Date(now).getFullYear();
  const detail = `Interview · ${sameYear ? weekday : `${weekday}, ${date.getFullYear()}`}`;
  const spoken = FULL.format(date);
  if (now <= 0) {
    return { month, day, lead: weekday, detail: "Interview", spoken, past: false, soon: false };
  }
  const offset = dayOffset(at, now);
  const lead =
    offset === 0
      ? "Today"
      : offset === 1
        ? "Tomorrow"
        : offset > 1
          ? `In ${span(offset)}`
          : offset === -1
            ? "Yesterday"
            : `${span(-offset)} ago`;
  return { month, day, lead, detail, spoken, past: offset < 0, soon: offset === 0 || offset === 1 };
}

export type StageTime = { text: string; late: boolean };

// Fresh cards say nothing: time only shows once it starts to mean something for that stage.
export function stageTime(card: BoardCard, now: number): StageTime | null {
  if (now <= 0) return null;
  if (card.kind === "to_apply") {
    const days = daysInStage(card, now);
    return days >= 7
      ? { text: `${card.item.job ? "Saved" : "Tailored"} ${span(days)} ago`, late: false }
      : null;
  }
  const { application } = card;
  const days = daysInStage(card, now);
  switch (cardColumn(card)) {
    case "applied": {
      const since = Math.max(0, Math.floor((now - application.appliedAt) / DAY_MS));
      if (since < 7) return null;
      return {
        text: `Applied ${span(since)} ago`,
        late: isOverdue(card, now) && !needsAction(card, now),
      };
    }
    case "interview":
      return application.interviewAt === null && days >= 7
        ? { text: `Interviewing for ${span(days)}`, late: false }
        : null;
    case "offer":
      return days >= 3 ? { text: `Offer came ${span(days)} ago`, late: false } : null;
    default:
      return null;
  }
}
