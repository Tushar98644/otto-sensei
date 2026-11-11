"use client";

import { Eye } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { LivePill } from "@/components/ui/live-pill";
import { Skeleton } from "@/components/ui/skeleton";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "../use-media-query";

// Phones and tablets can't show a PDF inside a page (Android downloads it, iOS shows only the first
// page as a picture), so they get a link that opens it full screen instead.
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
  // A newer version is being made; the one shown is slightly out of date.
  updating: boolean;
  className?: string;
};

// The browser's PDF viewer paints a moment after its frame's load event.
const PAINT_MS = 150;
// A viewer that never reports loading is shown anyway after this long.
const LOAD_FALLBACK_MS = 1500;
const FADE_MS = 200;

// Each version is a new file in a new frame. The new frame loads hidden on top of the old one and
// fades in once the viewer has drawn it, then the old frame goes: no blank flash between formats.
export function PdfFrame({ url, pageSize, updating, className }: PdfFrameProps) {
  // Bottom to top: the frame on show, and at most one newer frame still loading over it.
  const [frames, setFrames] = useState<string[]>(url ? [url] : []);
  const [shown, setShown] = useState<string | null>(null);
  const newest = frames.at(-1) ?? null;
  if (url && url !== newest) {
    setFrames((list) => [...list.filter((frame) => frame === shown), url]);
  }

  const reveal = useCallback((frame: string) => {
    window.setTimeout(() => {
      setShown(frame);
      window.setTimeout(() => setFrames((list) => list.filter((f) => f === frame)), FADE_MS);
    }, PAINT_MS);
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
          title="Preview of your resume PDF"
          onLoad={() => reveal(frame)}
          className={cn(
            "absolute inset-0 size-full transition-opacity duration-200 motion-reduce:transition-none",
            frame === newest && frame !== shown ? "opacity-0" : "opacity-100",
          )}
          // Only the frame on show is in the tab order and the accessibility tree.
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

export function PdfPreviewLink({ url, className }: { url: string; className?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener"
      className={buttonClasses({ variant: "outline", className })}
    >
      <Eye />
      Preview
    </a>
  );
}
