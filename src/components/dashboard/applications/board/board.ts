import type { CreateApplicationBody } from "@/lib/api/types";
import { normalizeJobUrl, type Application } from "@/lib/applications/schema";
import { followUpState } from "@/lib/applications/follow-up";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/applications/status";
import {
  applicationForCopy,
  applicationForJob,
  copyForApplication,
  copyForJob,
  copyJobId,
} from "@/lib/applications/thread";
import { deviceTimeZone } from "@/lib/eligibility/options";
import type { SavedPost } from "@/lib/extension/types";
import { savedJobUrl } from "@/lib/insights/saved-job";
import type { SavedJob } from "@/lib/job-feed/types";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { DAY_MS } from "@/lib/time";

export const BOARD_COLUMNS = ["to_apply", "applied", "interview", "offer", "closed"] as const;
export type BoardColumn = (typeof BOARD_COLUMNS)[number];

export const COLUMN_NAMES: Record<BoardColumn, string> = {
  to_apply: "To apply",
  applied: "Applied",
  interview: "Interviewing",
  offer: "Offer",
  closed: "Closed",
};

export type DropTarget = BoardColumn | "delete";

export function columnOf(status: ApplicationStatus): BoardColumn {
  return status === "rejected" || status === "no_reply" ? "closed" : status;
}

export type ToApplyItem = {
  key: string;
  job: SavedJob | null;
  copy: Resume | null;
  company: string;
  role: string;
  jobUrl: string;
  jobId: string | null;
  addedAt: number;
  closed: boolean;
  // Saved from Otto for Chrome, with its own copy of the post.
  postId?: string;
};

export type BoardCard =
  | { kind: "application"; key: string; application: Application; copy: Resume | null }
  | { kind: "to_apply"; key: string; item: ToApplyItem };

const urlKey = (url: string) => normalizeJobUrl(url) || null;

export function toApplyItems(
  savedJobs: readonly SavedJob[],
  resumes: readonly Resume[],
  applications: readonly Application[],
  posts: readonly SavedPost[] = [],
): ToApplyItem[] {
  const items: ToApplyItem[] = [];
  const taken = new Set<string>();
  // A post saved from the extension waits here until a saved job or an application has its link.
  const known = new Set(
    [...applications.map((item) => item.jobUrl), ...savedJobs.map((job) => job.url)].flatMap(
      (url) => urlKey(url) ?? [],
    ),
  );
  const copies = new Map<string, Resume>();
  for (const copy of resumes) {
    const key = copy.tailor ? urlKey(savedJobUrl(copy)) : null;
    if (key && !copies.has(key)) copies.set(key, copy);
  }
  for (const post of posts) {
    const key = urlKey(post.url);
    if (!key || known.has(key)) continue;
    known.add(key);
    const copy = copies.get(key) ?? null;
    if (copy) {
      taken.add(copy.id);
      if (applicationForCopy(applications, copy)) continue;
    }
    items.push({
      key: `post:${post.id}`,
      job: null,
      copy,
      company: post.company,
      role: post.title,
      jobUrl: post.url,
      jobId: null,
      addedAt: post.savedAt,
      closed: false,
      postId: post.id,
    });
  }
  for (const job of savedJobs) {
    const copy = copyForJob(resumes, job);
    if (copy) taken.add(copy.id);
    if (applicationForJob(applications, job)) continue;
    if (copy && applicationForCopy(applications, copy)) continue;
    items.push({
      key: `job:${job.id}`,
      job,
      copy,
      company: job.company,
      role: job.title,
      jobUrl: job.url,
      jobId: job.id,
      addedAt: job.savedAt,
      closed: job.closed,
    });
  }
  for (const copy of resumes) {
    const meta = copy.tailor;
    if (!meta || taken.has(copy.id) || applicationForCopy(applications, copy)) continue;
    items.push({
      key: `copy:${copy.id}`,
      job: null,
      copy,
      company: meta.company.trim(),
      role: meta.jobTitle.trim(),
      jobUrl: savedJobUrl(copy),
      jobId: copyJobId(copy),
      addedAt: meta.createdAt,
      closed: false,
    });
  }
  return items.sort((a, b) => b.addedAt - a.addedAt || a.key.localeCompare(b.key));
}

export const STALE_DAYS = 14;
export const COLUMN_PAGE = 20;

export function daysInStage(card: BoardCard, now: number): number {
  const since = card.kind === "application" ? card.application.statusChangedAt : card.item.addedAt;
  return Math.max(0, Math.floor((now - since) / DAY_MS));
}

export function needsAction(card: BoardCard, now: number): boolean {
  return (
    card.kind === "application" &&
    now > 0 &&
    followUpState(card.application, now) === "due"
  );
}

export function isOverdue(card: BoardCard, now: number): boolean {
  if (card.kind !== "application" || now === 0) return false;
  if (needsAction(card, now)) return true;
  return card.application.status === "applied" && daysInStage(card, now) >= STALE_DAYS;
}

export function boardColumns(
  applications: readonly Application[],
  toApply: readonly ToApplyItem[],
  resumes: readonly Resume[],
  now: number,
): Record<BoardColumn, BoardCard[]> {
  const columns: Record<BoardColumn, BoardCard[]> = {
    to_apply: toApply.map((item) => ({ kind: "to_apply", key: item.key, item })),
    applied: [],
    interview: [],
    offer: [],
    closed: [],
  };
  const sorted = [...applications].sort(
    (a, b) => b.statusChangedAt - a.statusChangedAt || (a.id < b.id ? 1 : -1),
  );
  for (const application of sorted) {
    columns[columnOf(application.status)].push({
      kind: "application",
      key: `application:${application.id}`,
      application,
      copy: copyForApplication(resumes, application),
    });
  }
  for (const name of BOARD_COLUMNS) {
    const list = columns[name];
    const urgent = list.filter((card) => needsAction(card, now));
    if (urgent.length > 0) columns[name] = [...urgent, ...list.filter((card) => !needsAction(card, now))];
  }
  return columns;
}

export function cardColumn(card: BoardCard): BoardColumn {
  return card.kind === "application" ? columnOf(card.application.status) : "to_apply";
}

export function canDrop(card: BoardCard, target: DropTarget): boolean {
  if (target === "delete") return card.kind === "application";
  return target !== "to_apply" && target !== cardColumn(card);
}

export type Move =
  | { kind: "none" }
  | { kind: "ask"; card: BoardCard; column: "interview" | "closed" }
  | { kind: "status"; application: Application; status: ApplicationStatus }
  | { kind: "create"; item: ToApplyItem; status: ApplicationStatus }
  | { kind: "delete"; application: Application };

export function planDrop(card: BoardCard, target: DropTarget): Move {
  if (!canDrop(card, target)) return { kind: "none" };
  if (target === "delete") {
    return card.kind === "application" ? { kind: "delete", application: card.application } : { kind: "none" };
  }
  if (target === "interview" || target === "closed") return { kind: "ask", card, column: target };
  return planStatus(card, target as ApplicationStatus);
}

export function planStatus(card: BoardCard, status: ApplicationStatus): Move {
  if (card.kind === "to_apply") return { kind: "create", item: card.item, status };
  if (card.application.status === status) return { kind: "none" };
  return { kind: "status", application: card.application, status };
}

export function menuStatuses(card: BoardCard): ApplicationStatus[] {
  return APPLICATION_STATUSES.filter(
    (status) => card.kind === "to_apply" || status !== card.application.status,
  );
}

const ONWARD: Partial<Record<BoardColumn, BoardColumn>> = {
  to_apply: "applied",
  applied: "interview",
  interview: "offer",
};

export function onward(card: BoardCard): BoardColumn | null {
  return ONWARD[cardColumn(card)] ?? null;
}

export function createBody(
  item: ToApplyItem,
  status: ApplicationStatus,
  now: number,
  fallback: Resume | null,
  interviewAt: number | null = null,
  interviewTime: number | null = null,
): CreateApplicationBody | null {
  const company = item.company.trim();
  if (!company) return null;
  const sent = item.copy ?? fallback;
  return {
    resumeId: sent?.id ?? null,
    resumeTitle: sent ? resumeTitle(sent).slice(0, 200) : "",
    jobId: item.jobId,
    company: company.slice(0, 200),
    role: item.role.slice(0, 200),
    jobUrl: item.jobUrl,
    appliedAt: now,
    status,
    ...(interviewAt === null ? {} : { interviewAt, ...interviewClock(interviewTime) }),
  };
}

// A typed time is on this device's clock, so it carries this device's zone.
export function interviewClock(interviewTime: number | null): {
  interviewTime: number | null;
  interviewZone: string | null;
} {
  const zone = interviewTime === null ? "" : deviceTimeZone();
  return zone ? { interviewTime, interviewZone: zone } : { interviewTime: null, interviewZone: null };
}

export function stepColumn(card: BoardCard, current: BoardColumn, step: 1 | -1): BoardColumn {
  const here = cardColumn(card);
  const allowed = BOARD_COLUMNS.filter((column) => column === here || canDrop(card, column));
  const index = allowed.indexOf(current);
  const next = allowed[Math.min(allowed.length - 1, Math.max(0, (index === -1 ? 0 : index) + step))];
  return next ?? here;
}

export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.length > 1 ? words[0]!.charAt(0) + words[1]!.charAt(0) : (words[0] ?? "").slice(0, 2);
  return letters.toUpperCase() || "?";
}

export function cardName(card: BoardCard): string {
  if (card.kind === "application") {
    return card.application.company || card.application.role || "this application";
  }
  return card.item.company || card.item.role || (card.item.copy ? resumeTitle(card.item.copy) : "this job");
}

export const BOARD_VIEWS = ["board", "list"] as const;
export type BoardView = (typeof BOARD_VIEWS)[number];

const VIEW_KEY = "otto-applications-view-v1";

export function readView(storage: Pick<Storage, "getItem"> | null): BoardView {
  try {
    const value = storage?.getItem(VIEW_KEY);
    return value === "list" ? "list" : "board";
  } catch {
    return "board";
  }
}

export function writeView(storage: Pick<Storage, "setItem"> | null, view: BoardView): void {
  try {
    storage?.setItem(VIEW_KEY, view);
  } catch {}
}
