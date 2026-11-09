"use client";

import { useState } from "react";
import { usePageSize } from "@/components/studio/download/use-page-size";
import { downloadBlob } from "@/components/studio/tailor/jump";
import { toast } from "@/components/ui/toast";
import { letterFileName } from "@/lib/pdf/letter";
import { renderLetterPdf } from "@/lib/pdf/render";
import type { Resume } from "@/lib/resume/schema";
import { letterResume, type LetterEntry } from "./entries";

// The studio's letter PDF, from the list: same renderer, page size and file name as the Download
// step, with the name block of the resume the letter belongs to.
export function useLetterPdf(resumes: readonly Resume[]) {
  const pageSize = usePageSize();
  const [rendering, setRendering] = useState<string | null>(null);

  async function download(entry: LetterEntry, text = entry.text) {
    if (rendering) return;
    setRendering(entry.key);
    const resume = letterResume(entry, resumes);
    try {
      const blob = await renderLetterPdf(resume, text, { pageSize });
      downloadBlob(blob, letterFileName(resume.basics.name, entry.company));
    } catch (error) {
      console.error("Letter PDF render failed", error);
      toast({
        title: "Your PDF didn't come out",
        description: "Try again, or copy the letter instead.",
        variant: "error",
      });
    } finally {
      setRendering(null);
    }
  }

  return { download, rendering };
}
