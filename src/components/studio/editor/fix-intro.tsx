"use client";

import { memo } from "react";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import type { ResumeLint } from "@/lib/lint/types";
import { pluralize } from "@/lib/utils";
import { useLintTotals } from "./use-editor";

type Totals = ResumeLint["totals"];

// "5 lines · 2 need work · 3 with numbers": facts for Otto's meta line, never praise.
function totalsMeta({ bullets, withIssues, withNumbers }: Totals): string {
  return [
    pluralize(bullets, "line"),
    `${withIssues} ${withIssues === 1 ? "needs" : "need"} work`,
    `${withNumbers} with ${withNumbers === 1 ? "a number" : "numbers"}`,
  ].join(" · ");
}

// Otto's note above the editor, with the line counts in its meta line. Re-renders only when a
// count changes.
export const FixIntro = memo(function FixIntro({ resumeId }: { resumeId: string }) {
  const totals = useLintTotals(resumeId);
  const lines = totals && totals.bullets > 0 ? totals : null;

  return (
    // Not live: the counts change while typing, and announcing each change would interrupt.
    <OttoNote
      live={false}
      meta={lines ? totalsMeta(lines) : undefined}
      message={lines ? OTTO.fix.manyIssues(lines.withIssues) : OTTO.fix.intro}
    />
  );
});
