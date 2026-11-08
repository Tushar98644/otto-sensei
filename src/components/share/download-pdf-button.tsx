"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { defaultPageSize } from "@/lib/pdf/page-size";
import { preloadPdfRenderer, renderResumePdf } from "@/lib/pdf/render";
import { suggestedFileName } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

// Saves a file through a temporary link. Revoked on the next tick: some browsers start the
// download after click() returns.
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

// The shared copy as the owner's PDF, made in the reader's browser: the server never renders it,
// and the reader gets the paper size their country uses.
export function DownloadPdfButton({ resume }: { resume: Resume }) {
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
        {failed ? "That didn't work. Try again." : ""}
      </p>
      <Button
        onClick={download}
        loading={busy}
        onPointerEnter={preloadPdfRenderer}
        onFocus={preloadPdfRenderer}
      >
        <Download aria-hidden />
        {failed ? "Try again" : "Download PDF"}
      </Button>
    </div>
  );
}
