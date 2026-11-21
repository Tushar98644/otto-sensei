"use client";

import { useState } from "react";
import { unlockProTool } from "@/components/account/pro-tools";
import { downloadBlob } from "@/components/studio/tailor/jump";
import { toast } from "@/components/ui/toast";
import { track } from "@/lib/analytics/client";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import type { Resume } from "@/lib/resume/schema";

export type WordDownload = { building: boolean; download: () => void };

export function useWordDownload(
  resume: Resume,
  pageSize: PdfPageSize,
  fileName: string,
): WordDownload {
  const [building, setBuilding] = useState(false);

  async function download() {
    if (building || !(await unlockProTool("word"))) return;
    setBuilding(true);
    try {
      const { buildResumeDocxBlob, docxFileName } = await import("@/lib/docx");
      downloadBlob(await buildResumeDocxBlob(resume, { pageSize }), docxFileName(fileName));
      track("docx_downloaded");
    } catch (error) {
      console.error("Word export failed", error);
      toast({
        title: "Your Word file didn't come out",
        description: "Try again, or download the PDF instead.",
        variant: "error",
      });
    } finally {
      setBuilding(false);
    }
  }

  return { building, download: () => void download() };
}
