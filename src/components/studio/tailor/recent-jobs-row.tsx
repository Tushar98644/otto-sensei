"use client";

import { useQuery } from "@tanstack/react-query";
import { Bookmark, History } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useProTools } from "@/components/account/pro-tools";
import { useMe } from "@/components/account/use-me";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api/client";
import type { JobPostResponse, SavedJob } from "@/lib/job-feed/types";
import { useAppQueryClient } from "@/lib/queries/client";
import { savedJobsQuery } from "@/lib/queries/options";
import { useStudioStore } from "@/lib/store/resume-store";
import { recentJobs, savedJobQueued, type RecentJob } from "./recent-jobs";
import { rememberJobRef, type QueuedJob } from "./session";

const NO_SAVED: SavedJob[] = [];

export type RecentJobsProps = { onPick: (job: QueuedJob) => void; disabled: boolean };

export function RecentJobs({ onPick, disabled }: RecentJobsProps) {
  const { user } = useMe();
  const pro = useProTools();
  // Saving jobs is part of the Jobs tab, which only Pro and trial accounts have.
  const userId = pro === true && user ? user.id : "";
  const client = useAppQueryClient();
  const saved = useQuery({ ...savedJobsQuery(userId), enabled: userId !== "" }, client);
  const tailored = useStudioStore(
    useShallow((s) =>
      s.order.flatMap((id) => {
        const meta = s.resumes[id]?.tailor;
        return meta ? [meta] : [];
      }),
    ),
  );
  const savedJobs = userId ? (saved.data ?? NO_SAVED) : NO_SAVED;
  const jobs = useMemo(() => recentJobs(tailored, savedJobs), [tailored, savedJobs]);
  const [opening, setOpening] = useState<string | null>(null);
  const labelId = useId();
  const t = useMessages("studioTailor").recent;

  if (jobs.length === 0) return null;

  // A chip fills the form; the Compare press stays, so a tap never spends a tailored version.
  function fill(job: QueuedJob) {
    rememberJobRef(job);
    onPick({ ...job, compare: false });
  }

  async function pick(item: RecentJob) {
    if (item.kind === "tailored") {
      fill(item.job);
      return;
    }
    setOpening(item.key);
    let post: Pick<JobPostResponse, "text" | "posting"> | null = null;
    try {
      post = await api.jobPost(item.saved.id);
    } catch {
      post = null;
    }
    setOpening(null);
    const job = savedJobQueued(item.saved, post);
    if (!job.text.trim() && !job.readLink) {
      toast({ title: t.failed, description: t.failedNote, variant: "error" });
      return;
    }
    fill(job);
  }

  return (
    <section aria-labelledby={labelId} className="flex flex-col gap-2">
      <h3 id={labelId} className="text-sm text-subtle">
        {t.title}
      </h3>
      <ul className="flex flex-wrap gap-2">
        {jobs.map((item) => {
          const Icon = item.kind === "saved" ? Bookmark : History;
          return (
            <li key={item.key} className="max-w-full min-w-0">
              <Button
                variant="secondary"
                size="sm"
                loading={opening === item.key}
                disabled={disabled || (opening !== null && opening !== item.key)}
                onClick={() => void pick(item)}
                className="max-w-full"
              >
                <Icon aria-hidden className="text-muted" />
                <span className="sr-only">
                  {item.kind === "saved" ? t.saved : t.tailored}{" "}
                </span>
                <span className="max-w-64 truncate">{item.label}</span>
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
