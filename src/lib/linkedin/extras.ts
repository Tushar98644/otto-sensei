import { clip, oneLine } from "@/lib/ai/text";
import { EXTRA_KIND_LABELS, newId, type ExtraItem, type ExtraSection } from "@/lib/resume/schema";

export function extraItem(title: string, subtitle: string, date: string, detail: string): ExtraItem {
  return {
    id: newId(),
    title: clip(oneLine(title), 200),
    subtitle: clip(oneLine(subtitle), 200),
    date: clip(oneLine(date), 50),
    detail: clip(oneLine(detail), 500),
    bullets: [],
  };
}

export function extraSection(kind: ExtraSection["kind"], items: ExtraItem[]): ExtraSection | null {
  return items.length ? { id: newId(), kind, title: EXTRA_KIND_LABELS[kind], items } : null;
}

