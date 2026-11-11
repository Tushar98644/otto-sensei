import {
  EXTRA_KIND_LABELS,
  MAX_EXTRA_ITEMS,
  newId,
  type Experience,
  type ExtraItem,
  type ExtraKind,
  type ExtraSection,
} from "../schema";
import {
  bulletText,
  findDateRanges,
  findDates,
  headingTitle,
  type SectionBlock,
} from "../sections";
import { CORPORATE_SUFFIX, parseExperience } from "./experience";
import { LIMITS } from "./limits";
import { splitList } from "./skills";
import {
  clip,
  continues,
  finishBullets,
  isTitleLike,
  segmentsOf,
  setApartDate,
  stripDates,
} from "./text";

type ExtraDraft = {
  title: string;
  subtitle: string;
  date: string;
  detail: string;
  bullets: string[];
};

const emptyExtra = (): ExtraDraft => ({
  title: "",
  subtitle: "",
  date: "",
  detail: "",
  bullets: [],
});

export function parseExtra(block: SectionBlock, kind: ExtraKind): ExtraSection | null {
  const drafts =
    kind === "languages"
      ? languageDrafts(block.lines)
      : block.kind === "experience"
        ? parseExperience(block.lines).map(roleDraft)
        : listDrafts(block.lines, kind);
  const items = drafts
    .map(toExtraItem)
    .filter((item) => item.title || item.subtitle || item.detail || item.bullets.length > 0)
    .slice(0, MAX_EXTRA_ITEMS);
  if (items.length === 0) return null;
  const title = clip(headingTitle(block.heading), LIMITS.extraTitle) || EXTRA_KIND_LABELS[kind];
  return { id: newId(), kind, title, items };
}

export function addExtra(extras: ExtraSection[], section: ExtraSection | null): void {
  if (!section) return;
  const previous = extras.at(-1);
  if (
    previous &&
    previous.kind === section.kind &&
    previous.title.toLowerCase() === section.title.toLowerCase()
  ) {
    previous.items = [...previous.items, ...section.items].slice(0, MAX_EXTRA_ITEMS);
    return;
  }
  extras.push(section);
}

function toExtraItem(draft: ExtraDraft): ExtraItem {
  return {
    id: newId(),
    title: clip(draft.title, LIMITS.text),
    subtitle: clip(draft.subtitle, LIMITS.text),
    date: clip(draft.date, LIMITS.date),
    detail: clip(draft.detail.replace(/\t+/g, " "), LIMITS.extraDetail),
    bullets: finishBullets(draft.bullets, LIMITS.extraBullets),
  };
}

const LEVEL_IN_BRACKETS = /^(.+?)\s*[([]\s*([^)\]]+?)\s*[)\]]$/u;
const LEVEL_AFTER = /^(.+?)\s*(?::|\s[-–—]\s|[–—])\s*(.+)$/u;

function languageDrafts(lines: readonly string[]): ExtraDraft[] {
  return lines
    .flatMap((line) => splitList(bulletText(line) ?? line))
    .map((entry) => {
      const match = LEVEL_IN_BRACKETS.exec(entry) ?? LEVEL_AFTER.exec(entry);
      return { ...emptyExtra(), title: match?.[1] ?? entry, subtitle: match?.[2] ?? "" };
    });
}

function roleDraft(job: Experience): ExtraDraft {
  return {
    title: job.title,
    subtitle: [job.company, job.location].filter(Boolean).join(", "),
    date: [job.startDate, job.endDate].filter(Boolean).join(" – "),
    detail: "",
    bullets: job.bullets.map((bullet) => bullet.text),
  };
}

function listDrafts(lines: readonly string[], kind: ExtraKind): ExtraDraft[] {
  const marked = lines.map((line) => bulletText(line));
  const usesMarkers = marked.some((text) => text !== null);
  const mixed = usesMarkers && lines.some((line, i) => marked[i] === null && isTitleLike(line));
  const drafts: ExtraDraft[] = [];
  let current: ExtraDraft | undefined;
  let previous = "";
  for (const [i, line] of lines.entries()) {
    const bullet = marked[i] ?? null;
    const text = bullet ?? line;
    if (mixed && bullet !== null) {
      current ??= pushed(drafts, emptyExtra());
      current.bullets.push(bullet);
    } else if (bullet === null && current && previous && continues(previous, line)) {
      appendToLast(current, line);
    } else if (isExtraDescription(text, kind)) {
      const describes = kind !== "publications" && bullet === null && !usesMarkers;
      const cells = text.split(/\t+/);
      const tail =
        cells.length > 1 ? (cells.at(-1) ?? "").replace(/\s*\|?\s*details$/i, "").trim() : "";
      const dated = tail.split(/\s+/).length <= 5 && findDates(tail).length > 0 ? tail : "";
      if (current && describes && current.bullets.length === 0 && !dated) {
        current.detail = current.detail ? `${current.detail} ${text}` : text;
      } else if (dated) {
        current = pushed(drafts, {
          ...emptyExtra(),
          detail: cells.slice(0, -1).join(" "),
          date: dated,
        });
      } else {
        current = pushed(drafts, { ...emptyExtra(), detail: text });
      }
    } else {
      current = pushed(drafts, extraHeader(text, kind));
    }
    previous = text;
  }
  return drafts;
}

function pushed(drafts: ExtraDraft[], draft: ExtraDraft): ExtraDraft {
  drafts.push(draft);
  return draft;
}

function appendToLast(draft: ExtraDraft, line: string): void {
  const last = draft.bullets.length - 1;
  if (last >= 0) draft.bullets[last] = `${draft.bullets[last]} ${line}`;
  else if (draft.detail) draft.detail = `${draft.detail} ${line}`;
  else draft.title = draft.title ? `${draft.title} ${line}` : line;
}

function isExtraDescription(text: string, kind: ExtraKind): boolean {
  const [first = "", ...cells] = text.split(/\t+/);
  if (cells.length > 0 && first.split(/\s+/).length <= 8 && isTitleLike(first)) return false;
  if (!isTitleLike(text)) return true;
  if (segmentsOf(stripDates(text)).some((segment) => segment.split(/\s+/).length >= 10))
    return true;
  return kind === "custom" && /[,;]/.test(text);
}

function extraHeader(line: string, kind: ExtraKind): ExtraDraft {
  const year = /\.\s+((?:19|20)\d{2})$/.exec(line);
  const text = year ? line.slice(0, year.index + 1) : line;
  const date = findDateRanges(text)[0]?.text ?? setApartDate(text) ?? year?.[1] ?? "";
  let parts = segmentsOf(stripDates(text));
  const only = parts.length === 1 ? parts[0] : undefined;
  const comma =
    only && kind !== "publications" && kind !== "custom" ? /^([^,]+),\s*([^,]+)$/.exec(only) : null;
  if (comma?.[1] && comma[2] && !CORPORATE_SUFFIX.test(comma[2].trim()))
    parts = [comma[1], comma[2]];
  const [title = "", ...rest] = parts.map((part) => part.trim());
  return { ...emptyExtra(), title, subtitle: rest.join(", "), date };
}
