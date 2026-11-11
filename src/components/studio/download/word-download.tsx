"use client";

import { FileText } from "lucide-react";
import { useState } from "react";
import { unlockProTool, useProTools } from "@/components/account/pro-tools";
import { downloadBlob } from "@/components/studio/tailor/jump";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { track } from "@/lib/analytics/client";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import type { Resume } from "@/lib/resume/schema";

export function WordDownload({
  resume,
  pageSize,
  fileName,
}: {
  resume: Resume;
  pageSize: PdfPageSize;
  fileName: string;
}) {
  const [building, setBuilding] = useState(false);
  const locked = useProTools() === false;

  async function download() {
    if (!(await unlockProTool("word"))) return;
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

  return (
    <Button variant="secondary" loading={building} onClick={() => void download()} className="w-full">
      <FileText />
      Download Word
      {locked ? (
        <Badge variant="ink" className="h-5 px-1.5">
          Pro
        </Badge>
      ) : null}
    </Button>
  );
}
