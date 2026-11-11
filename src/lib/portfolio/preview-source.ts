import type { ContentProject } from "./content";

export const PREVIEW_SOURCES = ["own", "sample"] as const;
export type PreviewSource = (typeof PREVIEW_SOURCES)[number];

export const SAMPLE_NAME = "Jordan Ellis";

export const MIN_DESCRIBED_PROJECTS = 2;
export const MIN_ROLES = 1;

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
