"use client";

import { memo } from "react";
import { offersGitHubImport } from "@/components/github/format";
import { GitHubImportButton } from "@/components/github/github-import-button";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoMark } from "@/components/site/otto-mark";
import { Button } from "@/components/ui/button";
import type { ResumeLint } from "@/lib/lint/types";
import { pluralize } from "@/lib/utils";
import { useOpenFix } from "./fix-launcher";
import { useFirstWeakLine, useLintTotals, useResumeValue } from "./use-editor";

type Totals = ResumeLint["totals"];

// "5 lines · 2 need work · 3 with numbers": facts for Otto's meta line, never praise.
function totalsMeta({ bullets, withIssues, withNumbers }: Totals): string {
  return [
    pluralize(bullets, "line"),
    `${withIssues} ${withIssues === 1 ? "needs" : "need"} work`,
    `${withNumbers} with ${withNumbers === 1 ? "a number" : "numbers"}`,
  ].join(" · ");
}

// Otto's note above the editor, with the line counts in its meta line and a way to start: the
// first weak line, and the GitHub import when the resume links GitHub but lists few projects.
// Re-renders only when a count, that line or the offer changes. Sits inside the editor's Fix
// dialog provider, so its button opens the same dialog as the line's own.
export const FixIntro = memo(function FixIntro({ resumeId }: { resumeId: string }) {
  const totals = useLintTotals(resumeId);
  const firstWeak = useFirstWeakLine(resumeId);
  const github = useResumeValue(resumeId, offersGitHubImport, false);
  const openFix = useOpenFix();
  const lines = totals && totals.bullets > 0 ? totals : null;

  return (
    // Not live: the counts change while typing, and announcing each change would interrupt.
    <OttoNote
      live={false}
      meta={lines ? totalsMeta(lines) : undefined}
      message={lines ? OTTO.fix.manyIssues(lines.withIssues) : OTTO.fix.intro}
    >
      {firstWeak || github ? (
        <>
          {firstWeak ? (
            <Button variant="secondary" onClick={() => openFix(firstWeak)}>
              <OttoMark tone="line" small className="size-5 text-ink" />
              Fix the first weak line
            </Button>
          ) : null}
          {github ? (
            <GitHubImportButton
              resumeId={resumeId}
              variant={firstWeak ? "ghost" : "secondary"}
              label="Add projects from my GitHub"
            />
          ) : null}
        </>
      ) : null}
    </OttoNote>
  );
});
