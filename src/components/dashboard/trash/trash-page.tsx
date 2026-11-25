"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { roomForCopyOf } from "@/components/account/pro-tools";
import { OttoNote } from "@/components/mascot/otto-note";
import { ROUTES } from "@/components/site/routes";
import { tailoredLabel } from "@/components/studio/resume-label";
import { useNow } from "@/components/studio/use-now";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { resumeTitle } from "@/lib/resume/ops";
import { daysLeft, freshTrash, TRASH_DAYS } from "@/lib/store/history";
import {
  useStudioHydrated,
  useStudioStore,
  useTrash,
  type TrashedResume,
} from "@/lib/store/resume-store";
import { relativeTime } from "../i18n";

export function TrashPage() {
  const { trash: t } = useMessages("dashboard");
  const format = useFormat();
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
    toast({ title: t.restored, description: resumeTitle(copy), variant: "success" });
  }

  function confirmForget() {
    if (!forgetting) return;
    useStudioStore.getState().deleteFromTrash(forgetting.resume.id);
    toast({ title: t.deletedForGood, description: resumeTitle(forgetting.resume) });
    setForgetting(null);
  }

  function confirmEmpty() {
    useStudioStore.getState().emptyTrash();
    toast({ title: t.emptied });
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
            {t.back}
          </Link>
          <h1 className="mt-2 font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
            {t.title}
          </h1>
          <p className="mt-2 max-w-prose text-base/7 text-muted">
            {fmt(t.intro, { days: format.number(TRASH_DAYS) })}
          </p>
        </div>
        {hydrated && entries.length > 0 ? (
          <Button variant="secondary" onClick={() => setEmptying(true)}>
            {t.empty}
          </Button>
        ) : null}
      </header>

      {!hydrated ? (
        <div aria-busy className="flex flex-col gap-3 rounded-2xl bg-surface p-4 sm:p-6">
          <span className="sr-only" role="status">
            {t.loading}
          </span>
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl bg-surface p-6 sm:p-8">
          <OttoNote live={false} message={t.none} />
        </div>
      ) : (
        <section aria-label={t.list} className="rounded-2xl bg-surface px-4 sm:px-6">
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
        title={t.forgetTitle}
        description={
          forgetting ? fmt(t.forgetBody, { title: resumeTitle(forgetting.resume) }) : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setForgetting(null)} data-autofocus>
              {t.keepIt}
            </Button>
            <Button variant="danger" onClick={confirmForget}>
              {t.deleteForever}
            </Button>
          </>
        }
      />

      <Dialog
        open={emptying}
        onOpenChange={setEmptying}
        size="sm"
        title={t.emptyTitle}
        description={format.plural(t.emptyBody, entries.length)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEmptying(false)} data-autofocus>
              {t.keepThem}
            </Button>
            <Button variant="danger" onClick={confirmEmpty}>
              {t.empty}
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
  const { trash: t, card } = useMessages("dashboard");
  const format = useFormat();
  const title = resumeTitle(entry.resume);
  const left = daysLeft(entry, now);
  const meta = [
    tailoredLabel(entry.resume),
    fmt(t.deleted, { time: relativeTime(format, card.justNow, entry.deletedAt, now) }),
    format.plural(t.daysLeft, left),
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
        <Button
          variant="secondary"
          size="sm"
          onClick={onRestore}
          aria-label={fmt(t.restoreLabel, { title })}
        >
          <RotateCcw aria-hidden />
          {t.restore}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onForget}
          aria-label={fmt(t.forgetLabel, { title })}
        >
          {t.deleteForever}
        </Button>
      </div>
    </li>
  );
}
