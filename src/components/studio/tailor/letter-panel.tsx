"use client";

import { Copy, Download, FileText, RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import { OttoWorking } from "@/components/mascot/otto-working";
import { usePageSize } from "@/components/studio/download/use-page-size";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { copyText } from "@/components/ui/copy-text";
import { toast } from "@/components/ui/toast";
import { wordCount } from "@/lib/ai/writing-guards";
import { letterFileName } from "@/lib/pdf/letter";
import { renderLetterPdf } from "@/lib/pdf/render";
import { COVER_LETTER_CHARS, type Resume } from "@/lib/resume/schema";
import { DemoNote } from "../demo-note";
import { downloadBlob } from "./jump";
import type { SavedWriting } from "./session";
import type { Writing } from "./use-writing";

export type LetterPanelProps = {
  letter: SavedWriting | undefined;
  writing: Writing;
  pdfResume: Resume;
  company: string;
  onWrite: () => void;
  onEdit: (text: string) => void;
  onSettle: () => void;
};

export function LetterPanel({
  letter,
  writing,
  pdfResume,
  company,
  onWrite,
  onEdit,
  onSettle,
}: LetterPanelProps) {
  const headingId = useId();
  const pageSize = usePageSize();
  const [rendering, setRendering] = useState(false);
  const busy = writing.busy === "letter";
  const failed = writing.error?.task === "letter" ? writing.error.message : null;

  async function download(text: string) {
    setRendering(true);
    try {
      const blob = await renderLetterPdf(pdfResume, text, { pageSize });
      downloadBlob(blob, letterFileName(pdfResume.basics.name, company));
    } catch (error) {
      console.error("Letter PDF render failed", error);
      toast({
        title: "Your PDF didn't come out",
        description: "Try again, or copy the letter instead.",
        variant: "error",
      });
    } finally {
      setRendering(false);
    }
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 id={headingId} className="text-base/6 font-semibold text-ink">
          Cover letter
        </h3>
        {letter ? (
          <span className="text-sm text-subtle tabular-nums">{wordCount(letter.text)} words</span>
        ) : null}
      </div>
      {letter ? null : (
        <p className="text-sm text-muted">
          About 200 words: the role, your closest facts, and why this job. Only from your resume.
        </p>
      )}
      {failed ? <Alert variant="error">{failed}</Alert> : null}
      {busy ? <OttoWorking task="letter" size="sm" /> : null}
      {letter ? (
        <>
          {letter.demo ? <DemoNote /> : null}
          {letter.warnings.length ? (
            <Alert variant="warn" title="Check before you send it">
              <ul className="flex list-disc flex-col gap-1 pl-4">
                {letter.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <Textarea
            aria-labelledby={headingId}
            autoResize
            maxLength={COVER_LETTER_CHARS}
            value={letter.text}
            onChange={(event) => onEdit(event.target.value)}
            onBlur={onSettle}
            className="max-h-[70vh] text-base/7 sm:text-sm/6"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void copyText(letter.text, "letter")}
            >
              <Copy />
              Copy
            </Button>
            <Button
              size="sm"
              variant="secondary"
              loading={rendering}
              disabled={!letter.text.trim()}
              onClick={() => void download(letter.text)}
            >
              <Download />
              Download PDF
            </Button>
            <Button size="sm" variant="ghost" loading={busy} onClick={onWrite}>
              <RotateCcw />
              Write a new one
            </Button>
          </div>
        </>
      ) : (
        <Button variant="secondary" loading={busy} onClick={onWrite} className="self-start">
          <FileText />
          Write a cover letter
        </Button>
      )}
    </section>
  );
}
