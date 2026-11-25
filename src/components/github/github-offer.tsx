"use client";

import { useStudioStore } from "@/lib/store/resume-store";
import { cn } from "@/lib/utils";
import { offersGitHubImport, usernameFromResume } from "./format";
import { GitHubImportButton } from "./github-import-button";
import { fmt } from "@/i18n/format";
import { useGitHubWords } from "./use-github-words";

export function GitHubOffer({ resumeId, className }: { resumeId: string; className?: string }) {
  const username = useStudioStore((state) => {
    const resume = Object.hasOwn(state.resumes, resumeId) ? state.resumes[resumeId] : undefined;
    return resume && offersGitHubImport(resume) ? usernameFromResume(resume) : "";
  });
  const t = useGitHubWords().offer;
  if (!username) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm/6 font-medium text-ink">{fmt(t.links, { username })}</p>
        <p className="text-sm/6 text-muted">{t.text}</p>
      </div>
      <GitHubImportButton
        resumeId={resumeId}
        label={t.button}
        className="self-start sm:self-auto"
      />
    </div>
  );
}
