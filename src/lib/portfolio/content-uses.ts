import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import type { PluralForms } from "@/i18n/types";
import type { ContentSection, PortfolioContentView } from "./content";
import type { PortfolioSection } from "./types";

export type ChecklistCopy = Messages["portfolioContent"]["checklist"];

export const CONTENT_FIELDS = [
  "pitch",
  "disciplines",
  "availability",
  "location",
  "socials",
  "about",
  "now",
  "stats",
  "projectDetails",
  "categories",
  "jobHighlights",
  "skillYears",
  "milestones",
  "talks",
  "writing",
  "testimonials",
  "interests",
  "shelf",
  "github",
] as const;
export type ContentField = (typeof CONTENT_FIELDS)[number];

export const REFERENCE_USES = {
  chiangV4: ["pitch", "about", "socials", "jobHighlights"],
  chanhdai: ["disciplines", "about", "location", "socials", "stats", "testimonials", "milestones"],
  antfu: ["about", "categories", "talks", "writing", "socials"],
  alanagoyal: ["about", "socials", "writing", "shelf", "now"],
  hamish: ["disciplines", "projectDetails", "socials"],
  magicui: ["about", "milestones", "socials"],
  bento: ["location", "socials", "github", "now", "stats"],
  cali: ["about", "writing", "shelf", "location", "socials"],
  handDrawn: ["disciplines", "about", "stats", "socials", "github"],
} as const satisfies Record<string, readonly ContentField[]>;

export const TEMPLATE_USES: Record<string, readonly ContentField[]> = {
  navy: ["pitch", "about", "socials", "availability"],
  dock: ["pitch", "about", "milestones", "socials", "availability"],
  reel: ["disciplines", "projectDetails", "about", "socials"],
  bento: ["pitch", "about", "location", "socials", "github", "now"],
  cv: [
    "disciplines",
    "about",
    "location",
    "socials",
    "stats",
    "testimonials",
    "milestones",
    "writing",
    "talks",
  ],
  prose: ["pitch", "about", "categories", "talks", "writing", "socials"],
  folio: [
    "about",
    "location",
    "availability",
    "socials",
    "writing",
    "talks",
    "milestones",
    "now",
    "testimonials",
    "shelf",
    "interests",
  ],
  paper: ["disciplines", "about", "stats", "socials", "github", "writing", "talks", "milestones"],
  gazette: [
    "pitch",
    "disciplines",
    "about",
    "location",
    "availability",
    "socials",
    "stats",
    "now",
    "testimonials",
    "projectDetails",
    "categories",
    "jobHighlights",
    "skillYears",
    "writing",
    "talks",
    "milestones",
  ],
  terminal: ["pitch", "about", "location", "socials", "github", "now"],
  brutal: ["pitch", "about", "socials", "categories", "writing"],
  card: ["pitch", "about", "location", "socials", "testimonials", "skillYears", "writing"],
  retro: [
    "pitch",
    "disciplines",
    "availability",
    "location",
    "socials",
    "about",
    "now",
    "stats",
    "testimonials",
    "projectDetails",
    "categories",
    "jobHighlights",
    "milestones",
    "talks",
    "writing",
    "github",
  ],
  starring: [
    "pitch",
    "availability",
    "location",
    "socials",
    "stats",
    "categories",
    "jobHighlights",
    "milestones",
    "talks",
    "writing",
    "interests",
    "testimonials",
    "now",
    "github",
  ],
  bubble: [
    "pitch",
    "disciplines",
    "availability",
    "location",
    "socials",
    "stats",
    "skillYears",
    "jobHighlights",
    "categories",
    "writing",
    "talks",
    "milestones",
  ],
};

export function contentUsesFor(templateId: string): readonly ContentField[] {
  return TEMPLATE_USES[templateId] ?? CONTENT_FIELDS;
}

const PAGE_SWITCH: Partial<Record<ContentField, PortfolioSection>> = {
  about: "about",
  socials: "links",
  projectDetails: "projects",
  categories: "projects",
  jobHighlights: "experience",
  skillYears: "skills",
};
const CONTENT_SWITCH: Partial<Record<ContentField, ContentSection>> = {
  location: "location",
  now: "now",
  stats: "stats",
  milestones: "milestones",
  talks: "talks",
  writing: "writing",
  testimonials: "testimonials",
  interests: "interests",
  shelf: "shelf",
  github: "github",
};

export function hiddenFields(
  pageHidden: readonly PortfolioSection[],
  contentHidden: readonly ContentSection[],
): Set<ContentField> {
  const page = new Set(pageHidden);
  const content = new Set(contentHidden);
  return new Set(
    CONTENT_FIELDS.filter((field) => {
      const section = PAGE_SWITCH[field];
      const switchOff = CONTENT_SWITCH[field];
      return (section && page.has(section)) || (switchOff && content.has(switchOff));
    }),
  );
}

export type ChecklistItem = {
  field: ContentField;
  label: string;
  done: boolean;
  note: string;
  hidden: boolean;
};

// The editor's list of what a design draws, worded from the portfolioContent messages.
export function contentChecklist(
  view: PortfolioContentView,
  fields: readonly ContentField[],
  copy: ChecklistCopy,
  format: Format,
  hidden: ReadonlySet<ContentField> = new Set(),
): ChecklistItem[] {
  const notes = copy.notes;
  const projects = view.projects;
  const yearsKnown = view.skills.some((group) => group.items.some((item) => item.years !== null));
  const count = (n: number, forms: PluralForms, none: string) =>
    n > 0 ? format.plural(forms, n) : none;
  const check: Record<ContentField, () => { done: boolean; note: string }> = {
    pitch: () => ({
      done: view.pitch !== "",
      note: view.pitch ? notes.fromSummary : notes.pitch,
    }),
    disciplines: () => ({
      done: view.disciplines.length >= 2,
      note: count(view.disciplines.length, notes.words, notes.disciplines),
    }),
    availability: () => ({
      done: view.availability !== null,
      note: view.availability?.short ?? notes.availability,
    }),
    location: () => ({
      done: view.location?.timezone != null,
      note: view.location
        ? view.location.timezone
          ? view.location.label
          : notes.pickZone
        : notes.addCity,
    }),
    socials: () => ({
      done: view.socials.length > 0,
      note: count(view.socials.length, notes.links, notes.socials),
    }),
    about: () => ({
      done: view.about.length > 0,
      note: count(view.about.length, notes.paragraphs, notes.about),
    }),
    now: () => ({
      done: view.now !== null,
      note: view.now ? fmt(notes.things, { count: view.now.items.length }) : notes.now,
    }),
    stats: () => ({
      done: view.stats.length >= 3,
      note: count(view.stats.length, notes.numbers, notes.stats),
    }),
    projectDetails: () => ({
      done: projects.some((project) => project.details.length > 0),
      note: notes.projectDetails,
    }),
    categories: () => ({
      done: projects.length > 0 && projects.every((project) => project.category),
      note: fmt(notes.categories, {
        done: projects.filter((project) => project.category).length,
        total: projects.length,
      }),
    }),
    jobHighlights: () => ({
      done: view.experience.some((job) => job.highlight),
      note: fmt(notes.jobHighlights, {
        done: view.experience.filter((job) => job.highlight).length,
        total: view.experience.length,
      }),
    }),
    skillYears: () => ({
      done: yearsKnown,
      note: yearsKnown ? notes.counted : notes.skillYears,
    }),
    milestones: () => ({
      done: view.milestones.length > 0,
      note: count(view.milestones.length, notes.milestoneCount, notes.milestones),
    }),
    talks: () => ({
      done: view.talks.length > 0,
      note: count(view.talks.length, notes.talkCount, notes.talks),
    }),
    writing: () => ({
      done: view.writing.length > 0,
      note: count(view.writing.length, notes.posts, notes.writing),
    }),
    testimonials: () => ({
      done: view.testimonials.length > 0,
      note: count(view.testimonials.length, notes.quotes, notes.testimonials),
    }),
    interests: () => ({
      done: view.interests.length > 0,
      note: count(view.interests.length, notes.interestCount, notes.interests),
    }),
    shelf: () => ({
      done: view.shelf.length > 0,
      note: count(view.shelf.length, notes.items, notes.shelf),
    }),
    github: () => ({
      done: view.github !== null,
      note: view.github ? `github.com/${view.github.username}` : notes.github,
    }),
  };
  return fields.map((field) => {
    const item = { field, label: copy.labels[field], ...check[field](), hidden: false };
    return hidden.has(field) ? { ...item, hidden: true, note: notes.hidden } : item;
  });
}
