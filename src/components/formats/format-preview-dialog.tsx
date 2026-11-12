"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { TemplateInfo } from "@/lib/pdf/templates";
import { FormatImage, PREVIEW_SIZES } from "./format-image";

export type FormatPreviewDialogProps = {
  info: TemplateInfo | null;
  onClose: () => void;
  actionLabel: string;
  ready: boolean;
  opening?: boolean;
  onUse: (info: TemplateInfo) => void;
};

export function FormatPreviewDialog({
  info,
  onClose,
  actionLabel,
  ready,
  opening = false,
  onUse,
}: FormatPreviewDialogProps) {
  return (
    <Dialog
      open={info !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="lg"
      title={info?.name ?? ""}
      description={info?.description}
      footer={
        info ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
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
            decoding="sync"
            className="mx-auto max-h-[65dvh] w-auto max-w-full shadow-card"
          />
        </div>
      ) : null}
    </Dialog>
  );
}
