"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ProMark } from "@/components/ui/pro-mark";
import { useMessagesOr } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import EN_FORMATS from "@/i18n/messages/en/formats";
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
};

export function FormatPreviewDialog({
  info,
  pro = false,
  onClose,
  actionLabel,
  ready,
  opening = false,
  onUse,
}: FormatPreviewDialogProps) {
  const words = useMessagesOr("formats", EN_FORMATS);
  return (
    <Dialog
      open={info !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          {info?.name}
          {pro ? <ProMark /> : null}
        </span>
      }
      description={info ? words.templates[info.id].description : undefined}
      footer={
        info ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              {words.gallery.close}
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
            alt={fmt(words.gallery.alt, { name: info.name })}
            decoding="sync"
            className="mx-auto max-h-[65dvh] w-auto max-w-full shadow-page"
          />
        </div>
      ) : null}
    </Dialog>
  );
}
