"use client";

import { Rows3, Scissors, Undo2 } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { designOf, withDesign } from "@/lib/pdf/design";
import {
  fitCandidates,
  hideLines,
  planFit,
  showLines,
  type FitLine,
  type FitPlan,
} from "@/lib/pdf/fit";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import type { Resume } from "@/lib/resume/schema";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import { useStudioStore } from "@/lib/store/resume-store";
import { countText } from "../count";
import { renderPdfCached } from "./pdf-cache";
import type { ResumePdf } from "./use-resume-pdf";

const SPARE_LINES = 4;

type Phase =
  | { kind: "idle" }
  | { kind: "tightened" }
  | { kind: "planning" }
  | { kind: "review"; lines: FitLine[]; plan: FitPlan; picked: ReadonlySet<string> }
  | { kind: "hidden"; ids: string[] }
  | { kind: "nothing" }
  | { kind: "failed" };

type Chips = Messages["studioEditor"]["chips"];
type FitCopy = Messages["studioDownload"]["fit"];

function reasonFor(t: FitCopy, chips: Chips, line: FitLine): string {
  if (line.offTarget) {
    const why = t.offTarget;
    return line.issue ? `${why} · ${chips[line.issue]}` : why;
  }
  return line.issue ? chips[line.issue] : t.later;
}

function ReviewList({
  lines,
  picked,
  onToggle,
}: {
  lines: readonly FitLine[];
  picked: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  const t = useMessages("studioDownload").fit;
  const chips = useMessages("studioEditor").chips;
  return (
    <ul className="divide-y divide-border border-y border-border">
      {lines.map((line) => (
        <li key={line.bulletId}>
          <label className="flex cursor-pointer items-start gap-3 py-3">
            <input
              type="checkbox"
              checked={picked.has(line.bulletId)}
              onChange={() => onToggle(line.bulletId)}
              className="mt-1 size-4 shrink-0 accent-ink"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="line-clamp-2 text-sm/6 text-pretty text-ink">{line.text}</span>
              <span className="text-xs/5 text-subtle">
                {line.place} · {reasonFor(t, chips, line)}
              </span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export type FitCardProps = {
  resume: Resume;
  pdf: ResumePdf;
  pageSize: PdfPageSize;
  standDown: boolean;
};

export function FitCard({ resume, pdf, pageSize, standDown }: FitCardProps) {
  const updateResume = useStudioStore((s) => s.updateResume);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const t = useMessages("studioDownload").fit;
  const format = useFormat();
  const pages = pdf.file && pdf.isCurrent ? pdf.file.pages : null;
  const compact = designOf(resume).density === "compact";
  const fits = pages !== null && pages <= 1;
  const active = phase.kind !== "idle" && phase.kind !== "failed";
  const wantsPlan =
    !standDown &&
    compact &&
    pages !== null &&
    pages > 1 &&
    (phase.kind === "idle" || phase.kind === "tightened");
  const planned = useRef(false);
  const planNow = useEffectEvent(() => void findLines());
  useEffect(() => {
    if (!wantsPlan || planned.current) return;
    planned.current = true;
    const timer = window.setTimeout(planNow, 0);
    return () => window.clearTimeout(timer);
  }, [wantsPlan]);

  const choosing = phase.kind === "planning" || phase.kind === "review" || phase.kind === "hidden";
  if (standDown && !choosing) return null;
  if (pages === null && !active) return null;
  if (fits && !active) return null;

  function tighten() {
    updateResume(resume.id, (r) => withDesign(r, { density: "compact" }), {
      label: t.history.tightened,
    });
    setPhase({ kind: "tightened" });
  }

  async function findLines() {
    const lines = fitCandidates(resume);
    if (lines.length === 0) {
      setPhase({ kind: "nothing" });
      return;
    }
    setPhase({ kind: "planning" });
    try {
      // Cached by content, so the preview after "Hide" reuses the probe that fit.
      const plan = await planFit(
        resume,
        lines,
        async (candidate) => (await renderPdfCached(candidate, pageSize)).pages,
      );
      const shown = plan.fits ? lines.slice(0, plan.count + SPARE_LINES) : lines;
      const picked = new Set(
        plan.fits ? lines.slice(0, plan.count).map((line) => line.bulletId) : [],
      );
      setPhase({ kind: "review", lines: shown, plan, picked });
    } catch (error) {
      console.error("Fit planning failed", error);
      setPhase({ kind: "failed" });
    }
  }

  function toggle(id: string) {
    if (phase.kind !== "review") return;
    const picked = new Set(phase.picked);
    if (picked.has(id)) picked.delete(id);
    else picked.add(id);
    setPhase({ ...phase, picked });
  }

  function hide() {
    if (phase.kind !== "review" || phase.picked.size === 0) return;
    const ids = [...phase.picked];
    updateResume(resume.id, (r) => hideLines(r, new Set(ids)), { label: t.history.hid });
    setPhase({ kind: "hidden", ids });
  }

  function undoTighten() {
    updateResume(resume.id, (r) => withDesign(r, { density: undefined }), {
      label: t.history.spacingBack,
    });
    setPhase({ kind: "idle" });
  }

  function undoHide() {
    if (phase.kind !== "hidden") return;
    updateResume(resume.id, (r) => showLines(r, new Set(phase.ids)), {
      label: t.history.showed,
    });
    setPhase({ kind: "idle" });
  }

  const pageLine =
    pages === null ? t.checking : fits ? t.fits : fmt(t.runsTo, { pages });

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{t.title}</CardTitle>
        <CardDescription aria-live="polite">{pageLine}</CardDescription>
      </CardHeader>

      {phase.kind === "failed" ? (
        <Alert variant="error">{t.failed}</Alert>
      ) : null}
      {phase.kind === "nothing" ? (
        <p className="text-sm text-muted">{t.nothing}</p>
      ) : null}

      {phase.kind === "review" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            {phase.plan.fits
              ? countText(format, t.hidingFits, phase.plan.count)
              : fmt(t.evenAll, { count: phase.lines.length })}
          </p>
          <ReviewList lines={phase.lines} picked={phase.picked} onToggle={toggle} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={hide} disabled={phase.picked.size === 0}>
              <Scissors />
              {countText(format, t.hide, phase.picked.size)}
            </Button>
            <Button variant="ghost" onClick={() => setPhase({ kind: "idle" })}>
              {t.notNow}
            </Button>
          </div>
        </div>
      ) : phase.kind === "hidden" ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted">
            {countText(format, t.hidden, phase.ids.length)}
          </p>
          <Button variant="ghost" onClick={undoHide}>
            <Undo2 />
            {t.showAgain}
          </Button>
          {!fits && pages !== null ? (
            <Button variant="secondary" onClick={() => void findLines()}>
              {t.findMore}
            </Button>
          ) : null}
        </div>
      ) : fits ? (
        phase.kind === "tightened" ? (
          <Button variant="ghost" onClick={undoTighten} className="w-fit">
            <Undo2 />
            {t.undoTighten}
          </Button>
        ) : null
      ) : !compact ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">{t.tightenFirst}</p>
          <Button variant="secondary" onClick={tighten} disabled={pages === null} className="w-fit">
            <Rows3 />
            {t.tighten}
          </Button>
        </div>
      ) : phase.kind === "nothing" ? null : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">
            {phase.kind === "tightened" ? t.notEnough : t.canPick}
          </p>
          <Button
            variant="secondary"
            onClick={() => void findLines()}
            loading={phase.kind === "planning"}
            disabled={pages === null}
            className="w-fit"
          >
            <Scissors />
            {phase.kind === "planning" ? t.finding : t.find}
          </Button>
        </div>
      )}
    </Card>
  );
}
