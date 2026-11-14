import { z } from "zod";
import {
  CONTENT_LIMITS,
  CONTENT_SECTIONS,
  DEVICE_FRAMES,
  emptyContent,
  MILESTONE_KINDS,
  PORTFOLIO_CONTENT_VERSION,
  SHELF_KINDS,
  SOCIAL_KINDS,
  socialHref,
  webHref,
  type ContentSection,
  type PortfolioContent,
} from "./content";

const L = CONTENT_LIMITS;
const text = (max: number) => z.string().trim().max(max);
// null: automatic. "" (or []) is the owner saying "none", which is different.
const auto = (max: number) => text(max).nullable().default(null);
const entryId = z.string().min(1).max(L.entryId);
const year = z.number().int().min(0).max(L.maxYears);

const linkUrl = z
  .string()
  .trim()
  .max(L.url)
  .refine((value) => value === "" || webHref(value) !== null, { message: "Not a web address." });
const autoLink = linkUrl.nullable().default(null);

export const SocialSchema = z.object({
  id: entryId,
  kind: z.enum(SOCIAL_KINDS).optional(),
  label: text(L.label).default(""),
  url: z
    .string()
    .trim()
    .max(L.url)
    .refine((value) => socialHref(value) !== null, { message: "Not a link." }),
});

export const ProjectEntrySchema = z.object({
  id: entryId,
  name: auto(L.projectName),
  line: auto(L.projectLine),
  description: auto(L.projectDescription),
  details: z.array(text(L.projectDetail)).max(L.projectDetails).default([]),
  category: auto(L.category),
  years: auto(L.years),
  outcome: auto(L.outcome),
  tech: z.array(text(L.tag)).max(L.tags).nullable().default(null),
  roles: z.array(text(L.tag)).max(L.roles).default([]),
  website: autoLink,
  source: autoLink,
  featured: z.boolean().nullable().default(null),
  hidden: z.boolean().default(false),
  device: z.enum(DEVICE_FRAMES).catch("auto"),
});

export const JobExtraSchema = z.object({
  highlight: auto(L.jobHighlight),
  summary: auto(L.jobSummary),
  type: auto(L.jobType),
  website: linkUrl.default(""),
  tags: z.array(text(L.tag)).max(L.tags).nullable().default(null),
});

export const SchoolExtraSchema = z.object({
  website: linkUrl.default(""),
});

export const StatSchema = z.object({
  id: entryId,
  value: text(L.statValue).min(1),
  label: text(L.statLabel).default(""),
});

export const MilestoneSchema = z.object({
  id: entryId,
  kind: z.enum(MILESTONE_KINDS).default("other"),
  date: text(L.date).default(""),
  title: text(L.title).min(1),
  place: text(L.place).default(""),
  detail: text(L.detail).default(""),
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
  stat: text(L.statValue).default(""),
  line: text(L.detail).default(""),
});

export const ShelfItemSchema = z.object({
  id: entryId,
  kind: z.enum(SHELF_KINDS).default("book"),
  title: text(L.title).min(1),
  by: text(L.label).default(""),
  url: linkUrl.default(""),
});

export const NowSchema = z.object({
  id: entryId,
  label: text(L.nowLabel).min(1),
  text: text(L.nowText).default(""),
});

const isContentSection = (key: string): key is ContentSection =>
  (CONTENT_SECTIONS as readonly string[]).includes(key);

export const PortfolioContentSchema = z.object({
  v: z.literal(PORTFOLIO_CONTENT_VERSION).default(PORTFOLIO_CONTENT_VERSION),
  pitch: auto(L.pitch),
  intro: auto(L.intro),
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
      timezone: text(64).default(""),
      lat: z.number().min(-90).max(90).nullable().default(null),
      lng: z.number().min(-180).max(180).nullable().default(null),
    })
    .nullable()
    .default(null),
  socials: z.array(SocialSchema).max(L.socials).nullable().default(null),
  about: z.array(text(L.aboutParagraph)).max(L.aboutParagraphs).nullable().default(null),
  highlights: z.array(text(L.highlight).min(1)).max(L.highlights).nullable().default(null),
  now: z.array(NowSchema).max(L.now).nullable().default(null),
  nowUpdatedAt: z.number().int().nonnegative().nullable().default(null),
  stats: z.array(StatSchema).max(L.stats).nullable().default(null),
  projects: z.array(ProjectEntrySchema).max(L.projects).default([]),
  jobs: z.record(entryId, JobExtraSchema).default({}),
  schools: z.record(entryId, SchoolExtraSchema).default({}),
  skillYears: z.record(text(100), year.nullable()).default({}),
  milestones: z.array(MilestoneSchema).max(L.milestones).nullable().default(null),
  talks: z.array(TalkSchema).max(L.talks).nullable().default(null),
  writing: z.array(WritingSchema).max(L.writing).nullable().default(null),
  testimonials: z.array(TestimonialSchema).max(L.testimonials).default([]),
  interests: z.array(InterestSchema).max(L.interests).nullable().default(null),
  shelf: z.array(ShelfItemSchema).max(L.shelf).default([]),
  github: z
    .object({
      username: z
        .string()
        .trim()
        .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i)
        .nullable()
        .default(null),
    })
    .default({ username: null }),
  hidden: z
    .array(z.string().max(40))
    .max(CONTENT_SECTIONS.length * 2)
    .transform((keys) => [...new Set(keys.filter(isContentSection))])
    .default([]),
});

export function parseStoredContent(value: unknown): PortfolioContent {
  const parsed = PortfolioContentSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : emptyContent();
}

export const SaveContentSchema = z.object({ content: PortfolioContentSchema });
