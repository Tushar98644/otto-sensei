import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import type { PluralForms } from "@/i18n/types";
import {
  EXTRA_KIND_LABELS,
  MAX_EXTRA_ITEMS,
  MAX_EXTRA_SECTIONS,
  extrasOf,
  type ExtraItem,
  type ExtraKind,
  type ExtraSection,
  type Resume,
} from "@/lib/resume/schema";
import { countText } from "../count";
import { moveItem, patchItem, removeItem } from "./edits";
import { CHAR_LIMITS } from "./limits";
import { cleanSectionTitle } from "./sections";

type FieldCopy = { label: string; placeholder: string };

export type ExtrasCopy = Messages["studioEditor"]["extras"];

export type ExtraForm = {
  addLabel: string;
  empty: string;
  newItem: string;
  count: PluralForms;
  removeItem: string;
  removeItemWithLines: PluralForms;
  removeSection: PluralForms;
  title: FieldCopy;
  subtitle: FieldCopy;
  date: FieldCopy | null;
  detail: FieldCopy | null;
  lines: string | null;
};

// Which fields each kind asks for; the words come from the editor's messages.
export function extraForms(t: ExtrasCopy): Record<ExtraKind, ExtraForm> {
  const { languages, awards, volunteering, publications, custom } = t.kinds;
  return {
    languages: { ...languages, date: null, detail: null, lines: null },
    awards: { ...awards, subtitle: { ...awards.subtitle, placeholder: "Northwind" }, lines: null },
    volunteering: {
      ...volunteering,
      subtitle: { ...volunteering.subtitle, placeholder: "Code Club" },
      detail: null,
    },
    publications: {
      ...publications,
      subtitle: { ...publications.subtitle, placeholder: "UX Collective" },
      detail: { ...publications.detail, placeholder: "uxdesign.cc/calm-dashboards" },
      lines: null,
    },
    custom,
  };
}

export function defaultExtraTitle(kind: ExtraKind): string {
  return kind === "custom" ? "Additional information" : EXTRA_KIND_LABELS[kind];
}

export function editExtras(
  resume: Resume,
  update: (sections: ExtraSection[]) => ExtraSection[],
): Resume {
  const current = extrasOf(resume);
  const next = update(current);
  return next === current ? resume : { ...resume, extras: next };
}

export function appendExtraSection(resume: Resume, section: ExtraSection): Resume {
  return editExtras(resume, (sections) =>
    sections.length >= MAX_EXTRA_SECTIONS ? sections : [...sections, section],
  );
}

export function appendExtraItem(resume: Resume, sectionId: string, item: ExtraItem): Resume {
  return editExtraItems(resume, sectionId, (items) =>
    items.length >= MAX_EXTRA_ITEMS ? items : [...items, item],
  );
}

export function patchExtraSection(
  resume: Resume,
  sectionId: string,
  patch: (section: ExtraSection) => ExtraSection,
): Resume {
  return editExtras(resume, (sections) => patchItem(sections, sectionId, patch));
}

export function moveExtraSection(resume: Resume, sectionId: string, delta: number): Resume {
  return editExtras(resume, (sections) => moveItem(sections, sectionId, delta));
}

export function removeExtraSection(resume: Resume, sectionId: string): Resume {
  return editExtras(resume, (sections) => removeItem(sections, sectionId));
}

export function renameExtraSection(resume: Resume, sectionId: string, draft: string): Resume {
  return patchExtraSection(resume, sectionId, (section) => {
    const title =
      cleanSectionTitle(draft, CHAR_LIMITS.extraSectionTitle) || defaultExtraTitle(section.kind);
    return title === section.title ? section : { ...section, title };
  });
}

export function editExtraItems(
  resume: Resume,
  sectionId: string,
  update: (items: ExtraItem[]) => ExtraItem[],
): Resume {
  return patchExtraSection(resume, sectionId, (section) => {
    const items = update(section.items);
    return items === section.items ? section : { ...section, items };
  });
}

export function hasItemContent(item: ExtraItem): boolean {
  return (
    [item.title, item.subtitle, item.date, item.detail].some((value) => value.trim() !== "") ||
    item.bullets.some((bullet) => bullet.text.trim() !== "")
  );
}

export function extraItemHeading(item: ExtraItem, form: ExtraForm): string {
  const title = item.title.trim();
  if (title) return title;
  const detail = item.detail.trim();
  if (detail) return detail.length > 60 ? `${detail.slice(0, 57).trimEnd()}…` : detail;
  return form.newItem;
}

export function removeItemQuestion(item: ExtraItem, form: ExtraForm, format: Format): string | null {
  if (!hasItemContent(item)) return null;
  const lines = item.bullets.filter((bullet) => bullet.text.trim() !== "").length;
  return lines > 0 ? countText(format, form.removeItemWithLines, lines) : form.removeItem;
}

export function removeSectionQuestion(
  section: ExtraSection,
  forms: Record<ExtraKind, ExtraForm>,
  format: Format,
): string | null {
  const filled = section.items.filter(hasItemContent).length;
  if (filled === 0) return null;
  const title = section.title.trim() || defaultExtraTitle(section.kind);
  return countText(format, forms[section.kind].removeSection, filled, { title });
}

export function extraCount(section: ExtraSection, t: ExtrasCopy, format: Format): string {
  if (section.items.length === 0) return t.noneYet;
  const hidden = section.items.filter((item) => item.hidden === true).length;
  const count = countText(format, extraForms(t)[section.kind].count, section.items.length);
  return hidden > 0 ? fmt(t.withHidden, { count, hidden }) : count;
}
