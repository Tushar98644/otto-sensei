"use client";

import { Eye } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ResumeThumbnail } from "@/components/dashboard/resume-thumbnail";
import { LivePill } from "@/components/ui/live-pill";
import { Skeleton } from "@/components/ui/skeleton";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import type { Resume } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "../use-media-query";
import { addFrame, dropHiddenFrames, showFrame, type FrameView } from "./pdf-frames";

// Phones and tablets can't show a PDF inline (Android downloads, iOS shows page one as an image).
export function useInlinePdfPreview(): boolean {
  return useMediaQuery("(min-width: 768px) and (pointer: fine)");
}

const noChange = () => () => {};

// Browsers without a PDF viewer (headless ones, some kiosks) would paint the frame blank.
function usePdfViewer(): boolean {
  return useSyncExternalStore(
    noChange,
    () => navigator.pdfViewerEnabled !== false,
    () => true,
  );
}

export function openPdfPreview(url: string): void {
  window.open(url, "_blank", "noopener");
}

const CHIP =
  "inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface px-2.5 text-xs font-medium text-ink shadow-control ring-1 ring-ink/5";

const ASPECT: Record<PdfPageSize, string> = {
  LETTER: "aspect-[17/22]",
  A4: "aspect-[210/297]",
};

export type PdfFrameProps = {
  url: string | null;
  // Page one drawn as HTML, shown until the PDF paints so the box is never blank.
  page: Resume | null;
  pages?: number | null;
  pageSize: PdfPageSize;
  updating: boolean;
  className?: string;
};

// The browser's PDF viewer paints a moment after its frame's load event.
const PAINT_MS = 150;
const LOAD_FALLBACK_MS = 1500;
const FADE_MS = 200;

export function PdfFrame({ url, page, pages, pageSize, updating, className }: PdfFrameProps) {
  const viewer = usePdfViewer();
  const [{ frames, shown }, setView] = useState<FrameView>(() => ({
    frames: url ? [url] : [],
    shown: null,
  }));
  const newest = frames.at(-1) ?? null;
  if (url && url !== newest) setView((view) => addFrame(view, url));

  const timers = useRef<number[]>([]);
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.splice(0)) window.clearTimeout(timer);
    };
  }, [newest]);

  const reveal = useCallback((frame: string) => {
    const later = (ms: number, run: () => void) => {
      timers.current.push(window.setTimeout(run, ms));
    };
    later(PAINT_MS, () => {
      setView((view) => showFrame(view, frame));
      later(FADE_MS, () => setView((view) => dropHiddenFrames(view, frame)));
    });
  }, []);

  useEffect(() => {
    if (!viewer || !newest || newest === shown) return;
    const timer = window.setTimeout(() => reveal(newest), LOAD_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [viewer, newest, shown, reveal]);

  const drawn = !viewer || shown === null;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl bg-surface shadow-card",
        ASPECT[pageSize],
        className,
      )}
    >
      {drawn ? (
        page ? (
          <ResumeThumbnail resume={page} className="absolute inset-x-0 top-0" />
        ) : (
          <Skeleton className="absolute inset-0 size-full rounded-none" />
        )
      ) : null}
      {viewer
        ? frames.map((frame) => (
            <iframe
              key={frame}
              src={`${frame}#view=FitH&navpanes=0`}
              title="Preview of your resume PDF"
              onLoad={() => reveal(frame)}
              className={cn(
                "absolute inset-0 size-full transition-opacity duration-200 motion-reduce:transition-none",
                frame === newest && frame !== shown ? "opacity-0" : "opacity-100",
              )}
              tabIndex={frame === shown ? undefined : -1}
              aria-hidden={frame === shown ? undefined : true}
            />
          ))
        : null}
      {updating && (url || drawn) ? (
        <LivePill busy className="absolute top-3 right-3">
          Updating
        </LivePill>
      ) : null}
      {drawn && page && pages && pages > 1 ? (
        <span className={cn(CHIP, "absolute bottom-3 left-3 tabular-nums")}>
          Page 1 of {pages}
        </span>
      ) : null}
    </div>
  );
}

export type PdfPeekProps = { page: Resume; url: string | null; updating: boolean };

// Phones and tablets: the top of page one in a well, like a resume card; a tap opens the PDF.
export function PdfPeek({ page, url, updating }: PdfPeekProps) {
  return (
    <button
      type="button"
      disabled={url === null}
      aria-label={url ? "Preview your PDF" : "Your PDF preview, once it's made"}
      onClick={() => {
        if (url) openPdfPreview(url);
      }}
      className="group/peek relative block h-56 w-full cursor-pointer overflow-hidden rounded-xl bg-surface-muted px-10 pt-6 disabled:cursor-default sm:px-16"
    >
      <ResumeThumbnail
        resume={page}
        className="mx-auto max-w-80 rounded-t-xs shadow-page transition-[translate,box-shadow] duration-200 ease-out group-hover/peek:-translate-y-1 group-hover/peek:shadow-page-lift motion-reduce:transition-none"
      />
      {updating ? (
        <LivePill busy className="absolute top-3 right-3">
          Updating
        </LivePill>
      ) : url ? (
        <span aria-hidden className={cn(CHIP, "absolute right-3 bottom-3")}>
          <Eye className="size-3.5 text-muted" />
          Preview
        </span>
      ) : null}
    </button>
  );
}
