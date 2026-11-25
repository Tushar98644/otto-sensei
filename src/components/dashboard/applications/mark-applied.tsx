"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { errorMessage } from "@/components/account/errors";
import { roomForApplication } from "@/components/account/pro-tools";
import { Button, buttonClasses } from "@/components/ui/button";
import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import type { Application } from "@/lib/applications/schema";
import { STATUS_NAMES, type ApplicationStatus } from "@/lib/applications/status";
import { fmt } from "@/i18n/format";
import englishShared from "@/i18n/messages/en/jobsShared";
import { applicationForCopy, applicationHref, copyJobId } from "@/lib/applications/thread";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { useResumeList } from "@/lib/store/resume-store";
import type { ApplicationDialogTarget } from "./application-dialog";
import { prefillFor } from "./form";
import { StatusIcon } from "./status-menu";
import { addApplication, commitDelete, hideApplication, useApplications } from "./use-applications";
import { formatDay } from "./view";

const applicationDialog = lazyComponent(() =>
  import("./application-dialog").then((m) => m.ApplicationDialog),
);

let cheering: string | null = null;
const cheerListeners = new Set<() => void>();

function setCheering(resumeId: string | null) {
  cheering = resumeId;
  for (const listener of cheerListeners) listener();
}

function subscribeCheer(listener: () => void) {
  cheerListeners.add(listener);
  return () => {
    cheerListeners.delete(listener);
  };
}

export function useCopyApplication(resume: Resume): Application | null {
  const { items } = useApplications();
  return useMemo(() => applicationForCopy(items, resume), [items, resume]);
}

export function useJustApplied(resumeId: string): boolean {
  return useSyncExternalStore(
    subscribeCheer,
    () => cheering === resumeId,
    () => false,
  );
}

export type MarkAppliedCopy = {
  words: (typeof englishShared)["applied"];
  statuses: Record<ApplicationStatus, string>;
  day: (timestamp: number) => string;
};

// The studio has no messages provider yet, so it reads these; the dashboard passes its own.
const englishCopy: MarkAppliedCopy = {
  words: englishShared.applied,
  statuses: STATUS_NAMES,
  day: (timestamp) => formatDay(timestamp, timestamp),
};

export function MarkApplied({
  resume,
  describedBy,
  copy = englishCopy,
}: {
  resume: Resume;
  describedBy?: string;
  copy?: MarkAppliedCopy;
}) {
  const { words } = copy;
  const { items } = useApplications();
  const resumes = useResumeList();
  const [target, setTarget] = useState<ApplicationDialogTarget | null>(null);
  const dialogWanted = useOpenedOnce(target !== null);
  const [saving, setSaving] = useState(false);
  const opened = useRef(0);
  const latest = useMemo(() => applicationForCopy(items, resume), [items, resume]);

  async function markApplied() {
    if (!(await roomForApplication(items.length))) return;
    const known = prefillFor(resume, null);
    if (!known.company) {
      opened.current += 1;
      setTarget({ kind: "add", key: opened.current, resumeId: resume.id });
      return;
    }
    setSaving(true);
    try {
      const application = await addApplication({
        resumeId: resume.id,
        resumeTitle: resumeTitle(resume).slice(0, 200),
        jobId: copyJobId(resume),
        ...known,
        appliedAt: Date.now(),
        status: "applied",
      });
      setCheering(resume.id);
      undoToast({
        title: fmt(words.marked, { company: application.company }),
        description:
          application.followUpAt === null
            ? undefined
            : fmt(words.remind, { day: copy.day(application.followUpAt) }),
        onUndo: () => {
          if (cheering === resume.id) setCheering(null);
          hideApplication(application);
          commitDelete(application, { keepalive: false }).catch((error: unknown) =>
            toast({
              title: words.cantUndo,
              description: errorMessage(error),
              variant: "error",
            }),
          );
        },
      });
    } catch (error) {
      toast({ title: words.cantLog, description: errorMessage(error), variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {latest ? (
        <Link
          href={applicationHref(latest.id)}
          aria-describedby={describedBy}
          className={buttonClasses({
            variant: "ghost",
            size: "sm",
            className: "text-muted hover:text-ink",
          })}
        >
          <StatusIcon status={latest.status} />
          {copy.statuses[latest.status]}
          <span className="sr-only">{words.open}</span>
        </Link>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          aria-describedby={describedBy}
          loading={saving}
          onClick={() => void markApplied()}
        >
          {words.mark}
        </Button>
      )}
      <Lazy
        loader={applicationDialog}
        wanted={dialogWanted}
        props={{ target, resumes, onClose: () => setTarget(null) }}
      />
    </>
  );
}
