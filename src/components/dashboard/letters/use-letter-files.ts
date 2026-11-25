"use client";

import { useState } from "react";
import { unlockProTool } from "@/components/account/pro-tools";
import { usePageSize } from "@/components/studio/download/use-page-size";
import { toast } from "@/components/ui/toast";
import { useMessages } from "@/i18n/client";
import type { Resume } from "@/lib/resume/schema";
import { letterResume, type LetterEntry } from "./entries";

export type LetterFile = "pdf" | "word";

// The letter as a file under the resume's own header: PDF free with Pro's letters, Word as on the Download step.
export function useLetterFiles(resumes: readonly Resume[]) {
  const { page } = useMessages("letters");
  const pageSize = usePageSize();
  const [rendering, setRendering] = useState<{ key: string; file: LetterFile } | null>(null);

  async function download(entry: LetterEntry, file: LetterFile, text = entry.text) {
    if (rendering) return;
    if (file === "word" && !(await unlockProTool("word"))) return;
    setRendering({ key: entry.key, file });
    const resume = letterResume(entry, resumes);
    try {
      // The file makers load with the first download, not with the page.
      const [{ letterFileName }, { downloadBlob }, { renderLetterPdf }] = await Promise.all([
        import("@/lib/pdf/letter"),
        import("@/components/studio/tailor/jump"),
        import("@/lib/pdf/render"),
      ]);
      const name = letterFileName(resume.basics.name, entry.company);
      if (file === "pdf") {
        downloadBlob(await renderLetterPdf(resume, text, { pageSize }), name);
      } else {
        const { buildLetterDocxBlob, docxFileName } = await import("@/lib/docx");
        downloadBlob(await buildLetterDocxBlob(resume, text, { pageSize }), docxFileName(name));
      }
    } catch (error) {
      console.error(`Letter ${file} build failed`, error);
      toast({
        title: file === "pdf" ? page.pdfFailed : page.wordFailed,
        description: page.copyInstead,
        variant: "error",
      });
    } finally {
      setRendering(null);
    }
  }

  return {
    download: (entry: LetterEntry, file: LetterFile, text?: string) =>
      void download(entry, file, text),
    rendering,
  };
}
