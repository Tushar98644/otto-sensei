import { newBullet, newId, type Project, type Resume } from "@/lib/resume/schema";
import type { GitHubDraftEntry } from "./types";

export const MAX_PROJECTS = 30;
const MAX_BULLETS = 20;

function linkKey(link: string): string {
  return link
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

export function isOnResume(resume: Resume, entry: Pick<GitHubDraftEntry, "name" | "link">): boolean {
  const link = linkKey(entry.link);
  const name = entry.name.trim().toLowerCase();
  return resume.projects.some(
    (project) => linkKey(project.link) === link || project.name.trim().toLowerCase() === name,
  );
}

function toProject(entry: GitHubDraftEntry): Project {
  return {
    id: newId(),
    name: entry.name.trim().slice(0, 200),
    link: entry.link.trim().slice(0, 500),
    bullets: entry.bullets.slice(0, MAX_BULLETS).map((text) => newBullet(text.slice(0, 1_000))),
  };
}

export type AddProjectsResult = { resume: Resume; added: number; skipped: number };

export function addGitHubProjects(resume: Resume, entries: readonly GitHubDraftEntry[]): AddProjectsResult {
  const room = Math.max(0, MAX_PROJECTS - resume.projects.length);
  const added = entries.slice(0, room).map(toProject);
  const skipped = entries.length - added.length;
  if (added.length === 0) return { resume, added: 0, skipped };
  const sectionOrder = resume.sectionOrder.includes("projects")
    ? resume.sectionOrder
    : [...resume.sectionOrder, "projects" as const];
  const hiddenSections = resume.hiddenSections?.filter((key) => key !== "projects");
  return {
    resume: {
      ...resume,
      projects: [...resume.projects, ...added],
      sectionOrder,
      ...(hiddenSections ? { hiddenSections } : {}),
    },
    added: added.length,
    skipped,
  };
}
