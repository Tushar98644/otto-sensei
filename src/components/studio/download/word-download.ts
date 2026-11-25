"use client";

import { useState } from "react";
import { unlockProTool } from "@/components/account/pro-tools";
import { downloadBlob } from "@/components/studio/tailor/jump";
import { toast } from "@/components/ui/toast";
import { useMessages } from "@/i18n/client";
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
  const t = useMessages("studioDownload").word;

  async function download() {
    if (building || !(await unlockProTool("word"))) return;
    setBuilding(true);
    try {
      const { buildResumeDocxBlob, docxFileName } = await import("@/lib/docx");
      downloadBlob(await buildResumeDocxBlob(resume, { pageSize }), docxFileName(fileName));
      track("docx_downloaded");
    } catch (error) {
      console.error("Word export failed", error);
      toast({ title: t.failed, description: t.failedNote, variant: "error" });
    } finally {
      setBuilding(false);
    }
  }

  return { building, download: () => void download() };
}
