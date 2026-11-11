"use client";

import { useShallow } from "zustand/react/shallow";
import type { LintIssue, ResumeLint } from "@/lib/lint/types";
import { firstWeakLine } from "@/lib/lint/weak-lines";
import type { BulletSection } from "@/lib/resume/ops";
import {
  extrasOf,
  isSectionHidden,
  sectionTitleOf,
  type ExtraKind,
  type Resume,
  type SectionKey,
} from "@/lib/resume/schema";
import { useStudioStore, type EditOptions } from "@/lib/store/resume-store";
import { extraCount } from "./extras";
import { extraNeedsWork, lintOf, NO_ISSUES, sectionNeedsWork } from "./lint-cache";
import { includeSection, isBulletSection, sectionCount } from "./sections";

// Each component selects only the slice it renders, so a keystroke re-renders one line.

type StudioSnapshot = ReturnType<typeof useStudioStore.getState>;
type ListKey = "experience" | "education" | "projects" | "skills" | "certifications";

export function pickResume(state: StudioSnapshot, resumeId: string): Resume | undefined {
  return Object.hasOwn(state.resumes, resumeId) ? state.resumes[resumeId] : undefined;
}

export function getResume(resumeId: string): Resume | undefined {
  return pickResume(useStudioStore.getState(), resumeId);
}

// options.label names an undo step ("Otto fixed a line"); plain typing leaves it out.
export function editResume(
  resumeId: string,
  updater: (resume: Resume) => Resume,
  options?: EditOptions,
): void {
  useStudioStore.getState().updateResume(resumeId, updater, options);
}

export function editSection(
  resumeId: string,
  key: SectionKey,
  updater: (resume: Resume) => Resume,
  options?: EditOptions,
): void {
  editResume(resumeId, (resume) => includeSection(updater(resume), key), options);
}

// Lines of an extra section's item have no place in sectionOrder; the rest join it when edited.
export function editLines(
  resumeId: string,
  section: BulletSection,
  updater: (resume: Resume) => Resume,
): void {
  if (section === "extras") editResume(resumeId, updater);
  else editSection(resumeId, section, updater);
}

function withList<K extends ListKey>(resume: Resume, key: K, items: Resume[K]): Resume {
  const next: Resume = { ...resume };
  next[key] = items;
  return next;
}

export function editList<K extends ListKey>(
  resumeId: string,
  key: K,
  update: (items: Resume[K]) => Resume[K],
): void {
  editSection(resumeId, key, (resume) => withList(resume, key, update(resume[key])));
}

// `fallback` must be a primitive or a module constant: a fresh object per call would never settle.
export function useResumeValue<T>(resumeId: string, select: (resume: Resume) => T, fallback: T): T {
  return useStudioStore((state) => {
    const resume = pickResume(state, resumeId);
    return resume ? select(resume) : fallback;
  });
}

const NO_IDS: string[] = [];

// Ids only, so a list re-renders when entries are added, removed or moved, not when one is edited.
export function useItemIds(
  resumeId: string,
  select: (resume: Resume) => readonly { id: string }[],
): string[] {
  return useStudioStore(
    useShallow((state) => {
      const resume = pickResume(state, resumeId);
      return resume ? select(resume).map((item) => item.id) : NO_IDS;
    }),
  );
}

export function useBulletIssues(resumeId: string, bulletId: string): readonly LintIssue[] {
  return useStudioStore((state) => {
    const resume = pickResume(state, resumeId);
    return resume ? (lintOf(resume).byBullet.get(bulletId) ?? NO_ISSUES) : NO_ISSUES;
  });
}

// False when the line, its entry or its section is hidden: it never prints, so gets no chip.
export function useIsLinted(resumeId: string, bulletId: string): boolean {
  return useStudioStore((state) => {
    const resume = pickResume(state, resumeId);
    return resume ? lintOf(resume).byBullet.has(bulletId) : false;
  });
}

// A string, so it only re-renders when the first weak line changes.
export function useFirstWeakLine(resumeId: string): string | null {
  return useStudioStore((state) => {
    const resume = pickResume(state, resumeId);
    if (!resume) return null;
    const { byBullet } = lintOf(resume);
    return firstWeakLine(resume, (bulletId) => byBullet.get(bulletId));
  });
}

export function useLintTotals(resumeId: string): ResumeLint["totals"] | null {
  return useStudioStore((state) => {
    const resume = pickResume(state, resumeId);
    return resume ? lintOf(resume).totals : null;
  });
}

export type SectionMeta = {
  title: string;
  count: string | null;
  needWork: number;
  hidden: boolean;
};

const NO_META: SectionMeta = { title: "", count: null, needWork: 0, hidden: false };

export function useSectionMeta(resumeId: string, key: SectionKey): SectionMeta {
  return useStudioStore(
    useShallow((state) => {
      const resume = pickResume(state, resumeId);
      if (!resume) return NO_META;
      return {
        title: sectionTitleOf(resume, key),
        count: sectionCount(resume, key),
        needWork: isBulletSection(key) ? sectionNeedsWork(resume, key) : 0,
        hidden: isSectionHidden(resume, key),
      };
    }),
  );
}

export type ExtraSectionMeta = SectionMeta & { kind: ExtraKind };

const NO_EXTRA_META: ExtraSectionMeta = { ...NO_META, kind: "custom" };

export function useExtraSectionMeta(resumeId: string, sectionId: string): ExtraSectionMeta {
  return useStudioStore(
    useShallow((state) => {
      const resume = pickResume(state, resumeId);
      const section = resume ? extrasOf(resume).find((item) => item.id === sectionId) : undefined;
      if (!resume || !section) return NO_EXTRA_META;
      return {
        title: section.title,
        kind: section.kind,
        count: extraCount(section),
        needWork: extraNeedsWork(resume, sectionId),
        hidden: section.hidden === true,
      };
    }),
  );
}
