import { formatCount } from "@/lib/applications/stats";
import type { Recap, RecapCounts } from "./types";
import { weekLabel } from "./week";

// The words the bell, the Home card and the slides share.

function list(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

export function daysActiveText(days: number): string {
  return formatCount(days, "day with Otto", "days with Otto");
}

// The headline facts of a week, most telling first, at most three.
export function recapHighlights(recap: Recap): string[] {
  const { effort, momentum } = recap;
  return [
    effort.applications > 0 ? formatCount(effort.applications, "application") : null,
    momentum.offers > 0 ? formatCount(momentum.offers, "offer") : null,
    momentum.interviews > 0 ? formatCount(momentum.interviews, "interview") : null,
    effort.tailored > 0 ? formatCount(effort.tailored, "tailored version") : null,
    effort.letters > 0 ? formatCount(effort.letters, "letter") : null,
    recap.activeDays.length > 0 ? daysActiveText(recap.activeDays.length) : null,
  ]
    .filter((part) => part !== null)
    .slice(0, 3);
}

export function recapSummary(recap: Recap): string {
  if (recap.quiet) return "A quiet week, and one small idea for this one.";
  const parts = recapHighlights(recap);
  if (parts.length === 0) return "A few slides about your week.";
  const text = list(parts);
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

export function readyBody(recap: Recap): string {
  return `${weekLabel(recap.week)}: ${recapSummary(recap)}`;
}

export type Comparison = { text: string; up: boolean } | null;

// Up is said plainly; down is only last week's number, never a scold.
export function compareWeeks(now: number, last: number | null, noun: string): Comparison {
  if (last === null || (now === 0 && last === 0)) return null;
  if (now > last) return { text: `${now - last} more than last week`, up: true };
  if (now === last) return { text: "The same as last week", up: false };
  return { text: `Last week: ${formatCount(last, noun)}`, up: false };
}

export type EffortLine = { count: number; label: string };

const EFFORT_LABELS: Record<keyof RecapCounts | "messages" | "preps", [string, string]> = {
  applications: ["application sent", "applications sent"],
  tailored: ["tailored version", "tailored versions"],
  letters: ["cover letter written", "cover letters written"],
  messages: ["answer or message written", "answers and messages written"],
  preps: ["interview prepped", "interviews prepped"],
};

export function effortLines(recap: Recap): EffortLine[] {
  const { effort } = recap;
  return (["applications", "tailored", "letters", "messages", "preps"] as const)
    .filter((key) => effort[key] > 0)
    .map((key) => {
      const [one, many] = EFFORT_LABELS[key];
      return { count: effort[key], label: effort[key] === 1 ? one : many };
    });
}
