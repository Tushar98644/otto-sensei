import type { z } from "zod";
import type { GitHubStats } from "./content-view-types";
import type {
  JobExtraSchema,
  PortfolioContentSchema,
  ProjectEntrySchema,
  SchoolExtraSchema,
} from "./content-validation";

export type {
  GitHubRepoSummary,
  GitHubStats,
  ContentLink,
  ContentSocial,
  TextPart,
  ContentProject,
  ContentRole,
  ContentSchool,
  ContentSkillGroup,
  ContentMilestone,
  ContentTalk,
  ContentWriting,
  ContentTestimonial,
  ContentInterest,
  ContentShelfItem,
  ContentGitHub,
  PortfolioContentView,
} from "./content-view-types";

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
  entryId: 80,
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

export const DEVICE_FRAMES = ["auto", "laptop", "phone"] as const;
export type DeviceFrame = (typeof DEVICE_FRAMES)[number];

export const MILESTONE_KINDS = ["award", "hackathon", "launch", "press", "talk", "other"] as const;
export type MilestoneKind = (typeof MILESTONE_KINDS)[number];

export const SHELF_KINDS = ["book", "album", "film", "game", "tool", "other"] as const;
export type ShelfKind = (typeof SHELF_KINDS)[number];

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

export type ProjectEntry = z.infer<typeof ProjectEntrySchema>;
export type JobExtra = z.infer<typeof JobExtraSchema>;
export type SchoolExtra = z.infer<typeof SchoolExtraSchema>;
export type PortfolioContent = z.output<typeof PortfolioContentSchema>;
export type PortfolioContentInput = z.input<typeof PortfolioContentSchema>;

// Schema defaults as plain objects, so the browser needs no zod; content.test.ts keeps them equal.
export function emptyContent(): PortfolioContent {
  return {
    v: PORTFOLIO_CONTENT_VERSION,
    pitch: null,
    intro: null,
    disciplines: null,
    availability: null,
    location: null,
    socials: null,
    about: null,
    highlights: null,
    now: null,
    nowUpdatedAt: null,
    stats: null,
    projects: [],
    jobs: {},
    schools: {},
    skillYears: {},
    milestones: null,
    talks: null,
    writing: null,
    testimonials: [],
    interests: null,
    shelf: [],
    github: { username: null },
    hidden: [],
  };
}

export function newProjectEntry(id: string, name: string | null = null): ProjectEntry {
  // The save would refuse the whole document over one bad id, so refuse the entry here instead.
  if (id.length === 0 || id.length > CONTENT_LIMITS.entryId) {
    throw new RangeError(`A project id needs 1 to ${CONTENT_LIMITS.entryId} characters.`);
  }
  return {
    id,
    name,
    line: null,
    description: null,
    details: [],
    category: null,
    years: null,
    outcome: null,
    tech: null,
    roles: [],
    website: null,
    source: null,
    featured: null,
    hidden: false,
    device: "auto",
  };
}

export function emptyJobExtra(): JobExtra {
  return { highlight: null, summary: null, type: null, website: "", tags: null };
}

export function emptySchoolExtra(): SchoolExtra {
  return { website: "" };
}

const filled = (value: string) => value.trim() !== "";
const okLink = (value: string) => (value.trim() === "" || webHref(value) ? value : "");
const okAutoLink = (value: string | null) => (value === null ? null : okLink(value));

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

export function socialHref(raw: string): string | null {
  const value = raw.trim().replace(/^mailto:/i, "");
  if (EMAIL.test(value)) return `mailto:${value}`;
  return webHref(raw);
}

export type SaveContentBody = { content: PortfolioContentInput };
export type ContentResponse = {
  ok: true;
  content: PortfolioContent;
  github: GitHubStats | null;
};

export type GitHubRefreshResponse = { ok: true; github: GitHubStats | null };
