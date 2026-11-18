import type { HiringSystemId } from "@/lib/ats/types";

export const SEO_PATHS = {
  resumeTemplates: "/resume-templates",
  ats: "/ats",
  compare: "/compare",
  jobMatch: "/job-match",
  llms: "/llms.txt",
} as const;

// Bump when the guide, template or comparison pages change in substance.
export const SEO_PAGES_UPDATED = "2026-11-18";

export function atsPath(id: HiringSystemId): string {
  return `${SEO_PATHS.ats}/${id}`;
}

export function comparePath(slug: string): string {
  return `${SEO_PATHS.compare}/${slug}`;
}
