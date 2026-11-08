import type { Resume } from "@/lib/resume/schema";
import type { InterviewPrep, PrepTarget } from "./prep";
import { savedJobText, savedJobUrl } from "./saved-job";

// Client-safe and pure: the prep page's decisions, kept out of the component so they're tested.

// Where the job text for a pack comes from, best first: the post saved with the tailored copy,
// then a fresh read of the job link, then the person pastes it.
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

/**
 * The resume a pack is built from: the version sent when it's still in this browser, else the
 * newest base resume (not another job's tailored copy), else the newest of any kind.
 */
export function prepResume(target: Pick<PrepTarget, "resumeId">, resumes: readonly Resume[]): Resume | null {
  const sent = target.resumeId ? resumes.find((resume) => resume.id === target.resumeId) : undefined;
  if (sent) return sent;
  const newest = [...resumes].sort((a, b) => b.updatedAt - a.updatedAt);
  return newest.find((resume) => resume.tailor === null) ?? newest[0] ?? null;
}

const BLANK = /(\[[^\]\n]+\])/;

/** Splits text around its [blanks], so the page can mark each one for the person to fill. */
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

/** The whole pack as plain text, for notes or a print-out. */
export function prepToText(prep: InterviewPrep, target: Pick<PrepTarget, "company" | "role">): string {
  const role = [target.role || prep.job.title, target.company || prep.job.company].filter(Boolean).join(" at ");
  const out: string[] = [`Interview prep${role ? `: ${role}` : ""}`, ""];
  if (prep.questions.length > 0) {
    out.push("Likely questions");
    prep.questions.forEach((item, index) => {
      out.push(`${index + 1}. ${item.question}`);
      if (item.why) out.push(`   Why: ${item.why}`);
    });
    out.push("");
  }
  if (prep.stories.length > 0) {
    out.push("Your stories (STAR)");
    for (const story of prep.stories) {
      out.push(`- ${story.title}`, `  From: "${story.line}" (${story.place})`);
      out.push(`  Situation: ${story.situation}`, `  Task: ${story.task}`);
      out.push(`  Action: ${story.action}`, `  Result: ${story.result}`);
    }
    out.push("");
  }
  if (prep.asks.length > 0) {
    out.push("Questions to ask them", ...prep.asks.map((ask) => `- ${ask}`));
  }
  return out.join("\n").trimEnd();
}
