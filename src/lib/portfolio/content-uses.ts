import { pluralize } from "@/lib/utils";
import type { ContentSection, PortfolioContentView } from "./content";
import type { PortfolioSection } from "./types";

// Pure and client-safe. Which pieces of content each design draws, so the editor can say "This
// design uses: photo, screenshots, interests" and show a short checklist for just those.
//
// Every template id is listed in TEMPLATE_USES with what its design actually draws. An id that
// isn't listed is treated as using everything.

export const CONTENT_FIELDS = [
  "photo",
  "pitch",
  "disciplines",
  "availability",
  "location",
  "socials",
  "about",
  "now",
  "stats",
  "screenshots",
  "video",
  "projectDetails",
  "categories",
  "logos",
  "jobHighlights",
  "skillYears",
  "milestones",
  "talks",
  "writing",
  "testimonials",
  "interests",
  "shelf",
  "photos",
  "github",
] as const;
export type ContentField = (typeof CONTENT_FIELDS)[number];

export const CONTENT_FIELD_LABELS: Record<ContentField, string> = {
  photo: "Photo",
  pitch: "Pitch",
  disciplines: "What you do",
  availability: "Availability",
  location: "Location and time",
  socials: "Social links",
  about: "About",
  now: "Now",
  stats: "Headline numbers",
  screenshots: "Screenshots",
  video: "Project video",
  projectDetails: "Project write-ups",
  categories: "Project categories",
  logos: "Logos",
  jobHighlights: "Job highlights",
  skillYears: "Years per skill",
  milestones: "Milestones and hackathons",
  talks: "Talks",
  writing: "Writing",
  testimonials: "Testimonials",
  interests: "Interests",
  shelf: "Bookshelf",
  photos: "Personal photos",
  github: "GitHub",
};

// The eight MIT-licensed reference sites the templates rebuild, and what each one shows.
export const REFERENCE_USES = {
  // bchiang7/v4: about with photo, jobs as company tabs, featured projects with big images.
  chiangV4: ["photo", "pitch", "about", "socials", "screenshots", "jobHighlights"],
  // BartoszJarocki/cv: one printable CV page.
  jarockiCv: ["photo", "location", "socials", "about"],
  // antfu/antfu.me: prose first, projects by category with icons, talks, writing.
  antfu: ["about", "categories", "logos", "talks", "writing", "socials"],
  // samuelkraft/samuelkraft-next: avatar, about, where they live, big project tiles, writing.
  kraft: ["photo", "about", "location", "screenshots", "writing", "socials"],
  // HamishMW/portfolio: rotating disciplines, projects in device frames, a page per project.
  hamish: ["disciplines", "screenshots", "video", "projectDetails", "socials"],
  // dillionverma/portfolio (magicui): avatar, logos, skill badges, project video, hackathons, dock.
  magicui: ["photo", "about", "logos", "screenshots", "video", "milestones", "socials"],
  // Ladvace/astro-bento-portfolio: tiles for location, GitHub, socials, now, projects.
  bento: ["photo", "location", "socials", "github", "now", "stats", "screenshots"],
  // cali.so: paper look, halftone portrait, writing, photos, records and books, a local clock.
  cali: ["photo", "about", "writing", "shelf", "photos", "location", "socials"],
} as const satisfies Record<string, readonly ContentField[]>;

// By template id: what each rebuild draws for our users, which can go past its reference (Folio
// adds the repo's Workplaces list, Paper adds interests).
export const TEMPLATE_USES: Record<string, readonly ContentField[]> = {
  navy: ["photo", "pitch", "about", "socials", "screenshots", "availability"],
  dock: [
    "photo",
    "pitch",
    "about",
    "photos",
    "logos",
    "screenshots",
    "video",
    "milestones",
    "socials",
    "availability",
  ],
  reel: ["disciplines", "screenshots", "video", "projectDetails", "photo", "about", "socials"],
  bento: ["photo", "pitch", "about", "location", "socials", "github", "now", "screenshots"],
  cv: ["photo", "location", "socials", "about"],
  prose: ["pitch", "about", "logos", "categories", "talks", "writing", "socials"],
  folio: ["photo", "pitch", "about", "location", "socials", "screenshots", "logos", "writing"],
  paper: [
    "photo",
    "pitch",
    "about",
    "socials",
    "writing",
    "photos",
    "interests",
    "shelf",
    "location",
  ],
};

export function contentUsesFor(templateId: string): readonly ContentField[] {
  return TEMPLATE_USES[templateId] ?? CONTENT_FIELDS;
}

// The switch that keeps each piece of content off the page: a section under "What shows" or a
// "Show on my page" row in the content editor. Fields not listed (pitch, availability...) have none.
const PAGE_SWITCH: Partial<Record<ContentField, PortfolioSection>> = {
  about: "about",
  socials: "links",
  screenshots: "projects",
  video: "projects",
  projectDetails: "projects",
  categories: "projects",
  logos: "experience",
  jobHighlights: "experience",
  skillYears: "skills",
};
const CONTENT_SWITCH: Partial<Record<ContentField, ContentSection>> = {
  photo: "photo",
  location: "location",
  now: "now",
  stats: "stats",
  milestones: "milestones",
  talks: "talks",
  writing: "writing",
  testimonials: "testimonials",
  interests: "interests",
  shelf: "shelf",
  photos: "photos",
  github: "github",
};

/** The fields the owner has switched off on the page, either way. */
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
  // Switched off on the page: still listed, never asked for.
  hidden: boolean;
};

/**
 * One line per piece of content the design uses: is it there yet, and what's missing. Pass the
 * editor's full view and the hidden fields, so hidden content still counts and is marked.
 */
export function contentChecklist(
  view: PortfolioContentView,
  fields: readonly ContentField[],
  hidden: ReadonlySet<ContentField> = new Set(),
): ChecklistItem[] {
  const projects = view.projects;
  const withShots = projects.filter((project) => project.images.length > 0).length;
  const withLogo = view.experience.filter((job) => job.logo.src).length;
  const yearsKnown = view.skills.some((group) => group.items.some((item) => item.years !== null));
  const count = (n: number, word: string, none: string) => (n > 0 ? pluralize(n, word) : none);
  const check: Record<ContentField, () => { done: boolean; note: string }> = {
    photo: () => ({
      done: view.photo !== null,
      note: view.photo ? "Added" : "Add a photo, or your initials show",
    }),
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
    screenshots: () => ({
      done: projects.length > 0 && withShots >= Math.min(3, projects.length),
      note:
        projects.length > 0 ? `${withShots} of ${projects.length} projects` : "Add a project first",
    }),
    video: () => ({
      done: projects.some((project) => project.video),
      note: "A demo video for one project",
    }),
    projectDetails: () => ({
      done: projects.some((project) => project.details.length > 0),
      note: "A longer write-up for your best project",
    }),
    categories: () => ({
      done: projects.length > 0 && projects.every((project) => project.category),
      note: `${projects.filter((project) => project.category).length} of ${projects.length} projects`,
    }),
    logos: () => ({
      done: view.experience.length > 0 && withLogo === view.experience.length,
      note:
        view.experience.length > 0
          ? `${withLogo} of ${view.experience.length} jobs`
          : "No jobs yet",
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
    photos: () => ({
      done: view.photos.length > 0,
      note: count(view.photos.length, "photo", "Up to 6 photos of you"),
    }),
    github: () => ({
      done: view.github !== null,
      note: view.github ? `github.com/${view.github.username}` : "Add your GitHub username",
    }),
  };
  return fields.map((field) => {
    const item = { field, label: CONTENT_FIELD_LABELS[field], ...check[field](), hidden: false };
    return hidden.has(field) ? { ...item, hidden: true, note: "Hidden on your page" } : item;
  });
}
