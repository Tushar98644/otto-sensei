"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { errorMessage } from "@/components/account/errors";
import { roomForApplication } from "@/components/account/pro-tools";
import { ROUTES } from "@/components/site/routes";
import { Button, buttonClasses } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { STATUS_NAMES } from "@/lib/applications/status";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { useResumeList } from "@/lib/store/resume-store";
import { ApplicationDialog, type ApplicationDialogTarget } from "./application-dialog";
import { prefillFor } from "./form";
import { StatusIcon } from "./status-menu";
import { addApplication, commitDelete, hideApplication, useApplications } from "./use-applications";
import { applicationAnchor, formatDay, latestFor } from "./view";

// The card whose job was just marked applied with the one-click shortcut: Otto cheers on that
// card only, so a second click elsewhere moves him rather than adding another.
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

export function useJustApplied(resumeId: string): boolean {
  return useSyncExternalStore(
    subscribeCheer,
    () => cheering === resumeId,
    () => false,
  );
}

// The shortcut on a tailored copy's card: one click logs it as sent today, filled in from the job
// it was tailored for, with its follow-up reminder already set. Only a copy that doesn't name its
// company opens the form. Once it's logged, the card shows where that application stands instead.
export function MarkApplied({ resume, describedBy }: { resume: Resume; describedBy?: string }) {
  const { items } = useApplications();
  const resumes = useResumeList();
  const [target, setTarget] = useState<ApplicationDialogTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const opened = useRef(0);
  const latest = useMemo(() => latestFor(items, resume.id), [items, resume.id]);

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
        ...known,
        appliedAt: Date.now(),
        status: "applied",
      });
      setCheering(resume.id);
      undoToast({
        title: `Marked as applied at ${application.company}`,
        description:
          application.followUpAt === null
            ? undefined
            : `I'll remind you to follow up on ${formatDay(application.followUpAt, application.followUpAt)}.`,
        onUndo: () => {
          if (cheering === resume.id) setCheering(null);
          hideApplication(application);
          commitDelete(application, { keepalive: false }).catch((error: unknown) =>
            toast({
              title: "Couldn't undo that",
              description: errorMessage(error),
              variant: "error",
            }),
          );
        },
      });
    } catch (error) {
      toast({ title: "Couldn't log it", description: errorMessage(error), variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {latest ? (
        <Link
          href={`${ROUTES.dashboardApplications}#${applicationAnchor(latest.id)}`}
          aria-describedby={describedBy}
          className={buttonClasses({
            variant: "ghost",
            size: "sm",
            className: "text-muted hover:text-ink",
          })}
        >
          <StatusIcon status={latest.status} />
          {STATUS_NAMES[latest.status]}
          <span className="sr-only">: see this application</span>
        </Link>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          aria-describedby={describedBy}
          loading={saving}
          onClick={() => void markApplied()}
        >
          Mark as applied
        </Button>
      )}
      <ApplicationDialog target={target} resumes={resumes} onClose={() => setTarget(null)} />
    </>
  );
}
