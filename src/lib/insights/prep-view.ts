import type { Resume } from "@/lib/resume/schema";
import type {
  InterviewPrep,
  PrepQuestion,
  PrepTarget,
  TechnicalQuestion,
  TechnicalSection,
} from "./prep";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import EN_PREP from "@/i18n/messages/en/prep";
import type { RoleFocus, TechnicalKind } from "./prep-focus";
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

// The words for rounds, focuses and the copied text: the dashboard passes its reader's, English otherwise.
export type PrepCopy = Pick<Messages["prep"], "rounds" | "focus" | "levels" | "kinds" | "text">;

export const ROUND_COPY: Record<PrepRound, { label: string; about: string }> = EN_PREP.rounds;

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

export function stopCopy(
  stop: PrepStop,
  copy: PrepCopy = EN_PREP,
): { label: string; about: string } {
  if (stop.round !== "technical") return copy.rounds[stop.round];
  const focus = copy.focus[stop.section.focus];
  return { label: focus.section, about: focus.about };
}

export function kindName(focus: RoleFocus, kind: TechnicalKind, copy: PrepCopy = EN_PREP): string {
  const entry = copy.focus[focus];
  const kinds: Partial<Record<TechnicalKind, string>> | undefined =
    "kinds" in entry ? entry.kinds : undefined;
  return kinds?.[kind] ?? copy.kinds[kind];
}

export function focusLine(
  section: Pick<TechnicalSection, "focus" | "level">,
  copy: PrepCopy = EN_PREP,
): string {
  return `${copy.focus[section.focus].label} · ${copy.levels[section.level]}`;
}

export type PracticeStep =
  | { kind: "general"; item: PrepQuestion; number: number; stop: number; label: string }
  | { kind: "technical"; item: TechnicalQuestion; number: number; stop: number; label: string };

export function practiceSteps(prep: PackQuestions, copy: PrepCopy = EN_PREP): PracticeStep[] {
  return prepStops(prep).flatMap((stop): PracticeStep[] => {
    const label = stopCopy(stop, copy).label;
    if (stop.round === "technical") {
      return stop.questions.map(({ item, number }) => ({
        kind: "technical",
        item,
        number,
        stop: stop.number,
        label: `${label} · ${kindName(stop.section.focus, item.kind, copy)}`,
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

function technicalText(stop: TechnicalStop, copy: PrepCopy): string[] {
  const { text } = copy;
  const title = stopCopy(stop, copy).label;
  const focus = focusLine(stop.section, copy);
  const out = [fmt(text.technicalRound, { number: stop.number, label: title, focus })];
  for (const { item, number } of stop.questions) {
    const label = [kindName(stop.section.focus, item.kind, copy), item.topic]
      .filter(Boolean)
      .join(" · ");
    out.push(`${number}. [${label}] ${item.question}`);
    if (item.assume) out.push(`   ${item.assume}`);
    if (item.resume) out.push(`   ${fmt(text.fromResume, item.resume)}`);
    if (item.covers.length > 0)
      out.push(`   ${text.covers}`, ...item.covers.map((cover) => `   - ${cover}`));
    if (item.pitfalls.length > 0)
      out.push(`   ${text.pitfalls}`, ...item.pitfalls.map((pitfall) => `   - ${pitfall}`));
    if (item.probes.length > 0)
      out.push(`   ${text.probes}`, ...item.probes.map((probe) => `   - ${probe}`));
  }
  return out;
}

export function prepToText(
  prep: InterviewPrep,
  target: Pick<PrepTarget, "company" | "role">,
  copy: PrepCopy = EN_PREP,
): string {
  const { text } = copy;
  const title = target.role || prep.job.title;
  const company = target.company || prep.job.company;
  const role = title && company ? fmt(text.roleAt, { role: title, company }) : title || company;
  const out: string[] = [role ? fmt(text.titleFor, { role }) : text.title, ""];
  for (const group of prepStops(prep)) {
    if (group.round === "technical") {
      out.push(...technicalText(group, copy), "");
      continue;
    }
    out.push(fmt(text.round, { number: group.number, label: copy.rounds[group.round].label }));
    for (const { item, number } of group.questions) {
      out.push(`${number}. ${item.question}`);
      if (item.checking) out.push(`   ${fmt(text.checking, { text: item.checking })}`);
      if (item.points.length > 0)
        out.push(`   ${text.points}`, ...item.points.map((point) => `   - ${point}`));
      const story = item.story === null ? undefined : prep.stories[item.story];
      if (story) out.push(`   ${fmt(text.useStory, { title: story.title })}`);
      if (item.followUp) out.push(`   ${fmt(text.followUp, { text: item.followUp })}`);
    }
    out.push("");
  }
  if (prep.asks.length > 0) {
    out.push(text.asks, ...prep.asks.map((ask) => `- ${ask}`), "");
  }
  if (prep.stories.length > 0) {
    out.push(text.stories);
    for (const story of prep.stories) {
      out.push(`- ${story.title}`, `  ${fmt(text.from, story)}`);
      out.push(`  ${fmt(text.situation, { text: story.situation })}`);
      out.push(`  ${fmt(text.task, { text: story.task })}`);
      out.push(`  ${fmt(text.action, { text: story.action })}`);
      out.push(`  ${fmt(text.result, { text: story.result })}`);
    }
  }
  return out.join("\n").trimEnd();
}
