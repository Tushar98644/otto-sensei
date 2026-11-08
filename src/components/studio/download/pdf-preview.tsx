"use client";

import { Eye } from "lucide-react";
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

export function PdfFrame({ url, pageSize, updating, className }: PdfFrameProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl bg-surface shadow-card",
        ASPECT[pageSize],
        className,
      )}
    >
      {url ? (
        <iframe
          // Every version gets a new URL, so the frame reloads by itself.
          src={`${url}#view=FitH&navpanes=0`}
          title="Preview of your resume PDF"
          className="size-full"
        />
      ) : (
        <Skeleton className="size-full rounded-none" />
      )}
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
