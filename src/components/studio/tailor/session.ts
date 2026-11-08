import { TEXT_LIMITS } from "@/config/plans";
import type { TailorResult } from "@/lib/ai/types";
import type { JobPosting, JobSource } from "@/lib/api/types";
import type { ScreeningQuestion } from "@/lib/ats/types";
import type { RequirementChoice, TailorChoices } from "./apply";

// Keeps the job post (read from a link or pasted) and the last result for this browser tab, so
// leaving the step (or reloading) neither loses the job nor spends another tailor on the same post.

// What Otto read from the job link, minus the text, which is the draft's own `text`.
export type ReadJob = Omit<JobPosting, "text">;

export type TailorDraft = {
  title: string;
  company: string;
  text: string;
  // The job link as typed. Optional, like the two below: drafts saved before job links have none.
  link?: string;
  // Set while title, company and text are exactly what was read from the link.
  posting?: ReadJob | null;
  // The person is typing the post in by hand: the backup when a link can't be read.
  paste?: boolean;
};

export type SavedWriting = { text: string; warnings: string[]; demo: boolean };
export type SavedAnswer = SavedWriting & { id: string; question: string };

export type SavedResult = {
  id: string;
  // The resume the result was made for: its bullet ids only fit that one.
  sourceId: string;
  // The post as it was sent, to tell when the draft has moved on.
  job: TailorDraft;
  result: TailorResult;
  // Sample output from a server without an AI key. Kept with the result so the demo note survives a
  // reload; optional because results saved before this field existed were real.
  demo?: boolean;
  // What the person picked in the results, so leaving the step (to check a line in the editor,
  // say) doesn't lose their answers. The fields below are optional for the same reason as demo.
  choices?: TailorChoices;
  // The cover letter as last edited, and the answers to application questions, newest first.
  letter?: SavedWriting;
  answers?: SavedAnswer[];
  // The tailored copy made from this result, which keeps the latest letter too.
  copyId?: string;
};

export const MAX_SAVED_ANSWERS = 5;

type Saved = { version: 1; draft: TailorDraft; last: SavedResult | null };

const STORAGE_KEY = "otto-tailor-v1";

export const EMPTY_DRAFT: TailorDraft = { title: "", company: "", text: "" };

const isString = (value: unknown): value is string => typeof value === "string";
const isTime = (value: unknown): value is number | null =>
  value === null || (typeof value === "number" && Number.isFinite(value));
const SOURCES = new Set<string>([
  "greenhouse",
  "lever",
  "ashby",
  "jsonld",
  "page",
] satisfies JobSource[]);
const isSource = (value: unknown): value is JobSource => isString(value) && SOURCES.has(value);

function readJob(value: unknown): ReadJob | null {
  const job = value as Partial<ReadJob> | null;
  if (
    !job ||
    !isString(job.url) ||
    !isSource(job.source) ||
    !isString(job.title) ||
    !isString(job.company) ||
    !isString(job.location) ||
    !isTime(job.firstPostedAt) ||
    !isTime(job.updatedAt ?? null) ||
    !isTime(job.closesAt ?? null)
  ) {
    return null;
  }
  const questions = toQuestions(job.questions);
  return {
    url: job.url,
    source: job.source,
    title: job.title,
    company: job.company,
    location: job.location,
    firstPostedAt: job.firstPostedAt,
    updatedAt: job.updatedAt ?? null,
    closesAt: job.closesAt ?? null,
    ...(questions.length > 0 ? { questions } : {}),
  };
}

const QUESTION_KINDS = new Set<string>([
  "yes_no",
  "single",
  "multi",
] satisfies ScreeningQuestion["kind"][]);

// Bad entries are dropped one by one; the job itself stays.
function toQuestions(value: unknown): ScreeningQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item: unknown): item is ScreeningQuestion =>
      isRecord(item) &&
      isString(item.label) &&
      typeof item.required === "boolean" &&
      isString(item.kind) &&
      QUESTION_KINDS.has(item.kind) &&
      Array.isArray(item.options) &&
      item.options.every(isString) &&
      typeof item.optionCount === "number",
  );
}

// The draft's known fields only; optional ones that don't check out are dropped, not the draft.
function toDraft(value: unknown): TailorDraft | null {
  const draft = value as Partial<TailorDraft> | null;
  if (!draft || !isString(draft.title) || !isString(draft.company) || !isString(draft.text))
    return null;
  const clean: TailorDraft = { title: draft.title, company: draft.company, text: draft.text };
  if (isString(draft.link)) clean.link = draft.link;
  const posting = readJob(draft.posting);
  if (posting) clean.posting = posting;
  if (typeof draft.paste === "boolean") clean.paste = draft.paste;
  return clean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isChoice(value: unknown): value is RequirementChoice {
  if (!isRecord(value)) return false;
  if (value.kind === "no") return true;
  const line = value.line;
  return (
    value.kind === "line" &&
    isRecord(line) &&
    isString(line.id) &&
    isString(line.parentId) &&
    isString(line.text)
  );
}

function toChoices(value: unknown): TailorChoices | undefined {
  if (!isRecord(value) || !isRecord(value.requirements) || !isRecord(value.reorder)) {
    return undefined;
  }
  if (typeof value.useSummary !== "boolean") return undefined;
  const requirements = Object.fromEntries(
    Object.entries(value.requirements).filter((entry): entry is [string, RequirementChoice] =>
      isChoice(entry[1]),
    ),
  );
  const reorder = Object.fromEntries(
    Object.entries(value.reorder).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
    ),
  );
  return { requirements, reorder, useSummary: value.useSummary };
}

function toWriting(value: unknown): SavedWriting | undefined {
  if (!isRecord(value) || !isString(value.text) || !Array.isArray(value.warnings)) return undefined;
  return {
    text: value.text,
    warnings: value.warnings.filter(isString),
    demo: value.demo === true,
  };
}

function toAnswers(value: unknown): SavedAnswer[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .flatMap((item: unknown) => {
      const writing = toWriting(item);
      if (!writing || !isRecord(item) || !isString(item.id) || !isString(item.question)) return [];
      return [{ ...writing, id: item.id, question: item.question }];
    })
    .slice(0, MAX_SAVED_ANSWERS);
}

// Light shape check: the data is our own, but storage can hold an older or hand-edited copy.
function isResult(value: unknown): value is TailorResult {
  const result = value as Partial<TailorResult> | null;
  return (
    Boolean(result?.job) &&
    Array.isArray(result?.keywords) &&
    Array.isArray(result?.askUser) &&
    Array.isArray(result?.bulletOrder) &&
    Array.isArray(result?.notes) &&
    isString(result?.summary)
  );
}

// Results saved before the screener view have no requirements; the optional extras are checked
// one by one, so a bad one is dropped without losing the result.
function toSavedResult(last: SavedResult): SavedResult {
  const requirements = Array.isArray(last.result.requirements) ? last.result.requirements : [];
  const clean: SavedResult = {
    id: last.id,
    sourceId: last.sourceId,
    job: last.job,
    result: { ...last.result, requirements },
  };
  if (last.demo === true) clean.demo = true;
  const choices = toChoices(last.choices);
  if (choices) clean.choices = choices;
  const letter = toWriting(last.letter);
  if (letter) clean.letter = letter;
  const answers = toAnswers(last.answers);
  if (answers?.length) clean.answers = answers;
  if (isString(last.copyId)) clean.copyId = last.copyId;
  return clean;
}

function read(): Saved | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<Saved> | null;
    const draft = saved?.version === 1 ? toDraft(saved.draft) : null;
    if (!saved || !draft) return null;
    const last = saved.last ?? null;
    const valid =
      last !== null &&
      isString(last.id) &&
      isString(last.sourceId) &&
      toDraft(last.job) !== null &&
      isResult(last.result);
    return { version: 1, draft, last: valid ? toSavedResult(last) : null };
  } catch {
    return null;
  }
}

export function loadDraft(): TailorDraft {
  return read()?.draft ?? EMPTY_DRAFT;
}

export function loadResult(sourceId: string): SavedResult | null {
  const last = read()?.last ?? null;
  return last?.sourceId === sourceId ? last : null;
}

export function saveTailorSession(draft: TailorDraft, last: SavedResult | null): void {
  // Over-long pastes are rejected before sending anyway; don't store more than could be sent.
  const saved: Saved = {
    version: 1,
    draft: { ...draft, text: draft.text.slice(0, TEXT_LIMITS.jobPostChars * 2) },
    last,
  };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Storage full or blocked: the step still works, it just won't survive a reload.
  }
}
