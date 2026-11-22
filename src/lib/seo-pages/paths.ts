import type { HiringSystemId } from "@/lib/ats/types";

export const SEO_PATHS = {
  resumeTemplates: "/resume-templates",
  ats: "/ats",
  compare: "/compare",
  jobMatch: "/job-match",
  llms: "/llms.txt",
  llmsFull: "/llms-full.txt",
} as const;

// /job-match?job=<link> opens the check with that job post read.
export const JOB_MATCH_PARAM = "job";

// Bump when the guide, template or comparison pages change in substance.
export const SEO_PAGES_UPDATED = "2026-11-21";

// Bump when the home, pricing or job match pages change in substance.
export const PRODUCT_PAGES_UPDATED = "2026-11-21";

export function atsPath(id: HiringSystemId): string {
  return `${SEO_PATHS.ats}/${id}`;
}

export function comparePath(slug: string): string {
  return `${SEO_PATHS.compare}/${slug}`;
}
