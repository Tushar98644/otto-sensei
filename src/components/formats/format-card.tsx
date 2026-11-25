"use client";

import { ArrowRight, Maximize2 } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import { ProMark } from "@/components/ui/pro-mark";
import { useMessagesOr } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import EN_FORMATS from "@/i18n/messages/en/formats";
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
  const words = useMessagesOr("formats", EN_FORMATS);
  const t = words.gallery;
  const preview = () => preloadFormatPreview(info.id);
  return (
    <article
      aria-labelledby={titleId}
      onPointerEnter={preview}
      onFocus={preview}
      className="group/format h-full"
    >
      <FolderCard
        tab={<span id={titleId}>{info.name}</span>}
        tone={inUse ? "forest" : "plain"}
        tabEnd={
          inUse ? (
            <span className="text-xs/4 font-medium text-ink">{t.inUse}</span>
          ) : pro ? (
            <ProMark />
          ) : null
        }
        className="h-full"
        bodyClassName="flex flex-col gap-4 p-4"
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={onPreview}
          className="h-48 cursor-zoom-in overflow-hidden rounded-xl bg-surface-muted px-5 pt-5"
        >
          <FormatImage
            info={info}
            sizes={CARD_SIZES}
            alt={fmt(t.alt, { name: info.name })}
            className="shadow-page transition-[translate,box-shadow] duration-300 ease-out group-hover/format:-translate-y-1 group-hover/format:shadow-page-lift"
          />
        </button>
        <p className="flex-1 text-sm/6 text-pretty text-ink">{words.templates[info.id].bestFor}</p>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={inUse ? "primary" : "secondary"}
            onClick={onUse}
            disabled={!ready}
            loading={opening}
            aria-describedby={titleId}
          >
            {actionLabel}
            {inUse ? <ArrowRight /> : null}
          </Button>
          <Button size="sm" variant="ghost" onClick={onPreview} aria-describedby={titleId}>
            <Maximize2 />
            {t.preview}
          </Button>
        </div>
      </FolderCard>
    </article>
  );
}
