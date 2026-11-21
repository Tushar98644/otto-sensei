"use client";

import { useEffect, useMemo, useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { OTTO } from "@/components/mascot/lines";
import { Otto } from "@/components/mascot/otto";
import { OttoCheer } from "@/components/mascot/otto-cheer";
import { OttoNote } from "@/components/mascot/otto-note";
import { ApplicationCard } from "@/components/studio/download/application-card";
import { DesignCard } from "@/components/studio/download/design-controls";
import { DownloadActions } from "@/components/studio/download/download-actions";
import { FitCard } from "@/components/studio/download/fit-card";
import { useNearFit } from "@/components/studio/download/fit-offer";
import { LetterCard } from "@/components/studio/download/letter-card";
import { printedResume } from "@/components/studio/download/pdf-cache";
import { PdfFrame, useInlinePdfPreview } from "@/components/studio/download/pdf-preview";
import { SendCheckCard } from "@/components/studio/download/send-check";
import { useExportCheck, type ExportCheck } from "@/components/studio/download/use-export-check";
import { usePageSize } from "@/components/studio/download/use-page-size";
import { useResumePdf, type ResumePdf } from "@/components/studio/download/use-resume-pdf";
import { forgetFreshCopy, isFreshCopy } from "@/components/studio/tailor/fresh-copy";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { buildPdfModel } from "@/lib/pdf/model";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import { isProTemplate, templateOf } from "@/lib/pdf/templates";
import { suggestedFileName } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { useActiveResume, useStudioStore } from "@/lib/store/resume-store";
import { cn, pluralize } from "@/lib/utils";

// The preview sticks 16px below the 64px top bar and stays clear of the bottom of the screen.
const FIT_SCREEN: Record<PdfPageSize, string> = {
  LETTER: "max-w-[calc((100dvh_-_6rem)*17/22)]",
  A4: "max-w-[calc((100dvh_-_6rem)*210/297)]",
};

function ottoLine(pdf: ResumePdf, check: ExportCheck): string {
  if (pdf.failed) return OTTO.errors.generic;
  if (check.checking) return OTTO.download.checking;
  if (check.report) {
    const after = check.report.counts.fail;
    if (check.original) return OTTO.download.checked({ before: check.original.counts.fail, after });
    return after === 0
      ? "No problems. Hiring software can read every line."
      : `${pluralize(after, "problem")} left. The list shows how to fix ${after === 1 ? "it" : "them"}.`;
  }
  if (!pdf.file) return "Putting your PDF together. One moment.";
  return OTTO.download.ready;
}

function DownloadWorkspace({ resume }: { resume: Resume }) {
  const pageSize = usePageSize();
  const pro = useProTools();
  const printed = useMemo(() => printedResume(resume, pro), [resume, pro]);
  // Until the plan is known a Pro format isn't shown either: the PDF viewer has its own download button.
  const formatPending = pro === null && isProTemplate(templateOf(resume));
  const pdf = useResumePdf(printed, pageSize);
  const fileName = suggestedFileName(resume);
  const pdfReady = pdf.isCurrent && !formatPending && pdf.file !== null;
  const check = useExportCheck(printed, pdfReady ? pdf.file : null, fileName);
  const fit = useNearFit(printed, pdf, pageSize);
  const inline = useInlinePdfPreview();
  const changedCharacters = useMemo(() => buildPdfModel(resume).changedCharacters, [resume]);
  const otto = ottoLine(pdf, check);
  const [freshId] = useState(() => (isFreshCopy(resume.id) ? resume.id : null));
  useEffect(() => forgetFreshCopy(), []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-6">
        <OttoNote message={otto} className="flex-1" />
        {freshId === resume.id ? <OttoCheer /> : null}
      </div>
      <div className={cn("grid gap-6", inline && "md:grid-cols-2 lg:grid-cols-5")}>
        <div
          className={cn(
            "flex min-w-0 flex-col gap-6",
            inline && "md:col-start-2 md:row-start-1 lg:col-span-2 lg:col-start-4",
          )}
        >
          <DesignCard resume={resume} printed={printed} pageSize={pageSize} />
          <DownloadActions
            resume={resume}
            printed={printed}
            ready={pdfReady}
            pdf={pdf}
            pageSize={pageSize}
            fileName={fileName}
            changedCharacters={changedCharacters}
            fit={fit}
          />
          <FitCard resume={printed} pdf={pdf} pageSize={pageSize} standDown={fit.handling} />
          <SendCheckCard resume={resume} check={check} pdfReady={pdfReady} />
          <LetterCard resume={printed} pageSize={pageSize} />
          <ApplicationCard resume={resume} />
        </div>
        {inline ? (
          <section
            aria-label="PDF preview"
            className="md:sticky md:top-20 md:col-start-1 md:row-start-1 md:self-start lg:col-span-3"
          >
            <PdfFrame
              url={formatPending ? null : (pdf.file?.url ?? null)}
              pageSize={pageSize}
              updating={!pdf.isCurrent && !pdf.failed}
              className={cn("mx-auto", FIT_SCREEN[pageSize])}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function DownloadStep() {
  const resume = useActiveResume();
  const setStep = useStudioStore((s) => s.setStep);
  if (!resume) {
    return (
      <EmptyState
        illustration={<Otto pose="think" size={120} />}
        title="Nothing to download yet"
        description={OTTO.empty.noResumes}
        action={<Button onClick={() => setStep("upload")}>Upload a resume</Button>}
      />
    );
  }
  return <DownloadWorkspace resume={resume} />;
}
