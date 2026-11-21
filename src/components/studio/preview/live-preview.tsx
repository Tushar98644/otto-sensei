"use client";

import { FileText, Maximize2 } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { flushSync } from "react-dom";
import { useProTools } from "@/components/account/pro-tools";
import { useSettled } from "@/components/studio/editor/use-settled";
import { usePageSize } from "@/components/studio/download/use-page-size";
import { goTo } from "@/components/studio/editor/fix-outline";
import { bulletInputId } from "@/components/studio/editor/focus";
import { useResumeValue } from "@/components/studio/editor/use-editor";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PAGE_SIZE_LABELS, type PdfPageSize } from "@/lib/pdf/page-size";
import { forPlan, templateOf, TEMPLATE_INFO } from "@/lib/pdf/templates";
import type { Resume } from "@/lib/resume/schema";
import { pluralize } from "@/lib/utils";
import { ResumePages, type PagePick } from "./resume-pages";

// Long enough to skip the pauses inside a word, short enough to feel live.
const PREVIEW_SETTLE_MS = 250;

// What the PDF would print: the settled resume, in Classic on Free when a Pro format is picked.
function usePrintedResume(resumeId: string): Resume | undefined {
  const resume = useResumeValue<Resume | undefined>(resumeId, (current) => current, undefined);
  const pro = useProTools();
  const settled = useDeferredValue(useSettled(resume, PREVIEW_SETTLE_MS));
  return settled && pro === false ? forPlan(settled, "free") : settled;
}

// A click on the page opens that part in the editor, down to the line.
function jumpTo({ section, entry, bullet }: PagePick) {
  goTo(section, entry);
  const line = bullet ? document.getElementById(bulletInputId(bullet)) : null;
  if (!line) return;
  line.scrollIntoView({ block: "center" });
  line.focus({ preventScroll: true });
}

function pageMeta(pages: number, pageSize: PdfPageSize, resume: Resume): string {
  return [
    pluralize(pages, "page"),
    PAGE_SIZE_LABELS[pageSize],
    TEMPLATE_INFO[templateOf(resume)].name,
  ].join(" · ");
}

export function PreviewPanel({ resumeId }: { resumeId: string }) {
  const resume = usePrintedResume(resumeId);
  const pageSize = usePageSize();
  const [pages, setPages] = useState(1);
  const [enlarged, setEnlarged] = useState(false);
  if (!resume) return null;

  return (
    <aside
      aria-label="Page preview"
      className="sticky top-20 flex max-h-[calc(100dvh-6rem)] flex-col gap-3 self-start"
    >
      <div className="flex min-h-9 items-center justify-between gap-3">
        <p className="text-sm/5 text-subtle tabular-nums">
          <span className="font-medium text-ink">Preview</span>
          <span aria-hidden> · </span>
          {pageMeta(pages, pageSize, resume)}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Open a larger preview"
          title="Larger preview"
          onClick={() => setEnlarged(true)}
          className="text-muted hover:text-ink"
        >
          <Maximize2 />
        </Button>
      </div>
      <div className="-mx-2 min-h-0 overflow-y-auto overscroll-contain px-2 pt-0.5 pb-2 [scrollbar-width:thin]">
        <ResumePages resume={resume} pageSize={pageSize} onPages={setPages} onPick={jumpTo} />
      </div>
      <PreviewDialog
        open={enlarged}
        onOpenChange={setEnlarged}
        resume={resume}
        pageSize={pageSize}
        onPick={(pick) => {
          flushSync(() => setEnlarged(false));
          jumpTo(pick);
        }}
      />
    </aside>
  );
}

export function PreviewButton({ resumeId }: { resumeId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)} className="max-sm:w-11 max-sm:px-0">
        <FileText />
        <span className="max-sm:sr-only">Preview</span>
      </Button>
      {open ? <PreviewSheet resumeId={resumeId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function PreviewSheet({ resumeId, onClose }: { resumeId: string; onClose: () => void }) {
  const resume = usePrintedResume(resumeId);
  const pageSize = usePageSize();
  if (!resume) return null;
  return (
    <PreviewDialog
      open
      onOpenChange={(next) => (next ? undefined : onClose())}
      resume={resume}
      pageSize={pageSize}
      onPick={(pick) => {
        flushSync(onClose);
        jumpTo(pick);
      }}
    />
  );
}

function PreviewDialog({
  open,
  onOpenChange,
  resume,
  pageSize,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resume: Resume;
  pageSize: PdfPageSize;
  onPick: (pick: PagePick) => void;
}) {
  const [pages, setPages] = useState(1);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Preview"
      description={pageMeta(pages, pageSize, resume)}
    >
      {open ? (
        <ResumePages
          resume={resume}
          pageSize={pageSize}
          onPages={setPages}
          onPick={onPick}
          className="py-2"
        />
      ) : null}
    </Dialog>
  );
}
