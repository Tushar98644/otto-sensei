import type { InterviewPrep } from "@/lib/insights/prep";

// The interview-day brief: the prep pack's key points, shown in the app. It never spends AI.

export const BRIEF_LISTED = { stories: 3, questions: 3, asks: 3 } as const;

export type Brief = { stories: string[]; questions: string[]; asks: string[] };

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

const plain = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

// A title that only repeats the start of its line is dropped, so the line reads once.
export function storyLine(story: Pick<InterviewPrep["stories"][number], "title" | "line">): string {
  const title = story.title.trim();
  const line = story.line.trim();
  if (!title || plain(line).startsWith(plain(title))) return clip(line || title, 160);
  return line ? clip(`${title}: ${line}`, 160) : title;
}

const routine = (round: string) => Number(round === "opening" || round === "closing");

// The questions most worth a last look: the opener and the wrap-up everyone gets go last.
function likelyQuestions(prep: InterviewPrep): string[] {
  return [...prep.questions]
    .sort((a, b) => routine(a.round) - routine(b.round))
    .map((question) => question.question.trim())
    .filter(Boolean)
    .slice(0, BRIEF_LISTED.questions);
}

export function briefOf(prep: InterviewPrep): Brief {
  return {
    stories: prep.stories.slice(0, BRIEF_LISTED.stories).map(storyLine).filter(Boolean),
    questions: likelyQuestions(prep),
    asks: prep.asks
      .slice(0, BRIEF_LISTED.asks)
      .map((ask) => ask.trim())
      .filter(Boolean),
  };
}
