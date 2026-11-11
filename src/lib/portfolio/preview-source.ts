import type { ContentProject } from "./content";

// Design previews draw the person's own page or the sample (Jordan Ellis). A thin page makes every
// design look bare, so previews start on the sample until the page has enough words, then remember
// the pick. The real page and the editor's live preview always draw the person's own content.

export const PREVIEW_SOURCES = ["own", "sample"] as const;
export type PreviewSource = (typeof PREVIEW_SOURCES)[number];

// Kept here so the switch doesn't pull the whole fixture in; the fixture's test checks they agree.
export const SAMPLE_NAME = "Jordan Ellis";

// Below this many projects with a line or description, most designs draw bare cards and screens.
export const MIN_DESCRIBED_PROJECTS = 2;
export const MIN_ROLES = 1;

// Pictures don't count: pages have none.
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

// No page of their own: always the sample. Else the remembered choice, else sample for a thin page.
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
