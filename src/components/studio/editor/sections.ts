import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import type { PluralForms } from "@/i18n/types";
import type { EntrySection } from "@/lib/resume/ops";
import {
  MAX_SECTION_TITLE_CHARS,
  SECTION_KEYS,
  SECTION_LABELS,
  type Resume,
  type SectionKey,
  type SectionTitles,
} from "@/lib/resume/schema";
import { countText } from "../count";

export function isBulletSection(key: SectionKey): key is EntrySection {
  return key === "experience" || key === "projects" || key === "education";
}

export function sectionDisplayOrder(order: readonly SectionKey[]): SectionKey[] {
  const seen = new Set<SectionKey>();
  for (const key of order) if (SECTION_KEYS.includes(key)) seen.add(key);
  return [...seen, ...SECTION_KEYS.filter((key) => !seen.has(key))];
}

export function moveSection(resume: Resume, key: SectionKey, delta: number): Resume {
  const order = sectionDisplayOrder(resume.sectionOrder);
  const from = order.indexOf(key);
  const to = from + delta;
  if (from === -1 || delta === 0 || to < 0 || to >= order.length) return resume;
  order.splice(from, 1);
  order.splice(to, 0, key);
  return { ...resume, sectionOrder: order };
}

export function includeSection(resume: Resume, key: SectionKey): Resume {
  return resume.sectionOrder.includes(key)
    ? resume
    : { ...resume, sectionOrder: [...resume.sectionOrder, key] };
}

export function cleanSectionTitle(draft: string, max = MAX_SECTION_TITLE_CHARS): string {
  return draft.replace(/\s+/g, " ").trim().slice(0, max).trim();
}

export function setSectionTitle(resume: Resume, key: SectionKey, draft: string): Resume {
  const title = cleanSectionTitle(draft);
  const custom = title !== "" && title !== SECTION_LABELS[key];
  const current = resume.sectionTitles?.[key];
  if (custom ? current === title : current === undefined) return resume;
  const titles: SectionTitles = { ...resume.sectionTitles, [key]: custom ? title : undefined };
  const kept = Object.values(titles).some((value) => value !== undefined);
  return { ...resume, sectionTitles: kept ? titles : undefined };
}

export function setSectionHidden(resume: Resume, key: SectionKey, hidden: boolean): Resume {
  const current = resume.hiddenSections ?? [];
  if (current.includes(key) === hidden) return resume;
  const next = hidden ? [...current, key] : current.filter((item) => item !== key);
  return { ...resume, hiddenSections: next.length > 0 ? next : undefined };
}

type Counts = { t: Messages["studioSections"]; format: Format };

function countOf({ t, format }: Counts, count: number, forms: PluralForms, hidden = 0): string {
  if (count === 0) return t.extras.noneYet;
  const text = countText(format, forms, count);
  return hidden > 0 ? fmt(t.extras.withHidden, { count: text, hidden }) : text;
}

function hiddenCount(items: readonly { hidden?: boolean }[]): number {
  return items.filter((item) => item.hidden === true).length;
}

export function sectionCount(resume: Resume, key: SectionKey, words: Counts): string | null {
  const forms = words.t.sectionCounts;
  switch (key) {
    case "summary":
      return null;
    case "experience":
      return countOf(words, resume.experience.length, forms.jobs, hiddenCount(resume.experience));
    case "projects":
      return countOf(words, resume.projects.length, forms.projects, hiddenCount(resume.projects));
    case "education":
      return countOf(words, resume.education.length, forms.schools, hiddenCount(resume.education));
    case "skills":
      return countOf(
        words,
        resume.skills.reduce((total, group) => total + group.items.length, 0),
        forms.skills,
        resume.skills.reduce((total, group) => total + (group.hidden ? group.items.length : 0), 0),
      );
    case "certifications":
      return countOf(
        words,
        resume.certifications.length,
        forms.certifications,
        hiddenCount(resume.certifications),
      );
  }
}
