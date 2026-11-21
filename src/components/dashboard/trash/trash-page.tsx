"use client";

import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { roomForCopyOf } from "@/components/account/pro-tools";
import { ROUTES } from "@/components/site/routes";
import { formatRelativeTime } from "@/components/studio/relative-time";
import { tailoredLabel } from "@/components/studio/resume-label";
import { useNow } from "@/components/studio/use-now";
import { Button } from "@/components/ui/button";
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
  const entries = useMemo(() => (now > 0 ? freshTrash(trash, now) : []), [trash, now]);
  const [forgetting, setForgetting] = useState<TrashedResume | null>(null);
  const [emptying, setEmptying] = useState(false);

  async function restore(entry: TrashedResume) {
    if (!(await roomForCopyOf(entry.resume))) return;
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
      <header className="flex flex-col gap-3">
        <Link
          href={ROUTES.dashboardResumes}
          className="-mb-1 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg text-sm text-muted transition-colors duration-150 ease-out hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Resumes
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
            Recently deleted
          </h1>
          {hydrated && entries.length > 0 ? (
            <Button variant="secondary" onClick={() => setEmptying(true)} className="shrink-0">
              Empty trash
            </Button>
          ) : null}
        </div>
        <p className="max-w-prose text-base/7 text-muted">
          Deleted resumes stay in this browser for {TRASH_DAYS} days, or until you sign out.
        </p>
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
        <div className="flex items-center gap-4 rounded-2xl bg-surface p-5 sm:p-6">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted"
          >
            <Trash2 className="size-4 text-muted" />
          </span>
          <p className="text-base/6 text-ink">Nothing here right now.</p>
        </div>
      ) : (
        <section aria-label="Deleted resumes" className="rounded-2xl bg-surface px-5 sm:px-6">
          <ul className="divide-y divide-border">
            {entries.map((entry) => (
              <TrashRow
                key={`${entry.resume.id}-${entry.deletedAt}`}
                entry={entry}
                now={now}
                onRestore={() => void restore(entry)}
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
        <p title={title} className="truncate text-base/6 font-medium text-ink">
          {title}
        </p>
        <p className="text-sm/5 text-subtle tabular-nums">{meta}</p>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRestore}
          aria-label={`Restore ${title}`}
          title="Brings it back as a new copy"
        >
          <RotateCcw aria-hidden />
          Restore
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onForget}
          aria-label={`Delete forever: ${title}`}
          className="text-muted hover:text-ink"
        >
          Delete forever
        </Button>
      </div>
    </li>
  );
}
