"use client";

import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { Otto } from "@/components/mascot/otto";
import { ROUTES } from "@/components/site/routes";
import { UPLOAD_ACCEPT } from "@/components/studio/upload/upload-handoff";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { formatBytes } from "@/components/ui/file-check";
import { toast } from "@/components/ui/toast";
import { UPLOAD_LIMITS } from "@/config/plans";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { StudioActions } from "../use-studio-actions";

export function UploadZone({ actions, hasSample }: { actions: StudioActions; hasSample: boolean }) {
  const { upload, errors } = useMessages("dashboard");
  const router = useRouter();
  const pro = useProTools();
  const [opening, setOpening] = useState(false);

  async function take(file: File) {
    setOpening(true);
    try {
      // The hand-off loads with the first file, not with the page.
      const { openStudioWithFile } = await import("@/components/match-check/open-studio");
      if (await openStudioWithFile(file)) {
        router.push(ROUTES.studio);
        return;
      }
    } catch {
      toast({
        title: errors.cantOpenStudio,
        description: errors.generic,
        variant: "error",
      });
    }
    setOpening(false);
  }

  return (
    <div className="relative flex flex-col gap-2 pt-11">
      {/* Clipped just under his paws, so he rises from behind the zone's top edge. */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 right-6 h-12.5 w-20 overflow-hidden sm:right-10"
      >
        <Otto pose="peek" size={80} className="motion-safe:animate-otto-peek" />
      </span>
      <Dropzone
        onFile={(file) => void take(file)}
        onReject={(message) =>
          toast({ title: errors.cantUseFile, description: message, variant: "error" })
        }
        accept={UPLOAD_ACCEPT}
        maxBytes={UPLOAD_LIMITS.maxBytes}
        disabled={opening}
        label={upload.label}
        className="gap-2 px-4 py-8"
      >
        <span className="mb-1 flex size-11 items-center justify-center rounded-xl bg-surface shadow-control ring-1 ring-ink/8">
          <FileUp className="size-5 text-ink" aria-hidden />
        </span>
        <p className="font-medium text-ink">{opening ? upload.opening : upload.drop}</p>
        <p className="text-sm text-muted">
          {fmt(upload.types, { size: formatBytes(UPLOAD_LIMITS.maxBytes) })}
        </p>
      </Dropzone>
      <div className="flex flex-wrap items-center gap-x-1 text-sm text-muted">
        <span className="pr-1">{upload.noFile}</span>
        {/* Build with Otto writes with AI, which Free doesn't include. */}
        {pro ? (
          <Button variant="ghost" size="sm" onClick={actions.guided}>
            {upload.guided}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={actions.scratch}>
            {upload.scratch}
          </Button>
        )}
        {hasSample ? null : (
          <Button variant="ghost" size="sm" onClick={actions.sample}>
            {upload.sample}
          </Button>
        )}
      </div>
    </div>
  );
}
