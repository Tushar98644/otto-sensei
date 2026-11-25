"use client";

import { memo } from "react";
import { offersGitHubImport } from "@/components/github/format";
import { GitHubImportButton } from "@/components/github/github-import-button";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoMark } from "@/components/site/otto-mark";
import { Button } from "@/components/ui/button";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import type { ResumeLint } from "@/lib/lint/types";
import { countText } from "../count";
import { fixIssues } from "../otto";
import { useOpenFix, useStartFixAll } from "./fix-launcher";
import { useLintTotals, useResumeValue, useWeakLines } from "./use-editor";

type Totals = ResumeLint["totals"];
type Editor = Messages["studioEditor"];

function totalsMeta(t: Editor, format: Format, { bullets, withIssues, withNumbers }: Totals): string {
  return [
    countText(format, t.counts.lines, bullets),
    countText(format, t.counts.needWork, withIssues),
    countText(format, t.intro.withNumbers, withNumbers),
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
  const t = useMessages("studioEditor");
  const format = useFormat();

  return (
    <OttoNote
      live={false}
      meta={lines ? totalsMeta(t, format, lines) : undefined}
      message={settled ? fixIssues(t.otto, format, count) : t.otto.intro}
    >
      {firstId || github ? (
        <>
          {firstId && count > 1 ? (
            <>
              <Button onClick={startFixAll}>
                <OttoMark tone="line" small className="size-5" />
                {fmt(t.intro.fixAll, { count })}
              </Button>
              <Button variant="secondary" onClick={() => openFix(firstId)}>
                {t.intro.oneAtATime}
              </Button>
            </>
          ) : firstId ? (
            <Button onClick={() => openFix(firstId)}>
              <OttoMark tone="line" small className="size-5" />
              {t.intro.fixOne}
            </Button>
          ) : null}
          {github ? (
            <GitHubImportButton
              resumeId={resumeId}
              variant={firstId ? "ghost" : "secondary"}
              label={t.intro.github}
            />
          ) : null}
        </>
      ) : null}
    </OttoNote>
  );
});
