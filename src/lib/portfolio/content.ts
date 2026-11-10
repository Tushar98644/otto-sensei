import { z } from "zod";

// Pure and client-safe. The portfolio CONTENT CONTRACT: everything a rich template can draw beyond
// the resume itself (pitch, "now", stats, project write-ups, talks, writing, hackathons,
// testimonials, interests, a bookshelf, GitHub numbers).
//
// Text only (owner decision 2026-11-10): no uploads, no stored media and no pictures linked from
// other sites. Templates draw initials, monograms and patterns made from the text instead.
//
// Two halves:
//   1. PortfolioContent (stored, versioned, PortfolioContentSchema): only what the owner changed.
//      Every override is nullable; null means "fill it in for me" from the resume, GitHub or the
//      sign-in account, by the rules in ./content-view.ts and ./metrics.ts (no AI).
//   2. PortfolioContentView (resolved, for templates): what a template draws, built by
//      contentView() with every automatic value filled in and the owner's privacy choices applied.
//      Templates read only this (plus PortfolioView for the old six); every field may be empty,
//      and an empty list or null means "leave the section out", never a placeholder.
//
// Fixture for tests and previews: ./fixtures/jordan.ts (jordanContentView()).

export const PORTFOLIO_CONTENT_VERSION = 1;

export const CONTENT_LIMITS = {
  pitch: 200,
  intro: 400,
  availability: 120,
  availabilityShort: 40,
  aboutParagraphs: 6,
  aboutParagraph: 1_200,
  highlights: 12,
  highlight: 80,
  disciplines: 6,
  discipline: 40,
  socials: 12,
  label: 80,
  url: 500,
  now: 4,
  nowLabel: 30,
  nowText: 160,
  stats: 6,
  statValue: 16,
  statLabel: 60,
  projects: 40,
  projectName: 120,
  projectLine: 200,
  projectDescription: 1_200,
  projectDetails: 8,
  projectDetail: 1_500,
  category: 40,
  years: 30,
  outcome: 160,
  tags: 12,
  tag: 40,
  roles: 6,
  entries: 40,
  jobHighlight: 80,
  jobSummary: 300,
  jobType: 80,
  skillYears: 120,
  maxYears: 60,
  milestones: 30,
  talks: 30,
  writing: 30,
  testimonials: 12,
  quote: 600,
  interests: 12,
  shelf: 24,
  place: 120,
  date: 40,
  minutes: 240,
  title: 200,
  detail: 400,
} as const;

const L = CONTENT_LIMITS;
const text = (max: number) => z.string().trim().max(max);
// null: automatic. "" (or []) is the owner saying "none", which is different.
const auto = (max: number) => text(max).nullable().default(null);
const entryId = z.string().min(1).max(80);
const year = z.number().int().min(0).max(L.maxYears);

/** An https address a page may link to; "" for none. Checked again when the page draws it. */
const linkUrl = z
  .string()
  .trim()
  .max(L.url)
  .refine((value) => value === "" || webHref(value) !== null, { message: "Not a web address." });
const autoLink = linkUrl.nullable().default(null);

// ---------------------------------------------------------------------------------------------
// Stored content
// ---------------------------------------------------------------------------------------------

export const SOCIAL_KINDS = [
  "github",
  "linkedin",
  "x",
  "bluesky",
  "mastodon",
  "youtube",
  "dribbble",
  "behance",
  "instagram",
  "medium",
  "devto",
  "stackoverflow",
  "website",
  "email",
] as const;
export type SocialKind = (typeof SOCIAL_KINDS)[number];

export const SocialSchema = z.object({
  id: entryId,
  // Detected from the address when left out.
  kind: z.enum(SOCIAL_KINDS).optional(),
  label: text(L.label).default(""),
  // An https address, or mailto: for email.
  url: z
    .string()
    .trim()
    .max(L.url)
    .refine((value) => socialHref(value) !== null, { message: "Not a link." }),
});

// The device a design draws a project's screen on (Reel's laptop or pair of phones). "auto" lets
// the design choose.
export const DEVICE_FRAMES = ["auto", "laptop", "phone"] as const;
export type DeviceFrame = (typeof DEVICE_FRAMES)[number];

export const ProjectEntrySchema = z.object({
  // A resume project's id, "gh:<owner>/<repo>" for a GitHub repo, or "c:<uuid>" for one added here.
  id: entryId,
  name: auto(L.projectName),
  // One sentence for cards and lists.
  line: auto(L.projectLine),
  // A short paragraph for bigger cards.
  description: auto(L.projectDescription),
  // Longer paragraphs for a details page (Hamish-style); never filled automatically.
  details: z.array(text(L.projectDetail)).max(L.projectDetails).default([]),
  category: auto(L.category),
  years: auto(L.years),
  // "4.2k stars · 600+ sites".
  outcome: auto(L.outcome),
  tech: z.array(text(L.tag)).max(L.tags).nullable().default(null),
  // "Design", "Front end": what the person did on it.
  roles: z.array(text(L.tag)).max(L.roles).default([]),
  website: autoLink,
  source: autoLink,
  featured: z.boolean().nullable().default(null),
  hidden: z.boolean().default(false),
  // Anything else (the old "browser" and "none" frames included) reads as "auto".
  device: z.enum(DEVICE_FRAMES).catch("auto"),
});
export type ProjectEntry = z.infer<typeof ProjectEntrySchema>;

export const JobExtraSchema = z.object({
  // "-72% failed payouts"; null pulls the strongest number out of the job's lines.
  highlight: auto(L.jobHighlight),
  // One line under the title ("Own the payouts platform that pays 60,000 freelancers").
  summary: auto(L.jobSummary),
  // "Fintech · invoicing and payouts".
  type: auto(L.jobType),
  // The company's site, linked from its name.
  website: linkUrl.default(""),
  tags: z.array(text(L.tag)).max(L.tags).nullable().default(null),
});
export type JobExtra = z.infer<typeof JobExtraSchema>;

export const SchoolExtraSchema = z.object({
  website: linkUrl.default(""),
});
export type SchoolExtra = z.infer<typeof SchoolExtraSchema>;

export const StatSchema = z.object({
  id: entryId,
  value: text(L.statValue).min(1),
  label: text(L.statLabel).default(""),
});

export const MILESTONE_KINDS = ["award", "hackathon", "launch", "press", "talk", "other"] as const;
export type MilestoneKind = (typeof MILESTONE_KINDS)[number];

// Awards, hackathons (magicui's timeline), launches and press, newest first.
export const MilestoneSchema = z.object({
  id: entryId,
  kind: z.enum(MILESTONE_KINDS).default("other"),
  // "2024" or "Nov 2018".
  date: text(L.date).default(""),
  title: text(L.title).min(1),
  place: text(L.place).default(""),
  detail: text(L.detail).default(""),
  // "Winner", "1st of 120".
  result: text(L.tag).default(""),
  url: linkUrl.default(""),
});

export const TalkSchema = z.object({
  id: entryId,
  title: text(L.title).min(1),
  event: text(L.title).default(""),
  date: text(L.date).default(""),
  place: text(L.place).default(""),
  url: linkUrl.default(""),
  recording: linkUrl.default(""),
  slides: linkUrl.default(""),
});

export const WritingSchema = z.object({
  id: entryId,
  title: text(L.title).min(1),
  url: linkUrl.default(""),
  date: text(L.date).default(""),
  minutes: z.number().int().min(1).max(L.minutes).nullable().default(null),
  // "Postgres Weekly"; the link's site when empty.
  publisher: text(L.label).default(""),
});

export const TestimonialSchema = z.object({
  id: entryId,
  quote: text(L.quote).min(1),
  name: text(L.label).min(1),
  role: text(L.title).default(""),
  url: linkUrl.default(""),
});

export const InterestSchema = z.object({
  id: entryId,
  title: text(L.label).min(1),
  // The "number": "V5", "64 km", "1:2.2".
  stat: text(L.statValue).default(""),
  line: text(L.detail).default(""),
});

export const SHELF_KINDS = ["book", "album", "film", "game", "tool", "other"] as const;
export type ShelfKind = (typeof SHELF_KINDS)[number];

// Cali-style shelf of favourites: books, albums, films.
export const ShelfItemSchema = z.object({
  id: entryId,
  kind: z.enum(SHELF_KINDS).default("book"),
  title: text(L.title).min(1),
  by: text(L.label).default(""),
  url: linkUrl.default(""),
});

export const NowSchema = z.object({
  id: entryId,
  // "Building", "Reading", "Learning".
  label: text(L.nowLabel).min(1),
  text: text(L.nowText).default(""),
});

// Sections a template may draw that the owner can switch off without deleting what's in them.
export const CONTENT_SECTIONS = [
  "now",
  "stats",
  "milestones",
  "talks",
  "writing",
  "testimonials",
  "interests",
  "shelf",
  "github",
  "location",
] as const;
export type ContentSection = (typeof CONTENT_SECTIONS)[number];

const isContentSection = (key: string): key is ContentSection =>
  (CONTENT_SECTIONS as readonly string[]).includes(key);

export const PortfolioContentSchema = z.object({
  v: z.literal(PORTFOLIO_CONTENT_VERSION).default(PORTFOLIO_CONTENT_VERSION),
  pitch: auto(L.pitch),
  intro: auto(L.intro),
  // Hamish-style rotating words ("Developer", "Designer").
  disciplines: z.array(text(L.discipline)).max(L.disciplines).nullable().default(null),
  availability: z
    .object({
      open: z.boolean().default(true),
      text: text(L.availability).default(""),
      short: text(L.availabilityShort).default(""),
    })
    .nullable()
    .default(null),
  location: z
    .object({
      label: text(L.place).default(""),
      // IANA name, for the live clock: "Europe/Lisbon".
      timezone: text(64).default(""),
      lat: z.number().min(-90).max(90).nullable().default(null),
      lng: z.number().min(-180).max(180).nullable().default(null),
    })
    .nullable()
    .default(null),
  socials: z.array(SocialSchema).max(L.socials).nullable().default(null),
  about: z.array(text(L.aboutParagraph)).max(L.aboutParagraphs).nullable().default(null),
  // Phrases inside the about text that templates mark (bold, colour, underline).
  highlights: z.array(text(L.highlight).min(1)).max(L.highlights).nullable().default(null),
  now: z.array(NowSchema).max(L.now).nullable().default(null),
  nowUpdatedAt: z.number().int().nonnegative().nullable().default(null),
  stats: z.array(StatSchema).max(L.stats).nullable().default(null),
  // Order and per-project extras. Resume projects missing here follow in resume order.
  projects: z.array(ProjectEntrySchema).max(L.projects).default([]),
  // Keyed by the resume entry's id.
  jobs: z.record(entryId, JobExtraSchema).default({}),
  schools: z.record(entryId, SchoolExtraSchema).default({}),
  // Lowercased skill name -> years (null: counted from the jobs that mention it).
  skillYears: z.record(text(100), year.nullable()).default({}),
  milestones: z.array(MilestoneSchema).max(L.milestones).nullable().default(null),
  talks: z.array(TalkSchema).max(L.talks).nullable().default(null),
  writing: z.array(WritingSchema).max(L.writing).nullable().default(null),
  testimonials: z.array(TestimonialSchema).max(L.testimonials).default([]),
  interests: z.array(InterestSchema).max(L.interests).nullable().default(null),
  shelf: z.array(ShelfItemSchema).max(L.shelf).default([]),
  github: z
    .object({
      // null: the username on the resume (a GitHub link or imported repos).
      username: z
        .string()
        .trim()
        .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i)
        .nullable()
        .default(null),
    })
    .default({ username: null }),
  // Names that are no longer sections (the old "photo" and "photos") are dropped, not refused.
  hidden: z
    .array(z.string().max(40))
    .max(CONTENT_SECTIONS.length * 2)
    .transform((keys) => [...new Set(keys.filter(isContentSection))])
    .default([]),
});
export type PortfolioContent = z.output<typeof PortfolioContentSchema>;
export type PortfolioContentInput = z.input<typeof PortfolioContentSchema>;

export function emptyContent(): PortfolioContent {
  return PortfolioContentSchema.parse({});
}

/** A stored row read as untrusted: anything that no longer passes becomes "all automatic". */
export function parseStoredContent(value: unknown): PortfolioContent {
  const parsed = PortfolioContentSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : emptyContent();
}

const filled = (value: string) => value.trim() !== "";
const okLink = (value: string) => (value.trim() === "" || webHref(value) ? value : "");
const okAutoLink = (value: string | null) => (value === null ? null : okLink(value));

/**
 * The document as the server will take it: rows still being typed (no title yet, a link that
 * isn't one) are left out of the save but stay on screen, so autosave never fails mid-word.
 */
export function saveableContent(content: PortfolioContent): PortfolioContent {
  return {
    ...content,
    highlights: content.highlights?.filter(filled) ?? null,
    disciplines: content.disciplines?.filter(filled) ?? null,
    socials: content.socials?.filter((item) => socialHref(item.url) !== null) ?? null,
    now: content.now?.filter((item) => filled(item.label)) ?? null,
    stats: content.stats?.filter((item) => filled(item.value)) ?? null,
    projects: content.projects.map((entry) => ({
      ...entry,
      website: okAutoLink(entry.website),
      source: okAutoLink(entry.source),
      details: entry.details.filter(filled),
    })),
    jobs: Object.fromEntries(
      Object.entries(content.jobs).map(([id, job]) => [
        id,
        { ...job, website: okLink(job.website) },
      ]),
    ),
    schools: Object.fromEntries(
      Object.entries(content.schools).map(([id, school]) => [
        id,
        { ...school, website: okLink(school.website) },
      ]),
    ),
    milestones:
      content.milestones
        ?.filter((item) => filled(item.title))
        .map((item) => ({ ...item, url: okLink(item.url) })) ?? null,
    talks:
      content.talks
        ?.filter((item) => filled(item.title))
        .map((item) => ({
          ...item,
          url: okLink(item.url),
          recording: okLink(item.recording),
          slides: okLink(item.slides),
        })) ?? null,
    writing:
      content.writing
        ?.filter((item) => filled(item.title))
        .map((item) => ({ ...item, url: okLink(item.url) })) ?? null,
    testimonials: content.testimonials
      .filter((item) => filled(item.quote) && filled(item.name))
      .map((item) => ({ ...item, url: okLink(item.url) })),
    interests: content.interests?.filter((item) => filled(item.title)) ?? null,
    shelf: content.shelf
      .filter((item) => filled(item.title))
      .map((item) => ({ ...item, url: okLink(item.url) })),
  };
}

// ---------------------------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------------------------

/** An http(s) address as a link target ("example.com" gets https://), or null. */
export function webHref(raw: string): string | null {
  const value = raw.trim();
  if (!value || /\s/.test(value)) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".") || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A social link's target: https, or mailto: for an email address. */
export function socialHref(raw: string): string | null {
  const value = raw.trim().replace(/^mailto:/i, "");
  if (EMAIL.test(value)) return `mailto:${value}`;
  return webHref(raw);
}

// ---------------------------------------------------------------------------------------------
// GitHub numbers (stored per portfolio, refreshed by the server, ./github-stats.ts)
// ---------------------------------------------------------------------------------------------

export type GitHubRepoSummary = {
  name: string;
  fullName: string;
  url: string;
  description: string;
  homepage: string;
  language: string;
  topics: string[];
  stars: number;
  forks: number;
  pushedAt: string;
};

export type GitHubStats = {
  username: string;
  name: string;
  bio: string;
  followers: number;
  publicRepos: number;
  // Over the person's own public repos, forks left out.
  totalStars: number;
  // Main language of each own repo, counted; biggest first, at most 6.
  languages: { name: string; repos: number; percent: number }[];
  // Most starred own repos still alive, at most 8.
  repos: GitHubRepoSummary[];
  activity: {
    // ISO time of the newest public event, null when GitHub lists none (it keeps 90 days).
    lastActiveAt: string | null;
    events90d: number;
    // Public events per week for the last 12 weeks, oldest first.
    weeks: number[];
    recent: { repo: string; kind: "push" | "pull" | "release" | "create" | "issue"; at: string }[];
  };
  // ISO time the account was made.
  joinedAt: string;
  fetchedAt: number;
};

// ---------------------------------------------------------------------------------------------
// Resolved view: what templates draw
// ---------------------------------------------------------------------------------------------

export type ContentLink = { href: string; text: string };

export type ContentSocial = { kind: SocialKind; label: string; handle: string; href: string };

// One paragraph split around the owner's highlighted phrases.
export type TextPart = { text: string; mark: boolean };

export type ContentProject = {
  id: string;
  from: "resume" | "github" | "custom";
  name: string;
  line: string;
  description: string;
  details: string[];
  // The resume's own lines for it.
  lines: string[];
  category: string;
  years: string;
  outcome: string;
  tech: string[];
  roles: string[];
  website: ContentLink | null;
  source: (ContentLink & { repo: string | null }) | null;
  featured: boolean;
  // Pushed to on GitHub in the last 90 days.
  active: boolean;
  stars: number | null;
  device: DeviceFrame;
  // "TA" for Tally: what a design draws where an icon would go.
  monogram: string;
};

export type ContentRole = {
  id: string;
  title: string;
  company: string;
  location: string;
  dates: string;
  start: string;
  end: string;
  current: boolean;
  lines: string[];
  highlight: string;
  summary: string;
  type: string;
  website: ContentLink | null;
  // "LE" for Ledgerly.
  monogram: string;
  tags: string[];
};

export type ContentSchool = {
  id: string;
  school: string;
  degree: string;
  dates: string;
  start: string;
  end: string;
  lines: string[];
  website: ContentLink | null;
  monogram: string;
};

export type ContentSkillGroup = {
  id: string;
  label: string;
  items: { name: string; years: number | null }[];
};

export type ContentMilestone = {
  id: string;
  kind: MilestoneKind;
  date: string;
  title: string;
  place: string;
  detail: string;
  result: string;
  href: string | null;
};

export type ContentTalk = {
  id: string;
  title: string;
  event: string;
  date: string;
  place: string;
  href: string | null;
  recording: string | null;
  slides: string | null;
};

export type ContentWriting = {
  id: string;
  title: string;
  href: string | null;
  date: string;
  minutes: number | null;
  publisher: string;
};

export type ContentTestimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  href: string | null;
  initials: string;
};

export type ContentInterest = { id: string; title: string; stat: string; line: string };
export type ContentShelfItem = {
  id: string;
  kind: ShelfKind;
  title: string;
  by: string;
  href: string | null;
};

export type ContentGitHub = Omit<GitHubStats, "fetchedAt"> & { href: string };

export type PortfolioContentView = {
  name: string;
  first: string;
  initials: string;
  headline: string;
  pitch: string;
  intro: string;
  disciplines: string[];
  availability: { open: boolean; text: string; short: string } | null;
  // For a clock or map tile. coords only for places the app knows (./places.ts) or the owner set.
  location: {
    label: string;
    city: string;
    timezone: string | null;
    coords: { lat: number; lng: number } | null;
  } | null;
  // Only what the owner chose to show on the page.
  email: string | null;
  phone: string | null;
  socials: ContentSocial[];
  about: string[];
  aboutParts: TextPart[][];
  now: { items: { label: string; text: string }[]; updatedAt: number | null } | null;
  stats: { value: string; label: string }[];
  // In the owner's order; featured ones keep their place (templates pick them out).
  projects: ContentProject[];
  experience: ContentRole[];
  education: ContentSchool[];
  skills: ContentSkillGroup[];
  milestones: ContentMilestone[];
  talks: ContentTalk[];
  writing: ContentWriting[];
  testimonials: ContentTestimonial[];
  interests: ContentInterest[];
  shelf: ContentShelfItem[];
  github: ContentGitHub | null;
  updatedAt: number;
};

// ---------------------------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------------------------

// PUT /api/portfolio/content: the whole document each time (autosaved). The answer is the saved copy.
export const SaveContentSchema = z.object({ content: PortfolioContentSchema });
export type SaveContentBody = { content: PortfolioContentInput };
export type ContentResponse = {
  ok: true;
  content: PortfolioContent;
  github: GitHubStats | null;
};

// POST /api/portfolio/github: fetches the numbers again. `github` is null without a username.
export type GitHubRefreshResponse = { ok: true; github: GitHubStats | null };
