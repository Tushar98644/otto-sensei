"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { ROUTES } from "@/components/site/routes";
import { formatRelativeTime } from "@/components/studio/relative-time";
import { tailoredLabel } from "@/components/studio/resume-label";
import { useNow } from "@/components/studio/use-now";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { resumeTitle } from "@/lib/resume/ops";
import { daysLeft, freshTrash, TRASH_DAYS } from "@/lib/store/history";
import {
  useStudioHydrated,
  useStudioStore,
  useTrash,
  type TrashedResume,
} from "@/lib/store/resume-store";
import { pluralize } from "@/lib/utils";

export function TrashPage() {
  const hydrated = useStudioHydrated();
  const trash = useTrash();
  const now = useNow();
  // Entries can pass their 30 days while the page is open; they leave the store on the next load.
  const entries = useMemo(() => (now > 0 ? freshTrash(trash, now) : []), [trash, now]);
  const [forgetting, setForgetting] = useState<TrashedResume | null>(null);
  const [emptying, setEmptying] = useState(false);

  function restore(entry: TrashedResume) {
    const id = useStudioStore.getState().restoreFromTrash(entry.resume.id);
    const copy = id ? useStudioStore.getState().resumes[id] : undefined;
    if (!copy) return;
    toast({ title: "Resume restored", description: resumeTitle(copy), variant: "success" });
  }

  function confirmForget() {
    if (!forgetting) return;
    useStudioStore.getState().deleteFromTrash(forgetting.resume.id);
    toast({ title: "Deleted for good", description: resumeTitle(forgetting.resume) });
    setForgetting(null);
  }

  function confirmEmpty() {
    useStudioStore.getState().emptyTrash();
    toast({ title: "Recently deleted is empty" });
    setEmptying(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <Link
            href={ROUTES.dashboardResumes}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm text-muted hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Resumes
          </Link>
          <h1 className="mt-2 font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
            Recently deleted
          </h1>
          <p className="mt-2 max-w-prose text-base/7 text-muted">
            Deleted resumes wait here for {TRASH_DAYS} days, in this browser only. Restoring one
            brings it back as a new copy.
          </p>
        </div>
        {hydrated && entries.length > 0 ? (
          <Button variant="secondary" onClick={() => setEmptying(true)}>
            Empty trash
          </Button>
        ) : null}
      </header>

      {!hydrated ? (
        <div aria-busy className="flex flex-col gap-3 rounded-2xl bg-surface p-4 sm:p-6">
          <span className="sr-only" role="status">
            Loading deleted resumes
          </span>
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl bg-surface p-6 sm:p-8">
          <OttoNote
            live={false}
            message={`Nothing here. Resumes you delete wait here for ${TRASH_DAYS} days.`}
          >
            <Link
              href={ROUTES.dashboardResumes}
              className={buttonClasses({ variant: "secondary" })}
            >
              Back to resumes
            </Link>
          </OttoNote>
        </div>
      ) : (
        <section aria-label="Deleted resumes" className="rounded-2xl bg-surface px-4 sm:px-6">
          <ul className="divide-y divide-border">
            {entries.map((entry) => (
              <TrashRow
                key={`${entry.resume.id}-${entry.deletedAt}`}
                entry={entry}
                now={now}
                onRestore={() => restore(entry)}
                onForget={() => setForgetting(entry)}
              />
            ))}
          </ul>
        </section>
      )}

      <Dialog
        open={forgetting !== null}
        onOpenChange={(open) => {
          if (!open) setForgetting(null);
        }}
        size="sm"
        title="Delete forever?"
        description={
          forgetting
            ? `“${resumeTitle(forgetting.resume)}” and its saved versions will be gone for good. This can't be undone.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setForgetting(null)} data-autofocus>
              Keep it
            </Button>
            <Button variant="danger" onClick={confirmForget}>
              Delete forever
            </Button>
          </>
        }
      />

      <Dialog
        open={emptying}
        onOpenChange={setEmptying}
        size="sm"
        title="Empty Recently deleted?"
        description={`${pluralize(entries.length, "resume")} will be gone for good. This can't be undone.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEmptying(false)} data-autofocus>
              Keep them
            </Button>
            <Button variant="danger" onClick={confirmEmpty}>
              Empty trash
            </Button>
          </>
        }
      />
    </div>
  );
}

function TrashRow({
  entry,
  now,
  onRestore,
  onForget,
}: {
  entry: TrashedResume;
  now: number;
  onRestore: () => void;
  onForget: () => void;
}) {
  const title = resumeTitle(entry.resume);
  const left = daysLeft(entry, now);
  const meta = [
    tailoredLabel(entry.resume),
    `Deleted ${formatRelativeTime(entry.deletedAt, now)}`,
    `${pluralize(left, "day")} left`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate text-base/6 font-medium text-ink">{title}</p>
        <p className="text-sm/5 text-subtle">{meta}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onRestore} aria-label={`Restore ${title}`}>
          <RotateCcw aria-hidden />
          Restore
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onForget}
          aria-label={`Delete forever: ${title}`}
        >
          Delete forever
        </Button>
      </div>
    </li>
  );
}
