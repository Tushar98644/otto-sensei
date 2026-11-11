"use client";

import { ChevronDown, Copy, Download } from "lucide-react";
import { useState } from "react";
import { copyText } from "@/components/studio/tailor/letter-panel";
import { downloadBlob } from "@/components/studio/tailor/jump";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { letterFileName } from "@/lib/pdf/letter";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import { renderLetterPdf } from "@/lib/pdf/render";
import type { Resume } from "@/lib/resume/schema";

export function LetterCard({ resume, pageSize }: { resume: Resume; pageSize: PdfPageSize }) {
  const [rendering, setRendering] = useState(false);
  const letter = resume.tailor?.coverLetter?.trim() ?? "";
  if (!letter) return null;

  async function download() {
    setRendering(true);
    try {
      const blob = await renderLetterPdf(resume, letter, { pageSize });
      downloadBlob(blob, letterFileName(resume.basics.name, resume.tailor?.company ?? ""));
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
    <Card>
      <CardHeader>
        <CardTitle as="h2">Cover letter</CardTitle>
        <CardDescription>Saved with this copy, in the same format as the resume.</CardDescription>
      </CardHeader>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" loading={rendering} onClick={() => void download()}>
          <Download />
          Download letter
        </Button>
        <Button variant="ghost" onClick={() => void copyText(letter, "letter")}>
          <Copy />
          Copy
        </Button>
      </div>
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-medium text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          See the letter
        </summary>
        <p className="mt-2 text-sm/6 whitespace-pre-line text-ink">{letter}</p>
      </details>
    </Card>
  );
}
