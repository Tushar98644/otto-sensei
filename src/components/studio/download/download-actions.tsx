"use client";

import { ChevronDown, Download } from "lucide-react";
import { useRef, useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { InviteOffer, inviteToOffer } from "@/components/referrals/invite-prompt";
import { useShareResume } from "@/components/share/use-share-resume";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Menu } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/spinner";
import { track } from "@/lib/analytics/client";
import { PAGE_SIZE_LABELS, type PdfPageSize } from "@/lib/pdf/page-size";
import { TEMPLATE_INFO, templateOf } from "@/lib/pdf/templates";
import type { Resume } from "@/lib/resume/schema";
import { pluralize } from "@/lib/utils";
import { downloadMenuItems } from "./download-menu";
import { FitOffer, type NearFitState } from "./fit-offer";
import { OpenJob } from "./open-job";
import { openPdfPreview, PdfPeek } from "./pdf-preview";
import { copyPlainText, PlainTextDetails } from "./plain-text-copy";
import type { ResumePdf } from "./use-resume-pdf";
import { useWordDownload } from "./word-download";

export type DownloadActionsProps = {
  resume: Resume;
  printed: Resume;
  ready: boolean;
  pdf: ResumePdf;
  pageSize: PdfPageSize;
  fileName: string;
  changedCharacters: string[];
  fit: NearFitState;
  // Where the page has no preview column, the card shows the top of page one.
  peek: boolean;
};

const MAIN = "min-w-0 flex-1 rounded-r-none focus-visible:z-10";
const MORE = "-ml-px w-12 rounded-l-none px-0 focus-visible:z-10";

function quoteList(chars: string[]): string {
  return chars.map((char) => `“${char}”`).join(", ");
}

export function DownloadActions({
  resume,
  printed,
  ready,
  pdf,
  pageSize,
  fileName,
  changedCharacters,
  fit,
  peek,
}: DownloadActionsProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const downloadLink = useRef<HTMLAnchorElement>(null);
  const pro = useProTools();
  const share = useShareResume(resume);
  const word = useWordDownload(resume, pageSize, fileName);
  const file = ready ? pdf.file : null;
  const items = downloadMenuItems({
    pro,
    wordBuilding: word.building,
    previewUrl: file?.url ?? null,
    onWord: word.download,
    onCopyText: () => void copyPlainText(resume),
    onShare: share.share,
    onPreview: openPdfPreview,
  });
  const meta = file
    ? `${pluralize(file.pages, "page")} · ${PAGE_SIZE_LABELS[pageSize]} · ${TEMPLATE_INFO[templateOf(printed)].name}`
    : pdf.failed
      ? "Not made yet."
      : "Putting it together.";

  // The link's own download goes ahead; the invite, if any, shows up beside it after.
  function downloaded() {
    track("pdf_downloaded", { page_size: pageSize });
    void inviteToOffer().then((url) => {
      if (url) setInviteUrl(url);
    });
  }

  return (
    <Card>
      {peek ? (
        <PdfPeek
          page={printed}
          url={file?.url ?? null}
          updating={pdf.file !== null && !pdf.isCurrent && !pdf.failed}
        />
      ) : null}
      <CardHeader>
        <CardTitle as="h2">Your PDF</CardTitle>
        <CardDescription aria-live="polite">{meta}</CardDescription>
      </CardHeader>
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
      <FitOffer fit={fit} />
      <div className="flex flex-col gap-3">
        <div className="flex">
          {file ? (
            <a
              ref={downloadLink}
              href={file.url}
              download={fileName}
              onClick={downloaded}
              className={buttonClasses({ size: "lg", className: MAIN })}
            >
              <Download />
              Download PDF, free
            </a>
          ) : (
            <Button size="lg" loading={!pdf.failed} disabled className={MAIN}>
              {pdf.failed ? "Download PDF, free" : pdf.file ? "Updating your PDF" : "Making your PDF"}
            </Button>
          )}
          <Menu
            label="More ways to save or share"
            triggerLabel="More ways to save or share"
            trigger={word.building ? <Spinner className="size-5" /> : <ChevronDown aria-hidden />}
            triggerClassName={buttonClasses({ size: "lg", className: MORE })}
            align="end"
            items={items}
          />
        </div>
        <InviteOffer
          url={inviteUrl}
          onDismiss={() => {
            setInviteUrl(null);
            downloadLink.current?.focus();
          }}
        />
        <OpenJob key={resume.id} resume={resume} />
      </div>
      <PlainTextDetails resume={resume} />
      {share.dialog}
    </Card>
  );
}
