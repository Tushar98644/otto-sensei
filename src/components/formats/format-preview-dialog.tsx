"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { TemplateInfo } from "@/lib/pdf/templates";
import { FormatImage } from "./format-image";

export type FormatPreviewDialogProps = {
  info: TemplateInfo | null;
  onClose: () => void;
  actionLabel: string;
  ready: boolean;
  onUse: (info: TemplateInfo) => void;
};

export function FormatPreviewDialog({
  info,
  onClose,
  actionLabel,
  ready,
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
            <Button onClick={() => onUse(info)} disabled={!ready} data-autofocus>
              {actionLabel}
            </Button>
          </>
        ) : null
      }
    >
      {info ? (
        <div className="rounded-xl bg-surface-muted p-3 sm:p-6">
          {/* Sized to the dialog: the whole page fits on screen without scrolling. */}
          <FormatImage
            info={info}
            sizes="(min-width: 672px) 36rem, 90vw"
            className="mx-auto max-h-[65dvh] w-auto max-w-full shadow-card"
          />
        </div>
      ) : null}
    </Dialog>
  );
}
