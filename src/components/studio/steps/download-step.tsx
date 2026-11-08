"use client";

import { useEffect, useMemo, useState } from "react";
import { OTTO } from "@/components/mascot/lines";
import { Otto } from "@/components/mascot/otto";
import { OttoCheer } from "@/components/mascot/otto-cheer";
import { OttoNote } from "@/components/mascot/otto-note";
import { DownloadActions } from "@/components/studio/download/download-actions";
import { ExportCheckResult } from "@/components/studio/download/export-check-result";
import { LetterCard } from "@/components/studio/download/letter-card";
import { PdfFrame, useInlinePdfPreview } from "@/components/studio/download/pdf-preview";
import { useExportCheck, type ExportCheck } from "@/components/studio/download/use-export-check";
import { usePageSize } from "@/components/studio/download/use-page-size";
import { forgetFreshCopy, isFreshCopy } from "@/components/studio/tailor/fresh-copy";
import { useResumePdf, type ResumePdf } from "@/components/studio/download/use-resume-pdf";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { buildPdfModel } from "@/lib/pdf/model";
import { suggestedFileName } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { useActiveResume, useStudioStore } from "@/lib/store/resume-store";
import { cn, pluralize } from "@/lib/utils";

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
  const pdf = useResumePdf(resume, pageSize);
  const fileName = suggestedFileName(resume);
  const check = useExportCheck(resume, pdf.isCurrent ? pdf.file : null, fileName);
  const inline = useInlinePdfPreview();
  // The model is cheap to build and never loads the PDF renderer.
  const changedCharacters = useMemo(() => buildPdfModel(resume).changedCharacters, [resume]);
  const otto = ottoLine(pdf, check);
  // Read once on arrival: a copy that Tailor just made gets its success moment here.
  const [freshId] = useState(() => (isFreshCopy(resume.id) ? resume.id : null));
  useEffect(() => forgetFreshCopy(), []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-6">
        <OttoNote message={otto} className="flex-1" />
        {freshId === resume.id ? <OttoCheer /> : null}
      </div>
      {/* Actions come first for keyboards and phones; on wide screens the preview sits on the left. */}
      <div className={cn("grid gap-6", inline && "lg:grid-cols-5")}>
        <div
          className={cn(
            "flex flex-col gap-6",
            inline &&
              "lg:sticky lg:top-6 lg:col-span-2 lg:col-start-4 lg:row-start-1 lg:self-start",
          )}
        >
          <DownloadActions
            resume={resume}
            pdf={pdf}
            check={check}
            pageSize={pageSize}
            fileName={fileName}
            changedCharacters={changedCharacters}
            showPreviewLink={!inline}
          />
          {check.report ? (
            <ExportCheckResult report={check.report} original={check.original} />
          ) : null}
          <LetterCard resume={resume} pageSize={pageSize} />
        </div>
        {inline ? (
          <section aria-label="PDF preview" className="lg:col-span-3 lg:col-start-1 lg:row-start-1">
            <PdfFrame
              url={pdf.file?.url ?? null}
              pageSize={pageSize}
              updating={!pdf.isCurrent && !pdf.failed}
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
