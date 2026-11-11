"use client";

import { useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { focusWhenShown } from "@/components/studio/tailor/jump";
import type { CheckedLine } from "@/lib/lint/entry-checks";
import type { BulletSection } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { bulletsOf } from "./edits";
import { bulletInputId } from "./focus";
import { lintOf, NO_ISSUES } from "./lint-cache";
import { SETTLE_MS } from "./lint-notes";
import { pickResume } from "./use-editor";
import { useSettled } from "./use-settled";

type StudioState = Parameters<typeof pickResume>[0];

const NO_LINES: CheckedLine[] = [];

// Printed lines with words; hidden lines aren't linted, so they never count.
function printedLines(resume: Resume, section: BulletSection, parentId: string): CheckedLine[] {
  const bullets = bulletsOf(resume, { section, parentId });
  if (!bullets) return NO_LINES;
  const { byBullet } = lintOf(resume);
  return bullets.flatMap((bullet) => {
    const issues = byBullet.get(bullet.id);
    return issues && bullet.text.trim() ? [{ id: bullet.id, issues }] : [];
  });
}

/**
 * One entry's printed lines and their issues, once typing pauses. Ids and issues are selected as
 * two flat lists so the shallow compare settles: the lint cache keeps a line's issues array while
 * they stay the same, so typing in another entry doesn't re-render this one.
 */
export function useEntryLines(
  resumeId: string,
  section: BulletSection,
  parentId: string,
): readonly CheckedLine[] {
  const linesOf = (state: StudioState) => {
    const resume = pickResume(state, resumeId);
    return resume ? printedLines(resume, section, parentId) : NO_LINES;
  };
  const ids = useStudioStore(useShallow((state) => linesOf(state).map((line) => line.id)));
  const issues = useStudioStore(useShallow((state) => linesOf(state).map((line) => line.issues)));
  const lines = useMemo(
    () => ids.map((id, index): CheckedLine => ({ id, issues: issues[index] ?? NO_ISSUES })),
    [ids, issues],
  );
  return useSettled(lines, SETTLE_MS);
}

/** Each call opens the next of `ids` in the editor, from the top again after the last one. */
export function useLineStepper(ids: readonly string[]): () => void {
  const last = useRef<string | null>(null);
  return () => {
    const at = last.current === null ? -1 : ids.indexOf(last.current);
    const next = ids[(at + 1) % ids.length];
    if (!next) return;
    last.current = next;
    focusWhenShown(bulletInputId(next));
  };
}
