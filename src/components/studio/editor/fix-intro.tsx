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
import { useOpenFix, useStartFixAll } from "./fix-launcher";
import { useLintTotals, useResumeValue, useWeakLines } from "./use-editor";

type Totals = ResumeLint["totals"];

function totalsMeta({ bullets, withIssues, withNumbers }: Totals): string {
  return [
    pluralize(bullets, "line"),
    `${withIssues} ${withIssues === 1 ? "needs" : "need"} work`,
    `${withNumbers} with ${withNumbers === 1 ? "a number" : "numbers"}`,
  ].join(" · ");
}

export const FixIntro = memo(function FixIntro({ resumeId }: { resumeId: string }) {
  const totals = useLintTotals(resumeId);
  const weak = useWeakLines(resumeId);
  const github = useResumeValue(resumeId, offersGitHubImport, false);
  const openFix = useOpenFix();
  const startFixAll = useStartFixAll();
  const lines = totals && totals.bullets > 0 ? totals : null;
  const { firstId, count } = weak;
  const settled = count > 0 || lines?.withIssues === 0;

  return (
    <OttoNote
      live={false}
      meta={lines ? totalsMeta(lines) : undefined}
      message={settled ? OTTO.fix.manyIssues(count) : OTTO.fix.intro}
    >
      {firstId || github ? (
        <>
          {firstId && count > 1 ? (
            <>
              <Button onClick={startFixAll}>
                <OttoMark tone="line" small className="size-5" />
                {`Fix ${count} lines with Otto`}
              </Button>
              <Button variant="secondary" onClick={() => openFix(firstId)}>
                One at a time
              </Button>
            </>
          ) : firstId ? (
            <Button onClick={() => openFix(firstId)}>
              <OttoMark tone="line" small className="size-5" />
              Fix it with Otto
            </Button>
          ) : null}
          {github ? (
            <GitHubImportButton
              resumeId={resumeId}
              variant={firstId ? "ghost" : "secondary"}
              label="Add projects from my GitHub"
            />
          ) : null}
        </>
      ) : null}
    </OttoNote>
  );
});
