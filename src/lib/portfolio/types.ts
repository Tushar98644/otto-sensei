import { z } from "zod";
import { ResumeSchema, type Resume } from "@/lib/resume/schema";
import type { GitHubStats, PortfolioContent } from "./content";
import { ProjectImagesSchema, type ProjectImages } from "./images";

// Client-safe contract for portfolios: one public page per account at /p/<slug>, made from one
// resume and shown in one of the web templates. Re-exported from @/lib/api/types.

// Must match the CHECK on portfolios.template (20261108006000_reference_templates.sql). Each id
// is a rebuild of an MIT-licensed reference portfolio (credits in ./templates.ts).
export const PORTFOLIO_TEMPLATE_IDS = [
  "navy",
  "dock",
  "reel",
  "bento",
  "cv",
  "prose",
  "folio",
  "paper",
] as const;
export const PortfolioTemplateIdSchema = z.enum(PORTFOLIO_TEMPLATE_IDS);
export type PortfolioTemplateId = z.infer<typeof PortfolioTemplateIdSchema>;
export const DEFAULT_PORTFOLIO_TEMPLATE: PortfolioTemplateId = "navy";

// What the owner can hide on the page, in page order. The name and headline always show.
export const PORTFOLIO_SECTIONS = [
  "about",
  "projects",
  "experience",
  "skills",
  "education",
  "certifications",
  "extras",
  "links",
] as const;
export const PortfolioSectionSchema = z.enum(PORTFOLIO_SECTIONS);
export type PortfolioSection = z.infer<typeof PortfolioSectionSchema>;

export const PORTFOLIO_SECTION_LABELS: Record<PortfolioSection, string> = {
  about: "About",
  projects: "Projects",
  experience: "Experience",
  skills: "Skills",
  education: "Education",
  certifications: "Certifications",
  extras: "Other sections",
  links: "Links",
};

export const PORTFOLIO_LIMITS = {
  // Changes per account per hour. Higher than share links: trying templates is a click each.
  writesPerHour: 120,
  // Address checks while typing, per account per minute.
  slugChecksPerMinute: 30,
  // Counted views per page per hour; past it the counter waits for the next hour.
  viewsPerHour: 300,
  viewsMax: 1_000_000,
  // Old addresses that keep redirecting after a change, newest first, and for how long.
  keptRedirects: 5,
  redirectDays: 90,
} as const;

export function portfolioPath(slug: string): string {
  return `/p/${slug}`;
}

// The address is checked against the slug rules (./slug.ts) by the route, so the person gets a
// reason instead of a generic "bad request".
const slugInput = z.string().trim().max(80);

// POST /api/portfolio: makes the account's portfolio from this resume, or points it at this
// resume when it already has one. The address is suggested from the name when none is given.
export const CreatePortfolioSchema = z.object({
  resume: ResumeSchema,
  slug: slugInput.optional(),
  template: PortfolioTemplateIdSchema.optional(),
});
export type CreatePortfolioBody = z.input<typeof CreatePortfolioSchema>;

// PATCH /api/portfolio: any of these, at least one. `resume` refreshes the page's copy (or
// switches it to another resume).
export const UpdatePortfolioSchema = z
  .object({
    resume: ResumeSchema.optional(),
    slug: slugInput.optional(),
    template: PortfolioTemplateIdSchema.optional(),
    showEmail: z.boolean().optional(),
    showPhone: z.boolean().optional(),
    hiddenSections: z
      .array(PortfolioSectionSchema)
      .max(PORTFOLIO_SECTIONS.length)
      .transform((keys) => [...new Set(keys)])
      .optional(),
    sync: z.boolean().optional(),
    published: z.boolean().optional(),
    allowIndexing: z.boolean().optional(),
    hideCredit: z.boolean().optional(),
    // The whole map each time; a project left out has no picture.
    projectImages: ProjectImagesSchema.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: "Nothing to change.",
  });
export type UpdatePortfolioBody = z.input<typeof UpdatePortfolioSchema>;
export type PortfolioPatch = z.output<typeof UpdatePortfolioSchema>;

// POST /api/portfolio/views: one visit to a published page, sent by the page itself.
export const PortfolioViewSchema = z.object({ slug: z.string().trim().max(80) });

export type PortfolioSettings = {
  template: PortfolioTemplateId;
  // Both off by default: a page anyone can open shouldn't hand out a phone number unasked.
  showEmail: boolean;
  showPhone: boolean;
  hiddenSections: PortfolioSection[];
  // On by default: the page follows its resume as it's edited.
  sync: boolean;
  published: boolean;
  // Off by default: the page asks search engines to stay away until the owner says otherwise.
  allowIndexing: boolean;
  // Pro and Max only; Free always shows the credit line.
  hideCredit: boolean;
  // Project id -> https picture address, set with the round-1 Showcase template (now removed).
  // Kept for those pages; the reference templates draw project pictures from `content` instead.
  projectImages: ProjectImages;
};

export const DEFAULT_PORTFOLIO_SETTINGS: Omit<PortfolioSettings, "template"> = {
  showEmail: false,
  showPhone: false,
  hiddenSections: [],
  sync: true,
  published: false,
  allowIndexing: false,
  hideCredit: false,
  projectImages: {},
};

export type Portfolio = PortfolioSettings & {
  id: string;
  // The resume's id in the owner's browser.
  resumeId: string;
  slug: string;
  // What the page shows (the resume as the PDF prints it, without tailoring notes), for previews
  // when the resume isn't in this browser.
  snapshot: Resume;
  // The resume's updatedAt when the page's copy was taken.
  versionAt: number;
  // What the rich templates show beyond the resume (./content.ts); automatic where null.
  content: PortfolioContent;
  // The GitHub numbers last fetched for the page, or null.
  github: GitHubStats | null;
  // Where uploaded pictures are served from ("" when uploads are off on this server).
  mediaBase: string;
  views: number;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
};

// GET /api/portfolio: the account's portfolio, or null before it has one.
export type PortfolioResponse = { ok: true; portfolio: Portfolio | null };
// POST and PATCH. created: false when POST pointed an existing portfolio at this resume.
export type PortfolioSaveResponse = { ok: true; portfolio: Portfolio; created: boolean };
// GET /api/portfolio/slug?value=: the address as it would be saved, and whether it's free.
export type PortfolioSlugResponse = {
  ok: true;
  slug: string;
  available: boolean;
  // Why it can't be used, in words for the person; null when it can.
  message: string | null;
};
