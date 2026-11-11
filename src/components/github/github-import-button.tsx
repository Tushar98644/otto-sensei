"use client";

import { FolderGit } from "lucide-react";
import { useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { openFeaturePrompt } from "@/components/account/upgrade-prompt";
import { Badge } from "@/components/ui/badge";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { useGitHubReturn } from "./connect-return";

type Dialog = typeof import("./github-import-dialog").GitHubImportDialog;

export type GitHubImportButtonProps = {
  resumeId: string;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  onAdded?: (resume: Resume) => void;
};

export function GitHubImportButton({
  resumeId,
  label,
  variant = "secondary",
  size = "md",
  className,
  onAdded,
}: GitHubImportButtonProps) {
  const locked = useProTools() === false;
  const [dialog, setDialog] = useState({ used: false, open: false });
  // Not Suspense: React's 300 ms fallback throttle would hold the dialog back.
  const [GitHubImportDialog, setGitHubImportDialog] = useState<Dialog | null>(null);

  function open() {
    setDialog({ used: true, open: true });
    if (GitHubImportDialog) return;
    import("./github-import-dialog").then(
      (module) => setGitHubImportDialog(() => module.GitHubImportDialog),
      () => {
        setDialog({ used: false, open: false });
        toast({
          title: "Couldn't open GitHub import",
          description: "Try again in a moment.",
          variant: "error",
        });
      },
    );
  }
  useGitHubReturn(resumeId, open);
  const resume = useStudioStore((state) =>
    dialog.used && Object.hasOwn(state.resumes, resumeId) ? state.resumes[resumeId] : undefined,
  );

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => {
          if (locked) openFeaturePrompt("github");
          else open();
        }}
      >
        <FolderGit aria-hidden />
        {label}
        {locked ? (
          <Badge variant="ink" className="h-5 px-1.5">
            Pro
          </Badge>
        ) : null}
      </Button>
      {resume && GitHubImportDialog ? (
        <GitHubImportDialog
          resume={resume}
          open={dialog.open}
          onOpenChange={(next) => setDialog({ used: true, open: next })}
          onAdded={onAdded}
        />
      ) : null}
    </>
  );
}
