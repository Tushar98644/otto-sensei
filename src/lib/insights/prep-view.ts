import type { Resume } from "@/lib/resume/schema";
import { byRound, type InterviewPrep, type PrepQuestion, type PrepRound, type PrepTarget } from "./prep";
import { savedJobText, savedJobUrl } from "./saved-job";

// Kept out of the component so they're tested.

// Best first: the post saved with the tailored copy, a fresh read of the job link, then pasting.
export type PrepJobSource =
  | { kind: "saved"; text: string }
  | { kind: "link"; url: string }
  | { kind: "paste" };

export function prepJobSource(
  target: Pick<PrepTarget, "jobUrl">,
  copy: Resume | null | undefined,
): PrepJobSource {
  const text = savedJobText(copy);
  if (text) return { kind: "saved", text };
  const url = target.jobUrl || savedJobUrl(copy);
  return url ? { kind: "link", url } : { kind: "paste" };
}

// The version sent when still in this browser, else the newest base resume, else the newest of any.
export function prepResume(target: Pick<PrepTarget, "resumeId">, resumes: readonly Resume[]): Resume | null {
  const sent = target.resumeId ? resumes.find((resume) => resume.id === target.resumeId) : undefined;
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
      [story.situation, story.task, story.action, story.result].filter((part) => BLANK.test(part)).length,
    0,
  );
}

// What each round is for, in plain words, shown under its heading.
export const ROUND_COPY: Record<PrepRound, { label: string; about: string }> = {
  opening: { label: "Opening", about: "The first few minutes: who you are and what brought you here." },
  fit: { label: "Role fit", about: "Why this job, and why you." },
  skills: { label: "Skills", about: "The work itself, built from what the post asks for most." },
  behavioural: { label: "Behavioural", about: "Real times from your past: what you did and what changed." },
  closing: { label: "Closing", about: "Wrapping up, just before your questions." },
};

export type NumberedQuestion = { item: PrepQuestion; number: number };

export type PrepRoundGroup = {
  round: PrepRound;
  // Counts only the rounds this pack has, so a pack without a closing question still reads 1, 2, 3.
  number: number;
  questions: NumberedQuestion[];
};

export function orderedQuestions(prep: Pick<InterviewPrep, "questions">): NumberedQuestion[] {
  return byRound(prep.questions).map((item, index) => ({ item, number: index + 1 }));
}

/** Rounds with no questions are left out. */
export function prepRounds(prep: Pick<InterviewPrep, "questions">): PrepRoundGroup[] {
  const groups: PrepRoundGroup[] = [];
  for (const question of orderedQuestions(prep)) {
    const last = groups.at(-1);
    if (last?.round === question.item.round) last.questions.push(question);
    else groups.push({ round: question.item.round, number: groups.length + 1, questions: [question] });
  }
  return groups;
}

export function storyUses(prep: Pick<InterviewPrep, "questions" | "stories">): number[][] {
  const uses = prep.stories.map((): number[] => []);
  for (const { item, number } of orderedQuestions(prep)) {
    if (item.story !== null) uses[item.story]?.push(number);
  }
  return uses;
}

export function prepToText(prep: InterviewPrep, target: Pick<PrepTarget, "company" | "role">): string {
  const role = [target.role || prep.job.title, target.company || prep.job.company].filter(Boolean).join(" at ");
  const out: string[] = [`Interview prep${role ? `: ${role}` : ""}`, ""];
  for (const group of prepRounds(prep)) {
    out.push(`Round ${group.number} · ${ROUND_COPY[group.round].label}`);
    for (const { item, number } of group.questions) {
      out.push(`${number}. ${item.question}`);
      if (item.checking) out.push(`   What they're checking: ${item.checking}`);
      if (item.points.length > 0) out.push("   Hit these points:", ...item.points.map((point) => `   - ${point}`));
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
