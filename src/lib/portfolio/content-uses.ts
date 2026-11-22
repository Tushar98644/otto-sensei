import { pluralize } from "@/lib/utils";
import type { ContentSection, PortfolioContentView } from "./content";
import type { PortfolioSection } from "./types";

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

export const CONTENT_FIELD_LABELS: Record<ContentField, string> = {
  pitch: "Pitch",
  disciplines: "What you do",
  availability: "Availability",
  location: "Location and time",
  socials: "Social links",
  about: "About",
  now: "Now",
  stats: "Headline numbers",
  projectDetails: "Project write-ups",
  categories: "Project categories",
  jobHighlights: "Job highlights",
  skillYears: "Years per skill",
  milestones: "Milestones and hackathons",
  talks: "Talks",
  writing: "Writing",
  testimonials: "Testimonials",
  interests: "Interests",
  shelf: "Bookshelf",
  github: "GitHub",
};

export const REFERENCE_USES = {
  chiangV4: ["pitch", "about", "socials", "jobHighlights"],
  chanhdai: ["disciplines", "about", "location", "socials", "stats", "testimonials", "milestones"],
  antfu: ["about", "categories", "talks", "writing", "socials"],
  alanagoyal: ["about", "socials", "writing", "shelf", "now"],
  hamish: ["disciplines", "projectDetails", "socials"],
  magicui: ["about", "milestones", "socials"],
  bento: ["location", "socials", "github", "now", "stats"],
  cali: ["about", "writing", "shelf", "location", "socials"],
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
  paper: ["pitch", "about", "socials", "writing", "interests", "shelf", "location"],
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

export function contentChecklist(
  view: PortfolioContentView,
  fields: readonly ContentField[],
  hidden: ReadonlySet<ContentField> = new Set(),
): ChecklistItem[] {
  const projects = view.projects;
  const yearsKnown = view.skills.some((group) => group.items.some((item) => item.years !== null));
  const count = (n: number, word: string, none: string) => (n > 0 ? pluralize(n, word) : none);
  const check: Record<ContentField, () => { done: boolean; note: string }> = {
    pitch: () => ({
      done: view.pitch !== "",
      note: view.pitch ? "From your summary" : "One sentence about what you do",
    }),
    disciplines: () => ({
      done: view.disciplines.length >= 2,
      note: count(view.disciplines.length, "word", "A few words for what you do"),
    }),
    availability: () => ({
      done: view.availability !== null,
      note: view.availability?.short ?? "Say if you're open to work",
    }),
    location: () => ({
      done: view.location?.timezone != null,
      note: view.location
        ? view.location.timezone
          ? view.location.label
          : "Pick your time zone"
        : "Add your city",
    }),
    socials: () => ({
      done: view.socials.length > 0,
      note: count(view.socials.length, "link", "Add a link"),
    }),
    about: () => ({
      done: view.about.length > 0,
      note: count(view.about.length, "paragraph", "A few lines about you"),
    }),
    now: () => ({
      done: view.now !== null,
      note: view.now ? `${view.now.items.length} things` : "What you're building or learning",
    }),
    stats: () => ({
      done: view.stats.length >= 3,
      note: count(view.stats.length, "number", "Numbers you're proud of"),
    }),
    projectDetails: () => ({
      done: projects.some((project) => project.details.length > 0),
      note: "A longer write-up for your best project",
    }),
    categories: () => ({
      done: projects.length > 0 && projects.every((project) => project.category),
      note: `${projects.filter((project) => project.category).length} of ${projects.length} projects`,
    }),
    jobHighlights: () => ({
      done: view.experience.some((job) => job.highlight),
      note: `${view.experience.filter((job) => job.highlight).length} of ${view.experience.length} jobs`,
    }),
    skillYears: () => ({
      done: yearsKnown,
      note: yearsKnown ? "Counted from your jobs" : "Years for your main skills",
    }),
    milestones: () => ({
      done: view.milestones.length > 0,
      note: count(view.milestones.length, "milestone", "Awards, hackathons, launches"),
    }),
    talks: () => ({
      done: view.talks.length > 0,
      note: count(view.talks.length, "talk", "Talks you've given"),
    }),
    writing: () => ({
      done: view.writing.length > 0,
      note: count(view.writing.length, "post", "Links to what you've written"),
    }),
    testimonials: () => ({
      done: view.testimonials.length > 0,
      note: count(view.testimonials.length, "quote", "A line from someone you worked with"),
    }),
    interests: () => ({
      done: view.interests.length > 0,
      note: count(view.interests.length, "interest", "What you do outside work"),
    }),
    shelf: () => ({
      done: view.shelf.length > 0,
      note: count(view.shelf.length, "item", "Books or albums you love"),
    }),
    github: () => ({
      done: view.github !== null,
      note: view.github ? `github.com/${view.github.username}` : "Connect your GitHub account",
    }),
  };
  return fields.map((field) => {
    const item = { field, label: CONTENT_FIELD_LABELS[field], ...check[field](), hidden: false };
    return hidden.has(field) ? { ...item, hidden: true, note: "Hidden on your page" } : item;
  });
}
