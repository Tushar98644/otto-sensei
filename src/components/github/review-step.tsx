"use client";

import { useId } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { isOnResume } from "@/lib/github/to-projects";
import type { GitHubDraftEntry, GitHubDraftResult } from "@/lib/github/types";
import type { Resume } from "@/lib/resume/schema";
import { pluralize } from "@/lib/utils";
import { shortLink } from "./format";

export type ReviewStepProps = {
  draft: GitHubDraftResult;
  resume: Resume;
  left: readonly string[];
  onToggle: (key: string) => void;
};

export function ReviewStep({ draft, resume, left, onToggle }: ReviewStepProps) {
  return (
    <div className="flex flex-col gap-4">
      {draft.missing > 0 ? (
        <Alert variant="warn">
          {pluralize(draft.missing, "pick isn't", "picks aren't")} on GitHub anymore, so Otto left{" "}
          {draft.missing === 1 ? "it" : "them"} out.
        </Alert>
      ) : null}
      <ul className="flex flex-col gap-3">
        {draft.entries.map((entry) => (
          <ReviewEntry
            key={entry.key}
            entry={entry}
            checked={!left.includes(entry.key)}
            onResume={isOnResume(resume, entry)}
            onToggle={() => onToggle(entry.key)}
          />
        ))}
      </ul>
    </div>
  );
}

type ReviewEntryProps = {
  entry: GitHubDraftEntry;
  checked: boolean;
  onResume: boolean;
  onToggle: () => void;
};

function ReviewEntry({ entry, checked, onResume, onToggle }: ReviewEntryProps) {
  const titleId = useId();
  return (
    <li className="rounded-2xl bg-surface-muted p-4">
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-labelledby={titleId}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-ink"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span id={titleId} className="min-w-0 text-sm/5 font-medium break-words text-ink">
              {entry.name}
            </span>
            {onResume ? <Badge>Already on your resume</Badge> : null}
          </span>
          <span className="truncate text-xs/5 text-subtle">{shortLink(entry.link)}</span>
        </span>
      </label>
      {entry.bullets.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1.5 pl-8 text-sm/6 text-ink marker:text-subtle">
          {entry.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 pl-8 text-sm/6 text-muted">No lines yet. You can write them after adding.</p>
      )}
    </li>
  );
}
