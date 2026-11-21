import { TEXT_LIMITS } from "@/config/plans";
import type { FixResult } from "@/lib/ai/types";
import { listBullets, setBulletText, type BulletRef } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { hasPlaceholders } from "./fix-text";
import { CHAR_LIMITS } from "./limits";

export type FixAllStatus = "waiting" | "working" | "ready" | "failed" | "stopped" | "too-long";
export type FixAllDecision = "open" | "accepted" | "rejected";

export type FixAllItem = {
  bulletId: string;
  text: string;
  place: string;
  role: { title: string; company: string };
  status: FixAllStatus;
  result: FixResult | null;
  answers: string[];
  refining: boolean;
  draft: string | null;
  message: string | null;
  decision: FixAllDecision;
};

export const FIX_ALL_AT_ONCE = 2;

export const TOO_LONG_MESSAGE = `Too long for Otto. Trim it to under ${TEXT_LIMITS.bulletChars} characters.`;

function newItem(line: BulletRef, text: string, status: FixAllStatus): FixAllItem {
  return {
    bulletId: line.bulletId,
    text,
    place: line.parentLabel,
    role: { title: line.roleTitle, company: line.company },
    status,
    result: null,
    answers: [],
    refining: false,
    draft: null,
    message: status === "too-long" ? TOO_LONG_MESSAGE : null,
    decision: "open",
  };
}

// A line too long for Otto costs no fix, so it never takes a place under the cap.
export function planFixAll(
  lines: readonly BulletRef[],
  left: number | null,
): { items: FixAllItem[]; capped: number } {
  let room = left === null ? Number.POSITIVE_INFINITY : Math.max(0, left);
  const items: FixAllItem[] = [];
  let capped = 0;
  for (const line of lines) {
    const text = line.text.trim();
    if (text.length > TEXT_LIMITS.bulletChars) {
      items.push(newItem(line, text, "too-long"));
      continue;
    }
    if (room <= 0) {
      capped += 1;
      continue;
    }
    room -= 1;
    items.push(newItem(line, text, "waiting"));
  }
  return { items, capped };
}

export function lineGood(item: FixAllItem): boolean {
  const { result } = item;
  return (
    result !== null &&
    result.issues.length === 0 &&
    result.questions.length === 0 &&
    result.suggestion.trim() === item.text
  );
}

export function proposedText(item: FixAllItem): string {
  return (item.draft ?? item.result?.suggestion ?? "").trim().slice(0, CHAR_LIMITS.bullet);
}

export function canAccept(item: FixAllItem): boolean {
  if (item.status !== "ready" || item.decision !== "open" || item.refining) return false;
  if (lineGood(item)) return false;
  const text = proposedText(item);
  return text !== "" && text !== item.text && !hasPlaceholders(text);
}

export function isRunning(item: FixAllItem): boolean {
  return item.status === "waiting" || item.status === "working";
}

export function needsYou(item: FixAllItem): boolean {
  return (
    isRunning(item) || (item.status === "ready" && item.decision === "open" && !lineGood(item))
  );
}

// A line edited since Otto read it keeps the newer words.
export function applyFixes(
  resume: Resume,
  items: readonly FixAllItem[],
): { resume: Resume; applied: string[] } {
  const current = new Map(
    listBullets(resume, { includeHidden: true }).map((line) => [line.bulletId, line.text.trim()]),
  );
  const applied: string[] = [];
  let next = resume;
  for (const item of items) {
    if (!canAccept(item) || current.get(item.bulletId) !== item.text) continue;
    next = setBulletText(next, item.bulletId, proposedText(item));
    applied.push(item.bulletId);
  }
  return { resume: next, applied };
}

export function patchItem(
  items: readonly FixAllItem[],
  bulletId: string,
  patch: Partial<FixAllItem>,
): FixAllItem[] {
  return items.map((item) => (item.bulletId === bulletId ? { ...item, ...patch } : item));
}

export function readyPatch(result: FixResult): Partial<FixAllItem> {
  return {
    status: "ready",
    result,
    answers: result.questions.map(() => ""),
    refining: false,
    draft: null,
    message: null,
  };
}

export function stopWaiting(items: readonly FixAllItem[], also: ReadonlySet<string>): FixAllItem[] {
  return items.map((item) =>
    item.status === "waiting" || (also.has(item.bulletId) && item.status === "working")
      ? { ...item, status: "stopped" }
      : item,
  );
}

export function asksForFacts(item: FixAllItem): boolean {
  return (
    item.status === "ready" &&
    item.decision === "open" &&
    item.draft === null &&
    (item.result?.questions.length ?? 0) > 0
  );
}

export type FixAllCounts = {
  total: number;
  running: number;
  finished: number;
  acceptable: number;
  questions: number;
  stopped: number;
  taken: number;
};

export function countItems(items: readonly FixAllItem[]): FixAllCounts {
  const running = items.filter(isRunning).length;
  return {
    total: items.length,
    running,
    finished: items.length - running,
    acceptable: items.filter(canAccept).length,
    questions: items.filter(asksForFacts).length,
    stopped: items.filter((item) => item.status === "stopped").length,
    taken: items.filter((item) => item.status !== "too-long").length,
  };
}
