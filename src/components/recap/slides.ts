import { STATUS_NAMES } from "@/lib/applications/status";
import { formatCount } from "@/lib/applications/stats";
import {
  compareWeeks,
  daysActiveText,
  effortLines,
  recapSummary,
  type Comparison,
} from "@/lib/recap/summary";
import type { Recap, RecapStep, RecapViews } from "@/lib/recap/types";
import { weekLabel } from "@/lib/recap/week";

// Which slides a week gets, in order, and the words a screen reader hears for each.

export type SlideKind =
  "opening" | "effort" | "momentum" | "attention" | "working" | "jobs" | "days" | "next" | "quiet";

export type Slide = { kind: SlideKind; tab: string; text: string };

const TABS: Record<SlideKind, string> = {
  opening: "Your week",
  effort: "The work",
  momentum: "Replies",
  attention: "Who looked",
  working: "What's working",
  jobs: "Jobs",
  days: "Your days",
  next: "Next week",
  quiet: "Your week",
};

const DAY = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function effortComparison(recap: Recap): Comparison {
  const { effort } = recap;
  const last = effort.last;
  if (effort.applications > 0 || (last?.applications ?? 0) > 0) {
    return compareWeeks(effort.applications, last?.applications ?? null, "application");
  }
  return compareWeeks(effort.tailored, last?.tailored ?? null, "tailored version");
}

export function journeyText(path: readonly (keyof typeof STATUS_NAMES)[]): string {
  return path.map((status) => STATUS_NAMES[status]).join(" to ");
}

export function viewsText(views: RecapViews, what: "share" | "portfolio"): string {
  const count = views.views;
  if (what === "share") {
    return views.since === null
      ? `Your resume link has been opened ${formatCount(count, "time")} so far.`
      : `Your resume was opened ${formatCount(count, "time")}.`;
  }
  return views.since === null
    ? `Your portfolio has ${formatCount(count, "view")} so far.`
    : `Your portfolio got ${formatCount(count, "view")}.`;
}

export function sinceText(views: RecapViews): string {
  return views.since === null ? "Since it went live" : `Since ${SHORT.format(views.since)}`;
}

export type StepCopy = { title: string; detail: string; cta: string };

export function stepCopy(step: RecapStep): StepCopy {
  switch (step.kind) {
    case "prep":
      return {
        title: `Prep for ${step.company}`,
        detail: `Your interview is on ${DAY.format(step.at)}.`,
        cta: "Prepare",
      };
    case "follow_up":
      return {
        title: `Follow up with ${step.company}`,
        detail: "A short, friendly note keeps you on their list.",
        cta: "Open",
      };
    case "tailor":
      return {
        title: `Tailor for ${step.company}`,
        detail: step.title
          ? `${step.title}, still waiting in your saved jobs.`
          : "A job you saved.",
        cta: "Tailor",
      };
    case "jobs":
      return {
        title: "Pick a job to apply to",
        detail: "Your closest matches are waiting on the Jobs tab.",
        cta: "Open Jobs",
      };
    case "log":
      return {
        title: "Polish one line of your resume",
        detail: "Otto marks the lines worth fixing first.",
        cta: "Open Resumes",
      };
    case "upload":
      return {
        title: "Add your resume",
        detail: "Otto reads it and shows what to fix first.",
        cta: "Upload",
      };
  }
}

// Only what happened: a week of replies never lists the interviews it didn't have.
export function momentumLine(recap: Recap): string {
  const { replies, interviews, offers } = recap.momentum;
  const good = [
    offers > 0 ? formatCount(offers, "offer") : null,
    interviews > 0 ? formatCount(interviews, "interview") : null,
  ].filter((part) => part !== null);
  const heard = `You heard back from ${formatCount(replies, "company", "companies")}`;
  if (replies === 0) return `${good.join(" and ")} this week.`;
  return good.length > 0 ? `${heard}, with ${good.join(" and ")}.` : `${heard}.`;
}

function slide(kind: SlideKind, text: string): Slide {
  return { kind, tab: TABS[kind], text };
}

export function slidesOf(recap: Recap): Slide[] {
  const label = weekLabel(recap.week);
  if (recap.quiet) {
    const step = recap.next[0];
    const idea = step ? ` One idea for this week: ${stepCopy(step).title}.` : "";
    return [slide("quiet", `A quiet week, ${label}. Weeks like this happen.${idea}`)];
  }
  const slides: Slide[] = [
    slide("opening", `Your week with Otto, ${label}. ${recapSummary(recap)}`),
  ];
  const lines = effortLines(recap);
  if (lines.length > 0) {
    const compared = effortComparison(recap);
    slides.push(
      slide(
        "effort",
        `${lines.map((line) => `${line.count} ${line.label}`).join(", ")}.${compared ? ` ${compared.text}.` : ""}`,
      ),
    );
  }
  const { momentum } = recap;
  if (momentum.replies > 0 || momentum.moves.length > 0) {
    const moves = momentum.moves
      .map((move) => `${move.company}: ${journeyText(move.path)}.`)
      .join(" ");
    slides.push(slide("momentum", `${momentumLine(recap)} ${moves}`.trim()));
  }
  const { share, portfolio } = recap.attention;
  if (share || portfolio) {
    const parts = [
      share ? viewsText(share, "share") : null,
      portfolio ? viewsText(portfolio, "portfolio") : null,
    ].filter((part) => part !== null);
    slides.push(slide("attention", parts.join(" ")));
  }
  if (recap.working) {
    const working = recap.working;
    slides.push(
      slide(
        "working",
        working.kind === "finding"
          ? `${working.lead}${working.mark}${working.tail} ${working.rest}`
          : working.text,
      ),
    );
  }
  if (recap.jobs) {
    const { matches, best, saved } = recap.jobs;
    const parts = [
      matches ? `${formatCount(matches, "new match", "new matches")} this week.` : null,
      best ? `Best match: ${best.title} at ${best.company}.` : null,
      saved ? `You saved ${formatCount(saved, "job")}.` : null,
    ].filter((part) => part !== null);
    slides.push(slide("jobs", parts.join(" ")));
  }
  if (recap.activeDays.length > 0) {
    slides.push(slide("days", `${daysActiveText(recap.activeDays.length)} this week.`));
  }
  if (recap.next.length > 0) {
    slides.push(
      slide("next", `For next week: ${recap.next.map((step) => stepCopy(step).title).join(", ")}.`),
    );
  }
  return slides;
}
