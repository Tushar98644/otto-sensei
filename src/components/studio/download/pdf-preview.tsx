"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LivePill } from "@/components/ui/live-pill";
import { Skeleton } from "@/components/ui/skeleton";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import { useMessages } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "../use-media-query";
import { addFrame, dropHiddenFrames, showFrame, type FrameView } from "./pdf-frames";

// Phones and tablets can't show a PDF inline (Android downloads, iOS shows page one as an image).
export function useInlinePdfPreview(): boolean {
  return useMediaQuery("(min-width: 768px) and (pointer: fine)");
}

const ASPECT: Record<PdfPageSize, string> = {
  LETTER: "aspect-[17/22]",
  A4: "aspect-[210/297]",
};

export type PdfFrameProps = {
  url: string | null;
  pageSize: PdfPageSize;
  updating: boolean;
  className?: string;
};

// The browser's PDF viewer paints a moment after its frame's load event.
const PAINT_MS = 150;
const LOAD_FALLBACK_MS = 1500;
const FADE_MS = 200;

export function PdfFrame({ url, pageSize, updating, className }: PdfFrameProps) {
  const [{ frames, shown }, setView] = useState<FrameView>(() => ({
    frames: url ? [url] : [],
    shown: null,
  }));
  const newest = frames.at(-1) ?? null;
  const t = useMessages("studioDownload");
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
    if (!newest || newest === shown) return;
    const timer = window.setTimeout(() => reveal(newest), LOAD_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [newest, shown, reveal]);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl bg-surface shadow-card",
        ASPECT[pageSize],
        className,
      )}
    >
      {shown === null ? <Skeleton className="absolute inset-0 size-full rounded-none" /> : null}
      {frames.map((frame) => (
        <iframe
          key={frame}
          src={`${frame}#view=FitH&navpanes=0`}
          title={t.previewTitle}
          onLoad={() => reveal(frame)}
          className={cn(
            "absolute inset-0 size-full transition-opacity duration-200 motion-reduce:transition-none",
            frame === newest && frame !== shown ? "opacity-0" : "opacity-100",
          )}
          tabIndex={frame === shown ? undefined : -1}
          aria-hidden={frame === shown ? undefined : true}
        />
      ))}
      {updating && url ? (
        <LivePill busy className="absolute top-3 right-3">
          Updating
        </LivePill>
      ) : null}
    </div>
  );
}
