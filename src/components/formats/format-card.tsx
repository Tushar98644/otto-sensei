"use client";

import { CircleCheck, Maximize2 } from "lucide-react";
import { useId } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import type { TemplateInfo } from "@/lib/pdf/templates";
import { CARD_SIZES, FormatImage, preloadFormatPreview } from "./format-image";

export type FormatCardProps = {
  info: TemplateInfo;
  inUse: boolean;
  pro?: boolean;
  actionLabel: string;
  ready: boolean;
  opening?: boolean;
  onUse: () => void;
  onPreview: () => void;
};

export function FormatCard({
  info,
  inUse,
  pro = false,
  actionLabel,
  ready,
  opening = false,
  onUse,
  onPreview,
}: FormatCardProps) {
  const titleId = useId();
  const preview = () => preloadFormatPreview(info.id);
  return (
    <article
      aria-labelledby={titleId}
      onPointerEnter={preview}
      onFocus={preview}
      className="h-full"
    >
      <FolderCard
        tab={<span id={titleId}>{info.name}</span>}
        tone={inUse ? "forest" : "plain"}
        tabEnd={
          inUse ? (
            <span className="text-xs/4 font-medium text-ink">In use</span>
          ) : pro ? (
            <Badge variant="ink" className="h-5 px-1.5">
              Pro
            </Badge>
          ) : null
        }
        className="h-full"
        bodyClassName="flex flex-col gap-4 p-4"
      >
        <button
          type="button"
          tabIndex={-1}
          onClick={onPreview}
          className="h-48 cursor-zoom-in overflow-hidden rounded-xl bg-surface-muted px-5 pt-5"
        >
          <FormatImage info={info} sizes={CARD_SIZES} className="shadow-card" />
        </button>
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-sm/6 text-pretty text-ink">{info.bestFor}</p>
          <p className="flex items-center gap-1.5 text-xs/5 text-muted">
            <CircleCheck className="size-3.5 shrink-0 text-pass" aria-hidden />
            Reads cleanly in hiring software
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            onClick={onUse}
            disabled={!ready}
            loading={opening}
            aria-describedby={titleId}
          >
            {actionLabel}
          </Button>
          <Button size="sm" variant="ghost" onClick={onPreview} aria-describedby={titleId}>
            <Maximize2 />
            Preview
          </Button>
        </div>
      </FolderCard>
    </article>
  );
}
