"use client";

import { useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { roomForApplication } from "@/components/account/pro-tools";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { queueJobForTailor, type QueuedJob } from "@/components/studio/tailor/session";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { api } from "@/lib/api/client";
import type {
  Application,
  JobMatchesResponse,
  MatchActionInput,
  MatchedJob,
} from "@/lib/api/types";
import type { AskedAppliedAnswer, FeedJob } from "@/lib/job-feed/types";
import type { Resume } from "@/lib/resume/schema";
import { commitDelete, hideApplication } from "../applications/use-applications";
import { forgetSavedJobs } from "../applications/board/use-board-extras";
import { formatDay } from "../i18n";
import type { StudioActions } from "../use-studio-actions";
import type { OpenedJobRef } from "./applied-prompt";
import { logJobApplied } from "./job-actions";
import type { JobView, SavedMark } from "./use-job-matches";
import { answerAppliedPrompt, rememberOpenedJob } from "./use-opened-jobs";
import { readsLink, tailoredFor } from "./view";

type JobActionsInput = {
  data: JobMatchesResponse | null;
  view: JobView;
  resume: Resume | null;
  resumes: Resume[];
  applications: Application[];
  userId: string | null;
  patch: (change: (data: JobMatchesResponse) => JobMatchesResponse, mark: SavedMark) => void;
  actions: StudioActions;
  free: boolean;
};

export function useJobActions({
  data,
  view,
  resume,
  resumes,
  applications,
  userId,
  patch,
  actions,
  free,
}: JobActionsInput) {
  const t = useMessages("jobs").actions;
  const format = useFormat();
  const [busy, setBusy] = useState<{ id: string; action: "apply" | "tailor" } | null>(null);
  const saveQueue = useRef(new Map<string, Promise<void>>());

  function note(
    job: { id: string },
    kind: MatchActionInput["kind"],
    detail: Pick<MatchActionInput, "reason" | "answer"> = {},
  ) {
    if (!data) return;
    const shown = view === "matches" ? data.jobs.find((item) => item.id === job.id) : undefined;
    if (!shown && kind !== "asked_applied") return;
    void api
      .jobEvent({
        kind,
        jobId: job.id,
        requestId: shown ? data.requestId : null,
        position: shown?.position ?? null,
        label: shown?.match.label ?? null,
        variant: data.variant,
        resumeHash: shown ? data.resumeHash : null,
        reason: detail.reason ?? null,
        answer: detail.answer ?? null,
      })
      .catch(() => undefined);
  }

  function startTailor(job: FeedJob, text: string, posting: QueuedJob["posting"]) {
    if (!resume) return;
    queueJobForTailor({
      link: job.url,
      title: job.title,
      company: job.company,
      location: job.location,
      text,
      postedAt: job.postedAt,
      readLink: readsLink(job),
      jobId: job.id,
      posting,
    });
    actions.open(resume.id, "tailor");
  }

  async function tailor(job: MatchedJob) {
    if (!resume) return;
    note(job, "tailor");
    setBusy({ id: job.id, action: "tailor" });
    let text = "";
    let posting: QueuedJob["posting"];
    try {
      const post = await api.jobPost(job.id);
      text = post.text;
      posting = post.posting ?? undefined;
    } catch {
      if (!readsLink(job)) {
        setBusy(null);
        toast({ title: t.cantOpen, description: t.tryLater, variant: "error" });
        return;
      }
    }
    startTailor(job, text, posting);
  }

  function closedToast() {
    toast({ title: t.closed, description: t.otherMatches });
  }

  // A link from an email names a job that may not be on this page, so it's read by its id.
  async function tailorById(id: string) {
    if (!resume) return;
    const shown = data?.jobs.find((item) => item.id === id);
    if (shown) {
      if (tailoredFor(resumes, shown)) openTailored(shown);
      else if (shown.closed) closedToast();
      else await tailor(shown);
      return;
    }
    setBusy({ id, action: "tailor" });
    try {
      const post = await api.jobPost(id);
      const copy = tailoredFor(resumes, post.job);
      if (copy) {
        actions.open(copy.id, "fix");
        return;
      }
      if (post.job.closed) {
        setBusy(null);
        closedToast();
        return;
      }
      startTailor(post.job, post.text, post.posting ?? undefined);
    } catch (error) {
      setBusy(null);
      toast({
        title: t.cantOpen,
        description: errorMessage(error),
        variant: "error",
      });
    }
  }

  function openTailored(job: MatchedJob) {
    const copy = tailoredFor(resumes, job);
    if (copy) actions.open(copy.id, "fix");
  }

  // Clicks on one job queue up so a quick save-unsave reaches the server in order.
  function toggleSave(job: MatchedJob) {
    if (free && !job.saved) {
      openUpgradePrompt("jobs");
      return;
    }
    const save = !job.saved;
    const mark = (saved: boolean, savedCount: number) => ({ jobId: job.id, saved, savedCount });
    const show = (saved: boolean, savedCount: number) =>
      patch(
        (current) => ({
          ...current,
          savedCount,
          jobs:
            view === "saved" && !saved
              ? current.jobs.filter((item) => item.id !== job.id)
              : current.jobs.map((item) => (item.id === job.id ? { ...item, saved } : item)),
        }),
        mark(saved, savedCount),
      );
    const before = data;
    show(save, Math.max(0, (data?.savedCount ?? 0) + (save ? 1 : -1)));
    const previous = saveQueue.current.get(job.id) ?? Promise.resolve();
    const next = previous.then(async () => {
      try {
        const res = save ? await api.saveJob(job.id) : await api.unsaveJob(job.id);
        if (res.saved) note(job, "save");
        show(res.saved, res.savedCount);
      } catch (error) {
        if (before) patch(() => before, mark(job.saved, before.savedCount));
        toast({
          title: save ? t.cantSave : t.cantRemove,
          description: errorMessage(error),
          variant: "error",
        });
      } finally {
        forgetSavedJobs();
      }
    });
    saveQueue.current.set(job.id, next);
  }

  async function markApplied(job: OpenedJobRef): Promise<"logged" | "blocked" | "failed"> {
    if (!(await roomForApplication(applications.length))) return "blocked";
    const sent = tailoredFor(resumes, job) ?? resume;
    setBusy({ id: job.id, action: "apply" });
    try {
      const application = await logJobApplied(job, sent);
      note(job, "applied");
      if (userId) answerAppliedPrompt(userId, job.id, "yes");
      undoToast({
        title: fmt(t.markedAt, { company: application.company }),
        description:
          application.followUpAt === null
            ? undefined
            : fmt(t.remind, {
                day: formatDay(format, application.followUpAt, application.followUpAt),
              }),
        onUndo: () => {
          hideApplication(application);
          commitDelete(application, { keepalive: false }).catch((error: unknown) =>
            toast({
              title: t.cantUndo,
              description: errorMessage(error),
              variant: "error",
            }),
          );
        },
      });
      return "logged";
    } catch (error) {
      toast({ title: t.cantLog, description: errorMessage(error), variant: "error" });
      return "failed";
    } finally {
      setBusy(null);
    }
  }

  function openJob(job: MatchedJob) {
    note(job, "open");
    if (userId) rememberOpenedJob(userId, job);
  }

  async function answerApplied(job: OpenedJobRef, answer: AskedAppliedAnswer) {
    if (!userId) return;
    if (answer === "yes" && (await markApplied(job)) === "failed") return;
    answerAppliedPrompt(userId, job.id, answer);
    note(job, "asked_applied", { answer });
  }

  return {
    busy,
    note,
    tailor,
    tailorById,
    openTailored,
    toggleSave,
    markApplied,
    openJob,
    answerApplied,
  };
}
