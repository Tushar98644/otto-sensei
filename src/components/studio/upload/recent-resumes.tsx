"use client";

import { ChevronRight, FileText } from "lucide-react";
import { useId } from "react";
import { Badge } from "@/components/ui/badge";
import type { Resume } from "@/lib/resume/schema";
import { pluralize } from "@/lib/utils";
import { formatRelativeTime } from "../relative-time";
import { resumeLabel, tailoredLabel } from "../resume-label";
import { useNow } from "../use-now";

const SHOWN = 5;

export type RecentResumesProps = {
  resumes: Resume[];
  onOpen: (id: string) => void;
  disabled?: boolean;
};

export function RecentResumes({ resumes, onOpen, disabled = false }: RecentResumesProps) {
  const headingId = useId();
  const now = useNow();
  const shown = resumes.slice(0, SHOWN);
  const hidden = resumes.length - shown.length;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="font-sans text-base font-semibold text-ink">
        Pick up where you left off
      </h2>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl bg-surface">
        {shown.map((resume) => {
          const tailored = tailoredLabel(resume);
          return (
            <li key={resume.id}>
              <button
                type="button"
                onClick={() => onOpen(resume.id)}
                disabled={disabled}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left -outline-offset-2 transition-colors hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-60"
              >
                <FileText className="size-5 shrink-0 text-muted" aria-hidden />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-medium text-ink">
                    {resumeLabel(resume)}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    {tailored ? <Badge className="max-w-full truncate">{tailored}</Badge> : null}
                    <span>Edited {formatRelativeTime(resume.updatedAt, now)}</span>
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      {hidden > 0 ? (
        <p className="text-sm text-muted">
          {pluralize(hidden, "more resume")} in the menu at the top.
        </p>
      ) : null}
    </section>
  );
}
