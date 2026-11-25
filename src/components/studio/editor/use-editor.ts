"use client";

import { useShallow } from "zustand/react/shallow";
import { useFormat, useMessages } from "@/i18n/client";
import type { LintIssue, ResumeLint } from "@/lib/lint/types";
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
import { weakLines } from "./fix-queue";
import { extraNeedsWork, lintOf, NO_ISSUES, sectionNeedsWork } from "./lint-cache";
import { includeSection, isBulletSection, sectionCount } from "./sections";

type StudioSnapshot = ReturnType<typeof useStudioStore.getState>;
type ListKey = "experience" | "education" | "projects" | "skills" | "certifications";

export function pickResume(state: StudioSnapshot, resumeId: string): Resume | undefined {
  return Object.hasOwn(state.resumes, resumeId) ? state.resumes[resumeId] : undefined;
}

export function getResume(resumeId: string): Resume | undefined {
  return pickResume(useStudioStore.getState(), resumeId);
}

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
  editSection(resumeId, key, (resume) => {
    const items = update(resume[key]);
    return items === resume[key] ? resume : withList(resume, key, items);
  });
}

// `fallback` must be a primitive or module constant; a fresh object would never settle.
export function useResumeValue<T>(resumeId: string, select: (resume: Resume) => T, fallback: T): T {
  return useStudioStore((state) => {
    const resume = pickResume(state, resumeId);
    return resume ? select(resume) : fallback;
  });
}

const NO_IDS: string[] = [];

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

export function useIsLinted(resumeId: string, bulletId: string): boolean {
  return useStudioStore((state) => {
    const resume = pickResume(state, resumeId);
    return resume ? lintOf(resume).byBullet.has(bulletId) : false;
  });
}

export type WeakLineSummary = { count: number; firstId: string | null };

const NO_WEAK_LINES: WeakLineSummary = { count: 0, firstId: null };

export function useWeakLines(resumeId: string): WeakLineSummary {
  return useStudioStore(
    useShallow((state) => {
      const resume = pickResume(state, resumeId);
      if (!resume) return NO_WEAK_LINES;
      const lines = weakLines(resume, lintOf(resume).byBullet);
      return { count: lines.length, firstId: lines[0]?.bulletId ?? null };
    }),
  );
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
  const words = { t: useMessages("studioSections"), format: useFormat() };
  return useStudioStore(
    useShallow((state) => {
      const resume = pickResume(state, resumeId);
      if (!resume) return NO_META;
      return {
        title: sectionTitleOf(resume, key),
        count: sectionCount(resume, key, words),
        needWork: isBulletSection(key) ? sectionNeedsWork(resume, key) : 0,
        hidden: isSectionHidden(resume, key),
      };
    }),
  );
}

export type ExtraSectionMeta = SectionMeta & { kind: ExtraKind };

const NO_EXTRA_META: ExtraSectionMeta = { ...NO_META, kind: "custom" };

export function useExtraSectionMeta(resumeId: string, sectionId: string): ExtraSectionMeta {
  const t = useMessages("studioSections").extras;
  const format = useFormat();
  return useStudioStore(
    useShallow((state) => {
      const resume = pickResume(state, resumeId);
      const section = resume ? extrasOf(resume).find((item) => item.id === sectionId) : undefined;
      if (!resume || !section) return NO_EXTRA_META;
      return {
        title: section.title,
        kind: section.kind,
        count: extraCount(section, t, format),
        needWork: extraNeedsWork(resume, sectionId),
        hidden: section.hidden === true,
      };
    }),
  );
}
