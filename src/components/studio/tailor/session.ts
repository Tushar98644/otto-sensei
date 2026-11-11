import { TEXT_LIMITS } from "@/config/plans";
import type { TailorResult } from "@/lib/ai/types";
import { sameJobUrl } from "@/lib/applications/thread";
import type { JobPosting, JobSource } from "@/lib/api/types";
import { readJsonItem, removeItem, writeJsonItem } from "@/lib/browser-storage";
import type { Resume } from "@/lib/resume/schema";
import type { ScreeningQuestion } from "@/lib/ats/types";
import type { RequirementChoice, TailorChoices } from "./apply";

// Keeps the job post (read from a link or pasted) and the last result for this browser tab, so
// leaving the step (or reloading) neither loses the job nor spends another tailor on the same post.

export type ReadJob = Omit<JobPosting, "text">;

export type TailorDraft = {
  title: string;
  company: string;
  text: string;
  // Optional, like the two below: drafts saved before job links have none.
  link?: string;
  // Set while title, company and text are exactly what was read from the link.
  posting?: ReadJob | null;
  paste?: boolean;
};

export type SavedWriting = { text: string; warnings: string[]; demo: boolean; savedId?: string };
export type SavedAnswer = SavedWriting & { id: string; question: string };

export type SavedResult = {
  id: string;
  // The resume the result was made for: its bullet ids only fit that one.
  sourceId: string;
  // To tell an unchanged resume from an edited one. Optional: older results don't have it.
  sourceUpdatedAt?: number;
  job: TailorDraft;
  result: TailorResult;
  // Sample output (no AI key), kept so the demo note survives a reload. Older results were real.
  demo?: boolean;
  // Kept so leaving the step doesn't lose the answers. Optional, like demo.
  choices?: TailorChoices;
  letter?: SavedWriting;
  answers?: SavedAnswer[];
  copyId?: string;
};

export const MAX_SAVED_ANSWERS = 5;

type Saved = { version: 1; draft: TailorDraft; last: SavedResult | null };

const STORAGE_KEY = "otto-tailor-v1";

export const EMPTY_DRAFT: TailorDraft = { title: "", company: "", text: "" };

export function sameRun(last: SavedResult, source: Resume, job: TailorDraft): boolean {
  const same = (a: string, b: string) => a.trim() === b.trim();
  return (
    last.sourceId === source.id &&
    last.sourceUpdatedAt === source.updatedAt &&
    same(last.job.text, job.text) &&
    same(last.job.title, job.title) &&
    same(last.job.company, job.company)
  );
}

const isString = (value: unknown): value is string => typeof value === "string";
const isTime = (value: unknown): value is number | null =>
  value === null || (typeof value === "number" && Number.isFinite(value));
const SOURCES = new Set<string>([
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "recruitee",
  "personio",
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
    ...(isString(value.savedId) ? { savedId: value.savedId } : {}),
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

// Older results lack requirements; extras are checked one by one so a bad one isn't fatal.
function toSavedResult(last: SavedResult): SavedResult {
  const requirements = Array.isArray(last.result.requirements) ? last.result.requirements : [];
  const clean: SavedResult = {
    id: last.id,
    sourceId: last.sourceId,
    job: last.job,
    result: { ...last.result, requirements },
  };
  if (last.demo === true) clean.demo = true;
  if (typeof last.sourceUpdatedAt === "number") clean.sourceUpdatedAt = last.sourceUpdatedAt;
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
  const saved = readJsonItem(STORAGE_KEY, "session") as Partial<Saved> | null;
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
}

// A job picked on the Jobs tab; the step reads its link at once. `text` is the stored post, the
// backup when the link can't be read; readLink false (the feeds) uses it straight away.
export type QueuedJob = {
  link: string;
  title: string;
  company: string;
  location: string;
  text: string;
  postedAt: number | null;
  readLink: boolean;
  // The opening's id on the Jobs tab, kept on the copy (tailor.jobId) so they find each other.
  jobId?: string;
  // Already read by the server for the Jobs tab: used as if read here, so it isn't read twice.
  posting?: ReadJob;
};

const QUEUE_KEY = "otto-tailor-queued-v1";
// Kept for the tab's life after the step takes the queued job, so the copy can name its opening.
const JOB_REF_KEY = "otto-tailor-job-ref-v1";

// Storage blocked: the step opens empty and the person pastes the link themselves.
export function queueJobForTailor(job: QueuedJob): void {
  const queued = { ...job, text: job.text.slice(0, TEXT_LIMITS.jobPostChars) };
  if (!writeJsonItem(QUEUE_KEY, queued, "session")) return;
  if (job.jobId) writeJsonItem(JOB_REF_KEY, { id: job.jobId, link: job.link }, "session");
  else removeItem(JOB_REF_KEY, "session");
}

/** The Jobs tab opening behind this link, only while it's still the link sent from there. */
export function queuedJobIdFor(link: string | undefined): string | null {
  const ref = readJsonItem(JOB_REF_KEY, "session") as { id?: unknown; link?: unknown } | null;
  if (!link || typeof ref?.id !== "string" || typeof ref.link !== "string") return null;
  return sameJobUrl(ref.link, link) ? ref.id : null;
}

/** The queued job, left in place: the step takes it once it has mounted (see takeQueuedJob). */
export function peekQueuedJob(): QueuedJob | null {
  const job = readJsonItem(QUEUE_KEY, "session") as Partial<QueuedJob> | null;
  if (
    !job ||
    !isString(job.link) ||
    !isString(job.title) ||
    !isString(job.company) ||
    !isString(job.location) ||
    !isString(job.text) ||
    typeof job.readLink !== "boolean"
  ) {
    return null;
  }
  const posting = readJob(job.posting);
  return {
    link: job.link,
    title: job.title,
    company: job.company,
    location: job.location,
    text: job.text,
    postedAt: typeof job.postedAt === "number" ? job.postedAt : null,
    readLink: job.readLink,
    ...(posting ? { posting } : {}),
  };
}

export function clearQueuedJob(): void {
  removeItem(QUEUE_KEY, "session");
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
  // Storage full or blocked: the step still works, it just won't survive a reload.
  writeJsonItem(STORAGE_KEY, saved, "session");
}
