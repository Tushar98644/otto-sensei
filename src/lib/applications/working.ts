import type { Resume } from "@/lib/resume/schema";
import { DAY_MS } from "@/lib/time";
import type { Writing } from "@/lib/writings/schema";
import type { Application } from "./schema";
import { formatCount, outcomeOf } from "./stats";

// What's working: the person's own applications compared two ways, in plain words, honest about small numbers.

// Each side of a comparison needs this many counted applications before Otto says which does better.
export const MIN_GROUP = 5;
// An application this young with no reply yet isn't counted: it may still hear back.
export const REPLY_WAIT_DAYS = 7;
// Rates closer than this read as the same.
const SAME_WITHIN = 0.05;

export type WorkingApplication = Pick<
  Application,
  "id" | "status" | "stageReached" | "appliedAt" | "resumeId"
>;

export type ResumeKind = "tailored" | "general";

export type Group = {
  sent: number;
  counted: number;
  replies: number;
  interviews: number;
};

export type Topic = "resume" | "letter";
export type Measure = "interviews" | "replies";
export type Leader = "with" | "without" | "same";

export type Comparison = {
  topic: Topic;
  // Tailored versions, or applications with a cover letter.
  with: Group;
  // The general resume, or applications without a letter.
  without: Group;
  ready: boolean;
  measure: Measure;
  leader: Leader | null;
};

export type SuggestionKind = "log" | "tailor" | "letter" | "apply" | "wait";

export type Working = {
  total: number;
  counted: number;
  // Sent in the past week and not heard from yet.
  waiting: number;
  resume: Comparison;
  // Null when no application has a letter: there is nothing to compare.
  letter: Comparison | null;
  suggestion: SuggestionKind;
};

export type WorkingInput = {
  applications: readonly WorkingApplication[];
  // Resumes still in Otto, by id; a deleted one or a resume not in Otto has no kind.
  kinds: ReadonlyMap<string, ResumeKind>;
  // Applications a cover letter was written for; null when letters can't be known (Free).
  lettered: ReadonlySet<string> | null;
  now: number;
};

// Samples never count: nobody applies with one.
export function resumeKinds(
  resumes: readonly Pick<Resume, "id" | "source" | "tailor">[],
): Map<string, ResumeKind> {
  const kinds = new Map<string, ResumeKind>();
  for (const resume of resumes) {
    if (resume.source === "sample") continue;
    kinds.set(resume.id, resume.tailor === null ? "general" : "tailored");
  }
  return kinds;
}

export function letteredApplications(
  writings: readonly Pick<Writing, "kind" | "applicationId">[],
): Set<string> {
  const ids = new Set<string>();
  for (const writing of writings) {
    if (writing.kind === "letter" && writing.applicationId) ids.add(writing.applicationId);
  }
  return ids;
}

// Any stage past Applied: an interview, an offer or a no all count as hearing back.
export function heardBack(application: WorkingApplication): boolean {
  return (
    application.stageReached !== "applied" ||
    (application.status !== "applied" && application.status !== "no_reply")
  );
}

export function isCounted(application: WorkingApplication, now: number): boolean {
  return (
    heardBack(application) ||
    application.status === "no_reply" ||
    now - application.appliedAt >= REPLY_WAIT_DAYS * DAY_MS
  );
}

function emptyGroup(): Group {
  return { sent: 0, counted: 0, replies: 0, interviews: 0 };
}

function add(group: Group, application: WorkingApplication, now: number): void {
  group.sent += 1;
  if (!isCounted(application, now)) return;
  group.counted += 1;
  if (heardBack(application)) group.replies += 1;
  if (outcomeOf(application).interviewed) group.interviews += 1;
}

function rate(group: Group, measure: Measure): number {
  if (group.counted === 0) return 0;
  return (measure === "interviews" ? group.interviews : group.replies) / group.counted;
}

export function compare(topic: Topic, withGroup: Group, withoutGroup: Group): Comparison {
  const ready = withGroup.counted >= MIN_GROUP && withoutGroup.counted >= MIN_GROUP;
  const measure: Measure =
    withGroup.interviews + withoutGroup.interviews > 0 ? "interviews" : "replies";
  let leader: Leader | null = null;
  if (ready) {
    const gap = rate(withGroup, measure) - rate(withoutGroup, measure);
    leader = Math.abs(gap) < SAME_WITHIN ? "same" : gap > 0 ? "with" : "without";
  }
  return { topic, with: withGroup, without: withoutGroup, ready, measure, leader };
}

function suggestionFor(
  resume: Comparison,
  letter: Comparison | null,
  total: number,
  counted: number,
): SuggestionKind {
  if (resume.ready && resume.leader === "with") return "tailor";
  if (letter?.ready && letter.leader === "with") return "letter";
  if (resume.ready) return "apply";
  if (total === 0 || resume.with.sent + resume.without.sent === 0) return "log";
  if (counted === 0) return "wait";
  return resume.with.counted < MIN_GROUP ? "tailor" : "log";
}

export function whatsWorking({ applications, kinds, lettered, now }: WorkingInput): Working {
  const tailored = emptyGroup();
  const general = emptyGroup();
  const withLetter = emptyGroup();
  const withoutLetter = emptyGroup();
  let counted = 0;
  for (const application of applications) {
    if (isCounted(application, now)) counted += 1;
    const kind = application.resumeId === null ? undefined : kinds.get(application.resumeId);
    if (kind) add(kind === "tailored" ? tailored : general, application, now);
    if (lettered) add(lettered.has(application.id) ? withLetter : withoutLetter, application, now);
  }
  const total = applications.length;
  const resume = compare("resume", tailored, general);
  const letter =
    lettered && withLetter.sent > 0 ? compare("letter", withLetter, withoutLetter) : null;
  return {
    total,
    counted,
    waiting: total - counted,
    resume,
    letter,
    suggestion: suggestionFor(resume, letter, total, counted),
  };
}

const SUBJECTS: Record<Topic, { with: string; without: string }> = {
  resume: { with: "Your tailored versions", without: "Your general resume" },
  letter: { with: "With a cover letter", without: "Without one" },
};

function outcomeWords(group: Group, measure: Measure): string {
  const hits = measure === "interviews" ? group.interviews : group.replies;
  return `${hits} of ${group.counted}`;
}

export type Finding = { lead: string; mark: string; tail: string; rest: string };

// The sentence a comparison makes, split so the leading number can be marked.
export function findingOf(comparison: Comparison): Finding {
  const subject = SUBJECTS[comparison.topic];
  const { measure } = comparison;
  const withWords = outcomeWords(comparison.with, measure);
  const withoutWords = outcomeWords(comparison.without, measure);
  if (comparison.topic === "resume") {
    const verb = measure === "interviews" ? "got interviews" : "heard back";
    return {
      lead: `${subject.with} ${verb} `,
      mark: withWords,
      tail: " times.",
      rest: `${subject.without}: ${withoutWords}.`,
    };
  }
  const verb = measure === "interviews" ? "got an interview" : "heard back";
  return {
    lead: `${subject.with}, `,
    mark: withWords,
    tail: ` ${verb}.`,
    rest: `${subject.without}: ${withoutWords}.`,
  };
}

export function findingText(finding: Finding): string {
  return `${finding.lead}${finding.mark}${finding.tail} ${finding.rest}`;
}

// What's missing before a comparison can be made, never a percentage.
export function notEnoughLine(comparison: Comparison): string {
  const { with: a, without: b } = comparison;
  if (comparison.topic === "letter") {
    return `Cover letters: ${a.counted} counted with one, ${b.counted} without. Otto compares from ${MIN_GROUP} of each.`;
  }
  if (a.sent + b.sent === 0) {
    return "None of these say which of your resumes you sent, so there's nothing to compare yet.";
  }
  return `Counted so far: ${formatCount(a.counted, "tailored version")} and ${formatCount(b.counted, "general resume")}. Otto compares from ${MIN_GROUP} of each.`;
}

export function waitingLine(waiting: number): string | null {
  if (waiting === 0) return null;
  return `${formatCount(waiting, "application")} from the past ${REPLY_WAIT_DAYS} days ${waiting === 1 ? "isn't" : "aren't"} counted yet: replies take time.`;
}

export type SuggestionCopy = { text: string; action: string | null };

export function suggestionCopy(working: Working): SuggestionCopy {
  switch (working.suggestion) {
    case "tailor":
      return working.resume.ready
        ? { text: "Tailor the next one too: it works for you.", action: "Tailor a resume" }
        : {
            text: "Send a tailored version to your next few jobs, so there's something to compare.",
            action: "Tailor a resume",
          };
    case "letter":
      return {
        text: `Write a letter for the next one: yours get more ${working.letter?.measure ?? "replies"}.`,
        action: "Write a letter",
      };
    case "apply":
      return {
        text:
          working.resume.leader === "same"
            ? "Both do about as well so far. Save tailoring for the jobs you want most, and keep applying."
            : "Your general resume does better so far. Save tailoring for the jobs you want most.",
        action: "Find jobs",
      };
    case "wait":
      return {
        text: `Replies take time. Otto counts each application once it's ${REPLY_WAIT_DAYS} days old or you hear back.`,
        action: null,
      };
    case "log":
      return {
        text:
          working.total === 0
            ? `Log each job you apply to, with the resume you sent. Otto compares from ${MIN_GROUP} of each kind.`
            : "When you log the next one, pick the resume you sent, so Otto can compare.",
        action: "Add application",
      };
  }
}
