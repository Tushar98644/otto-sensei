"use client";

import { Download, ScanText } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/analytics/client";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import type { Resume } from "@/lib/resume/schema";
import { DesignControls } from "./design-controls";
import { FitCard } from "./fit-card";
import { FormatPicker } from "./format-picker";
import { PageSizeToggle } from "./page-size-toggle";
import { PdfPreviewLink } from "./pdf-preview";
import { PlainTextCopy } from "./plain-text-copy";
import { SendCheckCard } from "./send-check";
import { ShareLinkButton } from "./share-link-button";
import type { ExportCheck } from "./use-export-check";
import { setPageSize } from "./use-page-size";
import type { ResumePdf } from "./use-resume-pdf";
import { WordDownload } from "./word-download";

export type DownloadActionsProps = {
  resume: Resume;
  printed: Resume;
  formatPending: boolean;
  pdf: ResumePdf;
  check: ExportCheck;
  pageSize: PdfPageSize;
  fileName: string;
  changedCharacters: string[];
  showPreviewLink: boolean;
};

function quoteList(chars: string[]): string {
  return chars.map((char) => `“${char}”`).join(", ");
}

export function DownloadActions({
  resume,
  printed,
  formatPending,
  pdf,
  check,
  pageSize,
  fileName,
  changedCharacters,
  showPreviewLink,
}: DownloadActionsProps) {
  const ready = pdf.file !== null && pdf.isCurrent && !formatPending;
  return (
    <>
      <SendCheckCard resume={resume} />
      <Card>
        <CardHeader>
          <CardTitle as="h2">Your PDF</CardTitle>
        </CardHeader>
        <FormatPicker resume={resume} />
        <PageSizeToggle value={pageSize} onChange={setPageSize} />
        {changedCharacters.length ? (
          <Alert variant="warn" title="A few characters look different">
            The PDF fonts can&apos;t show {quoteList(changedCharacters.slice(0, 8))}
            {changedCharacters.length > 8 ? " and a few more" : ""}, so they were swapped for close
            matches or left out. Check that your name and links still look right.
          </Alert>
        ) : null}
        {pdf.failed ? (
          <Alert
            variant="error"
            title="Your PDF didn't come out"
            action={
              <Button variant="secondary" onClick={pdf.retry}>
                Try again
              </Button>
            }
          >
            Something went wrong while making it. Your resume is safe in this browser.
          </Alert>
        ) : null}
        <div className="flex flex-col gap-3">
          {ready && pdf.file ? (
            <a
              href={pdf.file.url}
              download={fileName}
              onClick={() => track("pdf_downloaded", { page_size: pageSize })}
              className={buttonClasses({ size: "lg", className: "w-full" })}
            >
              <Download />
              Download PDF, free
            </a>
          ) : (
            <Button size="lg" loading={!pdf.failed} disabled className="w-full">
              {pdf.file ? "Updating your PDF" : "Making your PDF"}
            </Button>
          )}
          <WordDownload resume={resume} pageSize={pageSize} fileName={fileName} />
          <ShareLinkButton resume={resume} />
          {showPreviewLink && pdf.file ? (
            <PdfPreviewLink url={pdf.file.url} className="w-full" />
          ) : null}
          <Button
            variant="secondary"
            onClick={check.run}
            loading={check.checking}
            disabled={!ready}
            className="w-full"
          >
            <ScanText />
            Check my new PDF
          </Button>
          {check.error ? <Alert variant="error">{check.error}</Alert> : null}
        </div>
        <PlainTextCopy resume={resume} />
      </Card>
      <FitCard resume={printed} pdf={pdf} pageSize={pageSize} />
      <DesignControls resume={resume} />
    </>
  );
}
