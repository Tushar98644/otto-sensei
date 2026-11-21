"use client";

import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { OTTO } from "@/components/mascot/lines";
import { openStudioWithFile } from "@/components/match-check/open-studio";
import { ROUTES } from "@/components/site/routes";
import { UPLOAD_ACCEPT } from "@/components/studio/upload/upload-handoff";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { formatBytes } from "@/components/ui/file-check";
import { toast } from "@/components/ui/toast";
import { UPLOAD_LIMITS } from "@/config/plans";
import type { StudioActions } from "../use-studio-actions";

export function UploadZone({ actions, hasSample }: { actions: StudioActions; hasSample: boolean }) {
  const router = useRouter();
  const pro = useProTools();
  const [opening, setOpening] = useState(false);

  async function take(file: File) {
    setOpening(true);
    try {
      if (await openStudioWithFile(file)) {
        router.push(ROUTES.studio);
        return;
      }
    } catch {
      toast({ title: "Couldn't open the studio", description: OTTO.errors.generic, variant: "error" });
    }
    setOpening(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <Dropzone
        onFile={(file) => void take(file)}
        onReject={(message) =>
          toast({ title: "Couldn't use that file", description: message, variant: "error" })
        }
        accept={UPLOAD_ACCEPT}
        maxBytes={UPLOAD_LIMITS.maxBytes}
        disabled={opening}
        label="Upload your resume, a PDF or Word file"
        className="gap-2 px-4 py-8"
      >
        <FileUp className="size-6 text-ink" aria-hidden />
        <p className="font-medium text-ink">
          {opening ? "Opening the studio" : "Drop your resume here, or choose a file"}
        </p>
        <p className="text-sm text-muted">
          PDF or Word (.docx), up to {formatBytes(UPLOAD_LIMITS.maxBytes)}
        </p>
      </Dropzone>
      <div className="flex flex-wrap items-center gap-x-1 text-sm text-muted">
        <span className="pr-1">No file handy?</span>
        {/* Build with Otto writes with AI, which Free doesn't include. */}
        {pro ? (
          <Button variant="ghost" size="sm" onClick={actions.guided}>
            Build with Otto
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={actions.scratch}>
            Start from scratch
          </Button>
        )}
        {hasSample ? null : (
          <Button variant="ghost" size="sm" onClick={actions.sample}>
            Try a sample
          </Button>
        )}
      </div>
    </div>
  );
}
