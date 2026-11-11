import type { BulletSection } from "@/lib/resume/ops";
import { extrasOf, type Bullet, type Resume } from "@/lib/resume/schema";

// Untouched items keep their identity, so memoized rows that get them as props skip re-renders.

type WithId = { id: string };
type WithBullets = WithId & { bullets: Bullet[] };

export function moveItem<T extends WithId>(items: T[], id: string, delta: number): T[] {
  const from = items.findIndex((item) => item.id === id);
  const to = from + delta;
  const item = items[from];
  if (!item || delta === 0 || to < 0 || to >= items.length) return items;
  const next = items.slice();
  next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function patchItem<T extends WithId>(items: T[], id: string, patch: (item: T) => T): T[] {
  const index = items.findIndex((item) => item.id === id);
  const current = items[index];
  if (!current) return items;
  const patched = patch(current);
  if (patched === current) return items;
  const next = items.slice();
  next[index] = patched;
  return next;
}

export function removeItem<T extends WithId>(items: T[], id: string): T[] {
  const next = items.filter((item) => item.id !== id);
  return next.length === items.length ? items : next;
}

export function insertAfter<T extends WithId>(items: T[], afterId: string, inserted: T[]): T[] {
  const index = items.findIndex((item) => item.id === afterId);
  const at = index === -1 ? items.length : index + 1;
  return [...items.slice(0, at), ...inserted, ...items.slice(at)];
}

export type Neighbor = { id: string; before: boolean };

export function pickNeighbor(
  ids: readonly string[],
  id: string,
  prefer: "previous" | "next",
): Neighbor | null {
  const index = ids.indexOf(id);
  if (index === -1) return null;
  const previous = index > 0 ? ids[index - 1] : undefined;
  const next = ids[index + 1];
  const before = previous === undefined ? null : { id: previous, before: true };
  const after = next === undefined ? null : { id: next, before: false };
  return prefer === "previous" ? (before ?? after) : (after ?? before);
}

// Hiding only leaves the PDF. Showing clears the flag (no stored false); JSON drops the key.
export function setHidden<T extends { hidden?: boolean }>(item: T, hidden: boolean): T {
  if (hidden) return item.hidden === true ? item : { ...item, hidden: true };
  return item.hidden === undefined ? item : { ...item, hidden: undefined };
}

// `parentId` is an entry's id, or an item's id inside an extra section ("extras").
export type BulletParent = { section: BulletSection; parentId: string };

export function editBullets(
  resume: Resume,
  parent: BulletParent,
  edit: (bullets: Bullet[]) => Bullet[],
): Resume {
  const apply = <T extends WithBullets>(items: T[]): T[] =>
    patchItem(items, parent.parentId, (item) => ({ ...item, bullets: edit(item.bullets) }));
  switch (parent.section) {
    case "experience":
      return { ...resume, experience: apply(resume.experience) };
    case "projects":
      return { ...resume, projects: apply(resume.projects) };
    case "education":
      return { ...resume, education: apply(resume.education) };
    case "extras": {
      const owner = (items: readonly WithId[]) => items.some((item) => item.id === parent.parentId);
      if (!extrasOf(resume).some((section) => owner(section.items))) return resume;
      return {
        ...resume,
        extras: extrasOf(resume).map((section) =>
          owner(section.items) ? { ...section, items: apply(section.items) } : section,
        ),
      };
    }
  }
}

export function bulletsOf(resume: Resume, parent: BulletParent): Bullet[] | null {
  const items: readonly WithBullets[] =
    parent.section === "extras"
      ? extrasOf(resume).flatMap((section) => section.items)
      : resume[parent.section];
  return items.find((item) => item.id === parent.parentId)?.bullets ?? null;
}

const LINE_BREAK = /\r\n|[\n\r\u2028\u2029]/;
const LINE_BREAKS_WITH_SPACE = /\s*(?:\r\n|[\n\r\u2028\u2029])+\s*/g;
// A pasted line's bullet or number: "• ", "- ", "1. ", "(2) ". Dashes and numbers need a space
// after them, so "-20% churn" and "3.5 GPA" survive.
const LIST_MARKER = /^\s*(?:[•·▪◦‣●○■□►▸▹➤➢✓✔]\s*|[-*–—]\s+|\(?\d{1,2}[.)]\s+)/u;

export function hasLineBreak(text: string): boolean {
  return LINE_BREAK.test(text);
}

// A resume line is one paragraph; a stray newline would print as a broken bullet.
export function singleLine(text: string): string {
  return text.replace(LINE_BREAKS_WITH_SPACE, " ");
}

// Text copied from an old resume arrives as one line per bullet, often with its markers.
export function splitPastedLines(text: string): string[] {
  return text
    .split(LINE_BREAK)
    .map((line) => line.replace(LIST_MARKER, "").replace(/\s+/g, " ").trim())
    .filter((line) => line !== "");
}

export type PasteInput = {
  before: string;
  after: string;
  lines: string[];
  room: number;
  maxChars: number;
};

export type PastePlan = {
  current: string;
  added: string[];
  dropped: number;
  // Caret position in the last line written: the last added one, else the current one.
  caret: number;
};

// The first pasted line joins at the caret; the text after the caret moves to the end of the last.
export function planPaste({ before, after, lines, room, maxChars }: PasteInput): PastePlan {
  const [first = "", ...rest] = lines;
  const added = rest.slice(0, Math.max(0, room));
  const dropped = rest.length - added.length;
  const clip = (text: string) => text.slice(0, maxChars);
  const head = clip(before + first);
  const last = added.at(-1);
  if (last === undefined) {
    return { current: clip(head + after), added: [], dropped, caret: head.length };
  }
  const lastHead = clip(last);
  return {
    current: head,
    added: [...added.slice(0, -1).map(clip), clip(lastHead + after)],
    dropped,
    caret: lastHead.length,
  };
}

const SKILL_SEPARATOR = /[,;|•·\r\n]/;
const SKILL_SEPARATORS = /[,;|•·\r\n]+/;
const LAST_SKILL_SEPARATOR = /[,;|•·\r\n](?=[^,;|•·\r\n]*$)/;

export function splitSkills(text: string): string[] {
  return text
    .split(SKILL_SEPARATORS)
    .map((skill) => skill.replace(/\s+/g, " ").trim())
    .filter((skill) => skill !== "");
}

// Phone keyboards often don't report "," as a key press, so this splits on the value instead.
export function splitSkillDraft(value: string): { done: string[]; draft: string } {
  if (!SKILL_SEPARATOR.test(value)) return { done: [], draft: value };
  const match = LAST_SKILL_SEPARATOR.exec(value);
  const at = match ? match.index : value.length;
  return { done: splitSkills(value.slice(0, at)), draft: value.slice(at + 1).trimStart() };
}

// Case-insensitive, so "react" never sits next to "React". Same array back when nothing is new.
export function addSkills(
  items: string[],
  incoming: readonly string[],
  maxItems: number,
  maxChars: number,
): string[] {
  const seen = new Set(items.map((item) => item.toLowerCase()));
  const next = items.slice();
  for (const raw of incoming) {
    const skill = raw.slice(0, maxChars).trim();
    const key = skill.toLowerCase();
    if (!skill || seen.has(key) || next.length >= maxItems) continue;
    seen.add(key);
    next.push(skill);
  }
  return next.length === items.length ? items : next;
}

export const PRESENT = "Present";
const PRESENT_WORDS = /^(?:present|current|currently|now|today|ongoing)$/i;

// Imported resumes say "Current" or "Now" as often as "Present".
export function isPresentDate(value: string): boolean {
  return PRESENT_WORDS.test(value.trim());
}

export function dateSpan(startDate: string, endDate: string): string {
  const start = startDate.trim();
  const end = isPresentDate(endDate) ? "now" : endDate.trim();
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

export function metaLine(parts: readonly string[]): string | null {
  return (
    parts
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" · ") || null
  );
}
