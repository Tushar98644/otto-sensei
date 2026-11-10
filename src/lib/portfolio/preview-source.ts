import type { ContentProject } from "./content";

// Pure and client-safe. Whose page the design previews draw: the person's own, or the sample
// (Jordan Ellis, made up, ./fixtures/jordan.ts) with every section filled in. A thin page (little
// written about the projects, no about) makes every design look bare, so previews start on the
// sample until the person's page has enough words in it, and remember what they pick after that.
//
// Only previews switch. The person's real page, and the editor's live preview of it, always draw
// their own content.

export const PREVIEW_SOURCES = ["own", "sample"] as const;
export type PreviewSource = (typeof PREVIEW_SOURCES)[number];

// Kept here rather than read from the fixture, so the switch doesn't pull Jordan's whole page into
// the screens that show it. The fixture's test checks they agree.
export const SAMPLE_NAME = "Jordan Ellis";

// Below this many projects with a line or description, most designs draw bare cards and screens.
export const MIN_DESCRIBED_PROJECTS = 2;
// Below this many jobs, the experience sections (tabs, timelines, work lists) look empty.
export const MIN_ROLES = 1;

/**
 * Too little on the page to judge a design by: under two projects with words about them, no job,
 * or no about. Pictures don't count: pages have none.
 */
export function isThinPage(content: {
  projects: readonly Pick<ContentProject, "line" | "description">[];
  experience: readonly unknown[];
  about: readonly string[];
}): boolean {
  const described = content.projects.filter(
    (project) => project.line.trim() !== "" || project.description.trim() !== "",
  ).length;
  const hasAbout = content.about.some((paragraph) => paragraph.trim() !== "");
  return described < MIN_DESCRIBED_PROJECTS || content.experience.length < MIN_ROLES || !hasAbout;
}

export function parsePreviewSource(value: unknown): PreviewSource | null {
  return value === "own" || value === "sample" ? value : null;
}

/**
 * What a preview draws. Without a page of their own it's always the sample; otherwise the choice
 * this browser remembers, else the sample for a thin page and theirs for a full one.
 */
export function previewSourceFor({
  hasOwn,
  thin,
  stored,
}: {
  hasOwn: boolean;
  thin: boolean;
  stored: PreviewSource | null;
}): PreviewSource {
  if (!hasOwn) return "sample";
  return stored ?? (thin ? "sample" : "own");
}
