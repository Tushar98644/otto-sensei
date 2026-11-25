"use client";

import { CircleCheck, Rows3, Scissors, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { withDesign } from "@/lib/pdf/design";
import { hideLines, showLines } from "@/lib/pdf/fit";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import type { Resume } from "@/lib/resume/schema";
import { useFormat, useMessages } from "@/i18n/client";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import { useStudioStore } from "@/lib/store/resume-store";
import { countText } from "../count";
import {
  findNearFit,
  stillApplied,
  tightened,
  type NearFit,
  type NearFitApplied,
} from "./near-fit";
import { renderPdfCached } from "./pdf-cache";
import type { ResumePdf } from "./use-resume-pdf";

type FitCopy = Messages["studioDownload"]["fit"];
// Lets the preview paint before the probe renders in the background.
const PROBE_DELAY_MS = 300;

type AppliedTo = NearFitApplied & { resumeId: string };

export type NearFitState = {
  offer: NearFit | null;
  applied: NearFitApplied | null;
  pages: number | null;
  // While true, the full fit card stays out of the way so there is only one offer.
  handling: boolean;
  apply: () => void;
  undo: () => void;
};

export function useNearFit(resume: Resume, pdf: ResumePdf, pageSize: PdfPageSize): NearFitState {
  const updateResume = useStudioStore((s) => s.updateResume);
  const t = useMessages("studioDownload").fit;
  const key = pdf.file && pdf.isCurrent ? pdf.file.key : null;
  const pages = key !== null && pdf.file ? pdf.file.pages : null;
  const spills = pages === 2;
  const [found, setFound] = useState<{ key: string; offer: NearFit | null } | null>(null);
  const [appliedTo, setApplied] = useState<AppliedTo | null>(null);
  const applied =
    appliedTo?.resumeId === resume.id && stillApplied(resume, appliedTo) ? appliedTo : null;
  const wantsProbe = spills && applied === null;

  useEffect(() => {
    if (key === null || !wantsProbe) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      findNearFit(resume, async (candidate) => (await renderPdfCached(candidate, pageSize)).pages)
        .catch((error: unknown) => {
          console.error("Near fit probe failed", error);
          return null;
        })
        .then((offer) => {
          if (!cancelled) setFound({ key, offer });
        });
    }, PROBE_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [key, wantsProbe, resume, pageSize]);

  const offer = wantsProbe && found?.key === key ? found.offer : null;
  const probing = wantsProbe && found?.key !== key;
  const fits = pages !== null && pages <= 1;

  function apply() {
    if (!offer) return;
    if (offer.kind === "tighten") {
      updateResume(resume.id, tightened, { label: t.history.tightened });
      setApplied({ kind: "tighten", resumeId: resume.id });
      return;
    }
    const ids = offer.lines.map((line) => line.bulletId);
    updateResume(resume.id, (r) => hideLines(r, new Set(ids)), { label: t.history.hid });
    setApplied({ kind: "hide", ids, resumeId: resume.id });
  }

  function undo() {
    if (!applied) return;
    if (applied.kind === "tighten") {
      updateResume(resume.id, (r) => withDesign(r, { density: undefined }), {
        label: t.history.spacingBack,
      });
    } else {
      updateResume(resume.id, (r) => showLines(r, new Set(applied.ids)), {
        label: t.history.showed,
      });
    }
    setApplied(null);
  }

  return {
    offer,
    applied,
    pages,
    handling: probing || offer !== null || (applied !== null && (fits || pages === null)),
    apply,
    undo,
  };
}

function offerText(t: FitCopy, format: Format, offer: NearFit): string {
  if (offer.kind === "tighten") return t.offerTighten;
  return countText(format, t.offerHide, offer.lines.length);
}

function appliedText(
  t: FitCopy,
  format: Format,
  applied: NearFitApplied,
  pages: number | null,
): string {
  if (pages === null) return t.updating;
  if (pages > 1) return t.stillOver;
  return applied.kind === "tighten"
    ? t.onePageTighter
    : countText(format, t.onePageHidden, applied.ids.length);
}

export function FitOffer({ fit }: { fit: NearFitState }) {
  const t = useMessages("studioDownload").fit;
  const format = useFormat();
  if (fit.applied) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-surface-muted py-2 pr-2 pl-4">
        <p aria-live="polite" className="flex min-w-0 flex-1 items-center gap-2 text-sm text-ink">
          {fit.pages !== null && fit.pages <= 1 ? (
            <CircleCheck aria-hidden className="size-4 shrink-0 text-pass" />
          ) : null}
          {appliedText(t, format, fit.applied, fit.pages)}
        </p>
        <Button variant="ghost" size="sm" onClick={fit.undo}>
          <Undo2 />
          {t.undo}
        </Button>
      </div>
    );
  }
  const offer = fit.offer;
  if (!offer) return null;
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-muted p-4">
      <p className="text-sm/6 text-pretty text-ink">{offerText(t, format, offer)}</p>
      {offer.kind === "hide" ? (
        <ul className="flex flex-col gap-1">
          {offer.lines.map((line) => (
            <li key={line.bulletId} className="line-clamp-1 text-xs/5 text-muted">
              <q>{line.text}</q>
            </li>
          ))}
        </ul>
      ) : null}
      <Button variant="secondary" onClick={fit.apply} className="w-full sm:w-fit">
        {offer.kind === "tighten" ? <Rows3 /> : <Scissors />}
        {t.title}
      </Button>
    </div>
  );
}
