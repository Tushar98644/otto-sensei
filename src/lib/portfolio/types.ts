import type { z } from "zod";
import type {
  CreatePortfolioSchema,
  PortfolioSectionSchema,
  PortfolioTemplateIdSchema,
  UpdatePortfolioSchema,
} from "./validation";
import { type Resume } from "@/lib/resume/schema";
import type { GitHubStats, PortfolioContent } from "./content";

// Must match the CHECK on portfolios.template.
export const PORTFOLIO_TEMPLATE_IDS = [
  "navy",
  "dock",
  "reel",
  "bento",
  "cv",
  "prose",
  "folio",
  "paper",
  "gazette",
  "terminal",
  "brutal",
  "card",
  "retro",
  "starring",
  "bubble",
] as const;
export type PortfolioTemplateId = z.infer<typeof PortfolioTemplateIdSchema>;
export const DEFAULT_PORTFOLIO_TEMPLATE: PortfolioTemplateId = "navy";

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
  writesPerHour: 120,
  slugChecksPerMinute: 30,
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
export type PortfolioSaveResponse = { ok: true; portfolio: Portfolio; created: boolean };
export type PortfolioSlugResponse = {
  ok: true;
  slug: string;
  available: boolean;
  message: string | null;
};
