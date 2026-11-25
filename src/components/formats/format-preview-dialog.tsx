"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ProMark } from "@/components/ui/pro-mark";
import { useWordsOr } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { TemplateInfo } from "@/lib/pdf/templates";
import { FormatImage, PREVIEW_SIZES } from "./format-image";

export type FormatPreviewDialogProps = {
  info: TemplateInfo | null;
  pro?: boolean;
  onClose: () => void;
  actionLabel: string;
  ready: boolean;
  opening?: boolean;
  onUse: (info: TemplateInfo) => void;
  // Pages without a provider pass these; the image's takes {name}.
  closeLabel?: string;
  imageAlt?: string;
  description?: string;
  proLabel?: string;
};

export function FormatPreviewDialog({
  info,
  pro = false,
  onClose,
  actionLabel,
  ready,
  opening = false,
  onUse,
  closeLabel,
  imageAlt,
  description,
  proLabel,
}: FormatPreviewDialogProps) {
  const formats = useWordsOr("formats");
  const close = info ? formats(closeLabel, (words) => words.gallery.close) : closeLabel;
  return (
    <Dialog
      open={info !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="lg"
      closeLabel={close}
      title={
        <span className="flex items-center gap-2">
          {info?.name}
          {pro ? <ProMark label={proLabel} /> : null}
        </span>
      }
      description={
        info ? formats(description, (words) => words.templates[info.id].description) : undefined
      }
      footer={
        info ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              {close}
            </Button>
            <Button onClick={() => onUse(info)} disabled={!ready} loading={opening} data-autofocus>
              {actionLabel}
            </Button>
          </>
        ) : null
      }
    >
      {info ? (
        <div className="rounded-xl bg-surface-muted p-3 sm:p-6">
          <FormatImage
            info={info}
            sizes={PREVIEW_SIZES}
            alt={fmt(
              formats(imageAlt, (words) => words.gallery.alt),
              { name: info.name },
            )}
            decoding="sync"
            className="mx-auto max-h-[65dvh] w-auto max-w-full shadow-page"
          />
        </div>
      ) : null}
    </Dialog>
  );
}
