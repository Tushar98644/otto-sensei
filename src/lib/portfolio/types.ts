import type { z } from "zod";
import type {
  CreatePortfolioSchema,
  PortfolioSectionSchema,
  PortfolioTemplateIdSchema,
  UpdatePortfolioSchema,
} from "./validation";
import { type Resume } from "@/lib/resume/schema";
import type { GitHubStats, PortfolioContent } from "./content";

// Re-exported from @/lib/api/types.

// Must match the CHECK on portfolios.template. Each id rebuilds an MIT-licensed portfolio
// (./templates.ts).
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
export type PortfolioTemplateId = z.infer<typeof PortfolioTemplateIdSchema>;
export const DEFAULT_PORTFOLIO_TEMPLATE: PortfolioTemplateId = "navy";

// In page order. The name and headline always show.
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
  // Per account per hour; trying templates is a click each.
  writesPerHour: 120,
  slugChecksPerMinute: 30,
  // Past it the counter waits for the next hour.
  viewsPerHour: 300,
  viewsMax: 1_000_000,
  keptRedirects: 5,
  redirectDays: 90,
} as const;

export function portfolioPath(slug: string): string {
  return `/p/${slug}`;
}
export type CreatePortfolioBody = z.input<typeof CreatePortfolioSchema>;
export type UpdatePortfolioBody = z.input<typeof UpdatePortfolioSchema>;
export type PortfolioPatch = z.output<typeof UpdatePortfolioSchema>;

export type PortfolioSettings = {
  template: PortfolioTemplateId;
  // Off by default: a page anyone can open shouldn't hand out a phone number unasked.
  showEmail: boolean;
  showPhone: boolean;
  hiddenSections: PortfolioSection[];
  sync: boolean;
  published: boolean;
  allowIndexing: boolean;
};

export const DEFAULT_PORTFOLIO_SETTINGS: Omit<PortfolioSettings, "template"> = {
  showEmail: false,
  showPhone: false,
  hiddenSections: [],
  sync: true,
  published: false,
  allowIndexing: false,
};

export type Portfolio = PortfolioSettings & {
  id: string;
  resumeId: string;
  slug: string;
  // The resume as the PDF prints it (no tailoring notes), for previews when it isn't in this
  // browser.
  snapshot: Resume;
  versionAt: number;
  content: PortfolioContent;
  github: GitHubStats | null;
  views: number;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
};

export type PortfolioResponse = { ok: true; portfolio: Portfolio | null };
// created: false when POST pointed an existing portfolio at this resume.
export type PortfolioSaveResponse = { ok: true; portfolio: Portfolio; created: boolean };
export type PortfolioSlugResponse = {
  ok: true;
  slug: string;
  available: boolean;
  message: string | null;
};
