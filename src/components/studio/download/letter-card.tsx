"use client";

import { ChevronDown, Copy, Download } from "lucide-react";
import { useState } from "react";
import { copyText } from "@/components/ui/copy-text";
import { downloadBlob } from "@/components/studio/tailor/jump";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { useMessages } from "@/i18n/client";
import { letterFileName } from "@/lib/pdf/letter";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import { renderLetterPdf } from "@/lib/pdf/render";
import type { Resume } from "@/lib/resume/schema";

export function LetterCard({ resume, pageSize }: { resume: Resume; pageSize: PdfPageSize }) {
  const [rendering, setRendering] = useState(false);
  const t = useMessages("studioDownload").letter;
  const letter = resume.tailor?.coverLetter?.trim() ?? "";
  if (!letter) return null;

  async function download() {
    setRendering(true);
    try {
      const blob = await renderLetterPdf(resume, letter, { pageSize });
      downloadBlob(blob, letterFileName(resume.basics.name, resume.tailor?.company ?? ""));
    } catch (error) {
      console.error("Letter PDF render failed", error);
      toast({ title: t.failed, description: t.failedNote, variant: "error" });
    } finally {
      setRendering(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" loading={rendering} onClick={() => void download()}>
          <Download />
          {t.download}
        </Button>
        <Button variant="ghost" onClick={() => void copyText(letter, "letter")}>
          <Copy />
          {t.copy}
        </Button>
      </div>
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-medium text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          {t.see}
        </summary>
        <p className="mt-2 text-sm/6 whitespace-pre-line text-ink">{letter}</p>
      </details>
    </Card>
  );
}
