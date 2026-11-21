import { lintSummary } from "@/lib/lint/bullets";
import type { LintIssue } from "@/lib/lint/types";
import { extrasOf, sectionTitleOf, type Bullet, type Resume } from "@/lib/resume/schema";
import { sectionDisplayOrder } from "./sections";

export type OutlineEntry = { id: string; label: string; needWork: number };

export type OutlineSection = {
  key: string;
  label: string;
  needWork: number;
  entries: OutlineEntry[];
};

type IssuesById = ReadonlyMap<string, readonly LintIssue[]>;

function needingWork(bullets: readonly Bullet[], byBullet: IssuesById): number {
  return bullets.filter((bullet) => (byBullet.get(bullet.id)?.length ?? 0) > 0).length;
}

const joined = (parts: readonly string[], fallback: string) =>
  parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ") || fallback;

function section(key: string, label: string, entries: OutlineEntry[] = []): OutlineSection {
  return { key, label, needWork: entries.reduce((sum, e) => sum + e.needWork, 0), entries };
}

export function fixOutline(resume: Resume, byBullet: IssuesById): OutlineSection[] {
  const entry = (id: string, label: string, bullets: readonly Bullet[]): OutlineEntry => ({
    id,
    label,
    needWork: needingWork(bullets, byBullet),
  });
  const sections: OutlineSection[] = [section("basics", "Name and contact")];
  for (const key of sectionDisplayOrder(resume.sectionOrder)) {
    const label = sectionTitleOf(resume, key);
    switch (key) {
      case "experience":
        sections.push(
          section(
            key,
            label,
            resume.experience.map((job) =>
              entry(job.id, joined([job.title, job.company], "New job"), job.bullets),
            ),
          ),
        );
        break;
      case "projects":
        sections.push(
          section(
            key,
            label,
            resume.projects.map((project) =>
              entry(project.id, joined([project.name], "New project"), project.bullets),
            ),
          ),
        );
        break;
      case "education":
        sections.push(
          section(
            key,
            label,
            resume.education.map((school) =>
              entry(
                school.id,
                joined([school.degree, school.school], "New school"),
                school.bullets,
              ),
            ),
          ),
        );
        break;
      case "summary":
        sections.push({
          ...section(key, label),
          needWork: lintSummary(resume.summary).length > 0 ? 1 : 0,
        });
        break;
      default:
        sections.push(section(key, label));
    }
  }
  for (const extra of extrasOf(resume)) {
    sections.push(
      section(
        extra.id,
        extra.title.trim() || "Extra section",
        extra.items.map((item) =>
          entry(item.id, joined([item.title, item.subtitle], "New item"), item.bullets),
        ),
      ),
    );
  }
  return sections;
}

export const READING_LINE_PX = 160;

// Near the bottom the last sections can never reach the reading line, so it slides down to meet them.
export function readingLine(viewportPx: number, leftToScrollPx: number): number {
  return Math.max(READING_LINE_PX, viewportPx - READING_LINE_PX - Math.max(0, leftToScrollPx));
}
