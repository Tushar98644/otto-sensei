"use client";

import { FolderGit } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { openFeaturePrompt } from "@/components/account/upgrade-prompt";
import { Badge } from "@/components/ui/badge";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";

// Loaded on first use: most people never open it.
const GitHubImportDialog = lazy(() =>
  import("./github-import-dialog").then((module) => ({ default: module.GitHubImportDialog })),
);

export type GitHubImportButtonProps = {
  resumeId: string;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  // After projects were added, with the resume as it is now.
  onAdded?: (resume: Resume) => void;
};

/**
 * "Add projects from GitHub", wherever it's offered (studio Projects, the portfolio's Projects).
 * Drafting is Pro: on Free the button carries the Pro badge and opens the trial prompt instead of
 * a dialog that would stop at the last step.
 */
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
  // Followed only once the dialog has been opened, so typing elsewhere doesn't rerender this.
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
          else setDialog({ used: true, open: true });
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
      {resume ? (
        <Suspense fallback={null}>
          <GitHubImportDialog
            resume={resume}
            open={dialog.open}
            onOpenChange={(open) => setDialog({ used: true, open })}
            onAdded={onAdded}
          />
        </Suspense>
      ) : null}
    </>
  );
}
