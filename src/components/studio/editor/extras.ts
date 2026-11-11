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
import { pluralize } from "@/lib/utils";
import { moveItem, patchItem, removeItem } from "./edits";
import { CHAR_LIMITS } from "./limits";
import { cleanSectionTitle } from "./sections";

// Like edits.ts, untouched sections and items keep their identity.

type FieldCopy = { label: string; placeholder: string };

export type ExtraForm = {
  noun: string;
  addLabel: string;
  empty: string;
  title: FieldCopy;
  subtitle: FieldCopy;
  // Still shown when an import filled them, so nothing prints that can't be edited.
  date: FieldCopy | null;
  detail: FieldCopy | null;
  lines: string | null;
};

export const EXTRA_FORMS: Record<ExtraKind, ExtraForm> = {
  languages: {
    noun: "language",
    addLabel: "Add a language",
    empty: "No languages yet. Add the ones you could work in.",
    title: { label: "Language", placeholder: "Spanish" },
    subtitle: { label: "How well", placeholder: "Fluent" },
    date: null,
    detail: null,
    lines: null,
  },
  awards: {
    noun: "award",
    addLabel: "Add an award",
    empty: "No awards yet. Prizes, honors and scholarships all count.",
    title: { label: "Award", placeholder: "Employee of the year" },
    subtitle: { label: "Given by", placeholder: "Northwind" },
    date: { label: "Date", placeholder: "2023" },
    detail: { label: "What it was for", placeholder: "Chosen from 300 staff for the app relaunch" },
    lines: null,
  },
  volunteering: {
    noun: "role",
    addLabel: "Add a volunteer role",
    empty: "No volunteer roles yet.",
    title: { label: "Role", placeholder: "Volunteer tutor" },
    subtitle: { label: "Organization", placeholder: "Code Club" },
    date: { label: "Dates", placeholder: "2021 – now" },
    detail: null,
    lines: "What you did",
  },
  publications: {
    noun: "publication",
    addLabel: "Add a publication",
    empty: "No publications yet. Articles, papers and talks all count.",
    title: { label: "Title", placeholder: "Designing calm dashboards" },
    subtitle: { label: "Published in", placeholder: "UX Collective" },
    date: { label: "Date", placeholder: "2022" },
    detail: { label: "Link or note", placeholder: "uxdesign.cc/calm-dashboards" },
    lines: null,
  },
  custom: {
    noun: "item",
    addLabel: "Add an item",
    empty: "Nothing here yet.",
    title: { label: "Title", placeholder: "Member" },
    subtitle: { label: "Subtitle", placeholder: "Design Guild" },
    date: { label: "Date", placeholder: "2020 – now" },
    detail: { label: "Details", placeholder: "One or two lines about it" },
    lines: "Lines",
  },
};

export const EXTRA_DESCRIPTIONS: Record<ExtraKind, string> = {
  languages: "Languages you speak, and how well",
  awards: "Prizes, honors and scholarships",
  volunteering: "Unpaid roles and community work",
  publications: "Articles, papers and talks",
  custom: "Interests, memberships or anything else",
};

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

// Unchanged when the resume already holds as many extra sections as the schema allows.
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

// Blank goes back to the kind's own heading: an extra section always prints with one.
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
  return `New ${form.noun}`;
}

export function removeItemQuestion(item: ExtraItem, form: ExtraForm): string | null {
  if (!hasItemContent(item)) return null;
  const lines = item.bullets.filter((bullet) => bullet.text.trim() !== "").length;
  return lines > 0
    ? `Remove this ${form.noun} and its ${pluralize(lines, "line")}?`
    : `Remove this ${form.noun}?`;
}

export function removeSectionQuestion(section: ExtraSection): string | null {
  const filled = section.items.filter(hasItemContent).length;
  if (filled === 0) return null;
  const noun = EXTRA_FORMS[section.kind].noun;
  return `Remove ${section.title.trim() || defaultExtraTitle(section.kind)} and its ${pluralize(filled, noun)}?`;
}

export function extraCount(section: ExtraSection): string {
  const { noun } = EXTRA_FORMS[section.kind];
  if (section.items.length === 0) return "None yet";
  const hidden = section.items.filter((item) => item.hidden === true).length;
  const count = pluralize(section.items.length, noun);
  return hidden > 0 ? `${count} · ${hidden} hidden` : count;
}
