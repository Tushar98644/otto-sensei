"use client";

import { Rows3, Scissors, Undo2 } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { CHIP_LABELS } from "@/components/studio/editor/lint-notes";
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
import { useStudioStore } from "@/lib/store/resume-store";
import { pluralize } from "@/lib/utils";
import { renderPdfCached } from "./pdf-cache";
import type { ResumePdf } from "./use-resume-pdf";

const FIT_LABEL = "Hid lines to fit one page";
const SPARE_LINES = 4;

type Phase =
  | { kind: "idle" }
  | { kind: "tightened" }
  | { kind: "planning" }
  | { kind: "review"; lines: FitLine[]; plan: FitPlan; picked: ReadonlySet<string> }
  | { kind: "hidden"; ids: string[] }
  | { kind: "nothing" }
  | { kind: "failed" };

function reasonFor(line: FitLine): string {
  if (line.offTarget) {
    const why = "Nothing the job asks for";
    return line.issue ? `${why} · ${CHIP_LABELS[line.issue]}` : why;
  }
  return line.issue ? CHIP_LABELS[line.issue] : "Later in the list";
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
                {line.place} · {reasonFor(line)}
              </span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export type FitCardProps = { resume: Resume; pdf: ResumePdf; pageSize: PdfPageSize };

export function FitCard({ resume, pdf, pageSize }: FitCardProps) {
  const updateResume = useStudioStore((s) => s.updateResume);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const pages = pdf.file && pdf.isCurrent ? pdf.file.pages : null;
  const compact = designOf(resume).density === "compact";
  const fits = pages !== null && pages <= 1;
  const active = phase.kind !== "idle" && phase.kind !== "failed";
  const wantsPlan =
    compact && pages !== null && pages > 1 && (phase.kind === "idle" || phase.kind === "tightened");
  const planned = useRef(false);
  const planNow = useEffectEvent(() => void findLines());
  useEffect(() => {
    if (!wantsPlan || planned.current) return;
    planned.current = true;
    const timer = window.setTimeout(planNow, 0);
    return () => window.clearTimeout(timer);
  }, [wantsPlan]);

  if (pages === null && !active) return null;
  if (fits && !active) return null;

  function tighten() {
    updateResume(resume.id, (r) => withDesign(r, { density: "compact" }), {
      label: "Tightened the spacing",
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
    updateResume(resume.id, (r) => hideLines(r, new Set(ids)), { label: FIT_LABEL });
    setPhase({ kind: "hidden", ids });
  }

  function undoTighten() {
    updateResume(resume.id, (r) => withDesign(r, { density: undefined }), {
      label: "Put the spacing back",
    });
    setPhase({ kind: "idle" });
  }

  function undoHide() {
    if (phase.kind !== "hidden") return;
    updateResume(resume.id, (r) => showLines(r, new Set(phase.ids)), {
      label: "Showed hidden lines",
    });
    setPhase({ kind: "idle" });
  }

  const pageLine =
    pages === null
      ? "Checking the length."
      : fits
        ? "It fits on one page now."
        : `It runs to ${pages} pages.`;

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Fit to one page</CardTitle>
        <CardDescription aria-live="polite">{pageLine}</CardDescription>
      </CardHeader>

      {phase.kind === "failed" ? (
        <Alert variant="error">I couldn&apos;t try that just now. Your resume is unchanged.</Alert>
      ) : null}
      {phase.kind === "nothing" ? (
        <p className="text-sm text-muted">
          Nothing else is safe to hide: each entry keeps its first line, and lines the job asks for
          stay. Shorten the summary, or hide a section in Fix lines.
        </p>
      ) : null}

      {phase.kind === "review" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            {phase.plan.fits
              ? `Hiding ${pluralize(phase.plan.count, "line")} fits it on one page. Hidden lines stay in your resume, so you can show them again.`
              : `Even hiding all ${phase.lines.length} of these leaves more than one page. Pick what to hide, or shorten the summary.`}
          </p>
          <ReviewList lines={phase.lines} picked={phase.picked} onToggle={toggle} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={hide} disabled={phase.picked.size === 0}>
              <Scissors />
              Hide {pluralize(phase.picked.size, "line")}
            </Button>
            <Button variant="ghost" onClick={() => setPhase({ kind: "idle" })}>
              Not now
            </Button>
          </div>
        </div>
      ) : phase.kind === "hidden" ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted">
            {pluralize(phase.ids.length, "line")} hidden. They&apos;re still in your resume.
          </p>
          <Button variant="ghost" onClick={undoHide}>
            <Undo2 />
            Show them again
          </Button>
          {!fits && pages !== null ? (
            <Button variant="secondary" onClick={() => void findLines()}>
              Find more lines
            </Button>
          ) : null}
        </div>
      ) : fits ? (
        phase.kind === "tightened" ? (
          <Button variant="ghost" onClick={undoTighten} className="w-fit">
            <Undo2 />
            Undo tighter spacing
          </Button>
        ) : null
      ) : !compact ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">
            First, tighter spacing: about 10% less room, same text and type size.
          </p>
          <Button variant="secondary" onClick={tighten} disabled={pages === null} className="w-fit">
            <Rows3 />
            Tighten spacing
          </Button>
        </div>
      ) : phase.kind === "nothing" ? null : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">
            {phase.kind === "tightened"
              ? "Tighter spacing wasn't quite enough. Otto can pick the weakest lines to hide."
              : "Otto can pick the weakest lines to hide. You choose before anything changes."}
          </p>
          <Button
            variant="secondary"
            onClick={() => void findLines()}
            loading={phase.kind === "planning"}
            disabled={pages === null}
            className="w-fit"
          >
            <Scissors />
            {phase.kind === "planning" ? "Finding lines" : "Find lines to hide"}
          </Button>
        </div>
      )}
    </Card>
  );
}
