import type { Resume } from "@/lib/resume/schema";
import type {
  InterviewPrep,
  PrepQuestion,
  PrepTarget,
  TechnicalQuestion,
  TechnicalSection,
} from "./prep";
import { FOCUS_COPY, kindLabel, LEVEL_COPY } from "./prep-focus";
import { byRound, type PrepRound } from "./prep-rounds";
import { savedJobText, savedJobUrl } from "./saved-job";

export type PrepJobSource =
  { kind: "saved"; text: string } | { kind: "link"; url: string } | { kind: "paste" };

export function prepJobSource(
  target: Pick<PrepTarget, "jobUrl">,
  copy: Resume | null | undefined,
): PrepJobSource {
  const text = savedJobText(copy);
  if (text) return { kind: "saved", text };
  const url = target.jobUrl || savedJobUrl(copy);
  return url ? { kind: "link", url } : { kind: "paste" };
}

export function prepResume(
  target: Pick<PrepTarget, "resumeId">,
  resumes: readonly Resume[],
): Resume | null {
  const sent = target.resumeId
    ? resumes.find((resume) => resume.id === target.resumeId)
    : undefined;
  if (sent) return sent;
  const newest = [...resumes].sort((a, b) => b.updatedAt - a.updatedAt);
  return newest.find((resume) => resume.tailor === null) ?? newest[0] ?? null;
}

const BLANK = /(\[[^\]\n]+\])/;

export function splitBlanks(text: string): { text: string; blank: boolean }[] {
  return text
    .split(BLANK)
    .filter((part) => part !== "")
    .map((part) => ({ text: part, blank: BLANK.test(part) }));
}

export function countBlanks(prep: InterviewPrep): number {
  return prep.stories.reduce(
    (sum, story) =>
      sum +
      [story.situation, story.task, story.action, story.result].filter((part) => BLANK.test(part))
        .length,
    0,
  );
}

export const ROUND_COPY: Record<PrepRound, { label: string; about: string }> = {
  opening: {
    label: "Opening",
    about: "The first few minutes: who you are and what brought you here.",
  },
  fit: { label: "Role fit", about: "Why this job, and why you." },
  skills: { label: "Skills", about: "The work itself, built from what the post asks for most." },
  behavioural: {
    label: "Behavioural",
    about: "Real times from your past: what you did and what changed.",
  },
  closing: { label: "Closing", about: "Wrapping up, just before your questions." },
};

export function questionCount(prep: Pick<InterviewPrep, "questions" | "technical">): number {
  return prep.questions.length + (prep.technical?.questions.length ?? 0);
}

export type NumberedQuestion = { item: PrepQuestion; number: number };
export type NumberedTechnical = { item: TechnicalQuestion; number: number };

export type PrepRoundGroup = {
  round: PrepRound;
  number: number;
  questions: NumberedQuestion[];
};

export type TechnicalStop = {
  round: "technical";
  number: number;
  section: TechnicalSection;
  questions: NumberedTechnical[];
};

export type PrepStop = PrepRoundGroup | TechnicalStop;

type PackQuestions = Pick<InterviewPrep, "questions" | "technical">;

// The technical round runs after the opening and fit questions, before the behavioural ones.
const BEFORE_TECHNICAL: ReadonlySet<PrepRound> = new Set(["opening", "fit", "skills"]);

export function prepStops(prep: PackQuestions): PrepStop[] {
  const general = byRound(prep.questions);
  const technical = prep.technical?.questions.length ? prep.technical : null;
  const split = technical ? general.findIndex((item) => !BEFORE_TECHNICAL.has(item.round)) : -1;
  const at = split === -1 ? general.length : split;
  const stops: PrepStop[] = [];
  let number = 0;
  const addGeneral = (items: readonly PrepQuestion[]) => {
    for (const item of items) {
      number += 1;
      const last = stops.at(-1);
      if (last && last.round === item.round) last.questions.push({ item, number });
      else
        stops.push({ round: item.round, number: stops.length + 1, questions: [{ item, number }] });
    }
  };
  addGeneral(general.slice(0, at));
  if (technical) {
    const first = number + 1;
    stops.push({
      round: "technical",
      number: stops.length + 1,
      section: technical,
      questions: technical.questions.map((item, index) => ({ item, number: first + index })),
    });
    number += technical.questions.length;
  }
  addGeneral(general.slice(at));
  return stops;
}

export function orderedQuestions(prep: PackQuestions): NumberedQuestion[] {
  return prepStops(prep).flatMap((stop) => (stop.round === "technical" ? [] : stop.questions));
}

export function stopCopy(stop: PrepStop): { label: string; about: string } {
  if (stop.round !== "technical") return ROUND_COPY[stop.round];
  const copy = FOCUS_COPY[stop.section.focus];
  return { label: copy.section, about: copy.about };
}

export function focusLine(section: Pick<TechnicalSection, "focus" | "level">): string {
  return `${FOCUS_COPY[section.focus].label} · ${LEVEL_COPY[section.level]}`;
}

export type PracticeStep =
  | { kind: "general"; item: PrepQuestion; number: number; stop: number; label: string }
  | { kind: "technical"; item: TechnicalQuestion; number: number; stop: number; label: string };

export function practiceSteps(prep: PackQuestions): PracticeStep[] {
  return prepStops(prep).flatMap((stop): PracticeStep[] => {
    const label = stopCopy(stop).label;
    if (stop.round === "technical") {
      return stop.questions.map(({ item, number }) => ({
        kind: "technical",
        item,
        number,
        stop: stop.number,
        label: `${label} · ${kindLabel(stop.section.focus, item.kind)}`,
      }));
    }
    return stop.questions.map(({ item, number }) => ({
      kind: "general",
      item,
      number,
      stop: stop.number,
      label,
    }));
  });
}

export function storyUses(
  prep: Pick<InterviewPrep, "questions" | "stories" | "technical">,
): number[][] {
  const uses = prep.stories.map((): number[] => []);
  for (const { item, number } of orderedQuestions(prep)) {
    if (item.story !== null) uses[item.story]?.push(number);
  }
  return uses;
}

function technicalText(stop: TechnicalStop): string[] {
  const out = [`Round ${stop.number} · ${stopCopy(stop).label} (${focusLine(stop.section)})`];
  for (const { item, number } of stop.questions) {
    const label = [kindLabel(stop.section.focus, item.kind), item.topic]
      .filter(Boolean)
      .join(" · ");
    out.push(`${number}. [${label}] ${item.question}`);
    if (item.assume) out.push(`   ${item.assume}`);
    if (item.resume) out.push(`   From your resume: "${item.resume.line}" (${item.resume.place})`);
    if (item.covers.length > 0)
      out.push("   What a strong answer covers:", ...item.covers.map((cover) => `   - ${cover}`));
    if (item.pitfalls.length > 0)
      out.push("   Common pitfalls:", ...item.pitfalls.map((pitfall) => `   - ${pitfall}`));
    if (item.probes.length > 0)
      out.push("   Follow-up probes:", ...item.probes.map((probe) => `   - ${probe}`));
  }
  return out;
}

export function prepToText(
  prep: InterviewPrep,
  target: Pick<PrepTarget, "company" | "role">,
): string {
  const role = [target.role || prep.job.title, target.company || prep.job.company]
    .filter(Boolean)
    .join(" at ");
  const out: string[] = [`Interview prep${role ? `: ${role}` : ""}`, ""];
  for (const group of prepStops(prep)) {
    if (group.round === "technical") {
      out.push(...technicalText(group), "");
      continue;
    }
    out.push(`Round ${group.number} · ${ROUND_COPY[group.round].label}`);
    for (const { item, number } of group.questions) {
      out.push(`${number}. ${item.question}`);
      if (item.checking) out.push(`   What they're checking: ${item.checking}`);
      if (item.points.length > 0)
        out.push("   Hit these points:", ...item.points.map((point) => `   - ${point}`));
      const story = item.story === null ? undefined : prep.stories[item.story];
      if (story) out.push(`   Use your story: ${story.title}`);
      if (item.followUp) out.push(`   Likely follow-up: ${item.followUp}`);
    }
    out.push("");
  }
  if (prep.asks.length > 0) {
    out.push("Your turn: questions to ask them", ...prep.asks.map((ask) => `- ${ask}`), "");
  }
  if (prep.stories.length > 0) {
    out.push("Your stories (STAR)");
    for (const story of prep.stories) {
      out.push(`- ${story.title}`, `  From: "${story.line}" (${story.place})`);
      out.push(`  Situation: ${story.situation}`, `  Task: ${story.task}`);
      out.push(`  Action: ${story.action}`, `  Result: ${story.result}`);
    }
  }
  return out.join("\n").trimEnd();
}
