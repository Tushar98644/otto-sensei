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
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { countText } from "../count";
import { downloadMenuItems } from "./download-menu";
import { FitOffer, type NearFitState } from "./fit-offer";
import { OpenJob } from "./open-job";
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
};

const MAIN = "min-w-0 flex-1 rounded-r-none focus-visible:z-10";
const MORE = "-ml-px w-12 rounded-l-none px-0 focus-visible:z-10";

function quoteList(quoted: string, chars: string[]): string {
  return chars.map((char) => fmt(quoted, { text: char })).join(", ");
}

function openPreview(url: string) {
  window.open(url, "_blank", "noopener");
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
}: DownloadActionsProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const downloadLink = useRef<HTMLAnchorElement>(null);
  const pro = useProTools();
  const download = useMessages("studioDownload");
  const t = download.pdf;
  const studio = useMessages("studio");
  const format = useFormat();
  const share = useShareResume(resume);
  const word = useWordDownload(resume, pageSize, fileName);
  const file = ready ? pdf.file : null;
  const items = downloadMenuItems(download.menu, {
    pro,
    wordBuilding: word.building,
    previewUrl: file?.url ?? null,
    onWord: word.download,
    onCopyText: () => void copyPlainText(resume, download.plainText),
    onShare: share.share,
    onPreview: openPreview,
  });
  const size = pageSize === "LETTER" ? download.design.letter : PAGE_SIZE_LABELS[pageSize];
  const meta = file
    ? `${countText(format, studio.counts.pages, file.pages)} · ${size} · ${TEMPLATE_INFO[templateOf(printed)].name}`
    : pdf.failed
      ? t.notMade
      : t.puttingTogether;

  // The link's own download goes ahead; the invite, if any, shows up beside it after.
  function downloaded() {
    track("pdf_downloaded", { page_size: pageSize });
    void inviteToOffer().then((url) => {
      if (url) setInviteUrl(url);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{t.title}</CardTitle>
        <CardDescription aria-live="polite">{meta}</CardDescription>
      </CardHeader>
      {changedCharacters.length ? (
        <Alert variant="warn" title={t.characters}>
          {fmt(changedCharacters.length > 8 ? t.charactersMore : t.charactersNote, {
            chars: quoteList(download.quoted, changedCharacters.slice(0, 8)),
          })}
        </Alert>
      ) : null}
      {pdf.failed ? (
        <Alert
          variant="error"
          title={t.failed}
          action={
            <Button variant="secondary" onClick={pdf.retry}>
              {t.tryAgain}
            </Button>
          }
        >
          {t.failedNote}
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
              {t.download}
            </a>
          ) : (
            <Button size="lg" loading={!pdf.failed} disabled className={MAIN}>
              {pdf.failed ? t.download : pdf.file ? t.updating : t.making}
            </Button>
          )}
          <Menu
            label={t.more}
            triggerLabel={t.more}
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
