"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { defaultPageSize } from "@/lib/pdf/page-size";
import { preloadPdfRenderer, renderResumePdf } from "@/lib/pdf/render";
import { suggestedFileName } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

// Revoked on the next tick: some browsers start the download after click() returns.
function saveFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function DownloadPdfButton({ resume }: { resume: Resume }) {
  const words = useMessages("share").download;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function download() {
    setBusy(true);
    setFailed(false);
    try {
      const blob = await renderResumePdf(resume, { pageSize: defaultPageSize(navigator.language) });
      saveFile(blob, suggestedFileName(resume));
    } catch (error) {
      console.error("Shared resume PDF failed", error);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-3">
      <p role="status" className="text-sm/5 text-fail-ink max-sm:sr-only">
        {failed ? words.failed : ""}
      </p>
      <Button
        onClick={download}
        loading={busy}
        onPointerEnter={preloadPdfRenderer}
        onFocus={preloadPdfRenderer}
      >
        <Download aria-hidden />
        {failed ? words.tryAgain : words.pdf}
      </Button>
    </div>
  );
}
