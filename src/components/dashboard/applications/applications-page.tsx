"use client";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { roomForApplication, useProTools, useTryProLabel } from "@/components/account/pro-tools";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { OTTO } from "@/components/mascot/lines";
import { Otto } from "@/components/mascot/otto";
import { OttoNote } from "@/components/mascot/otto-note";
import { useNow } from "@/components/studio/use-now";
import { FREE_APPLICATIONS } from "@/config/plans";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { waitingTooLong } from "@/lib/applications/nudge";
import type { Application } from "@/lib/applications/schema";
import { formatCount, tally, type VersionInfo } from "@/lib/applications/stats";
import { STATUS_NAMES, type ApplicationStatus } from "@/lib/applications/status";
import { resumeTitle } from "@/lib/resume/ops";
import { useResumeList } from "@/lib/store/resume-store";
import { ApplicationDialog, type ApplicationDialogTarget } from "./application-dialog";
import { ApplicationFilters } from "./application-filters";
import { ApplicationRow } from "./application-row";
import { NoReplyNudge } from "./no-reply-nudge";
import { SkillGapsPanel } from "./skill-gaps";
import {
  changeApplication,
  commitDelete,
  hideApplication,
  restoreApplication,
  useApplications,
} from "./use-applications";
import {
  applicationAnchor,
  filterApplications,
  filterCounts,
  FILTER_NAMES,
  sentLabel,
  type ApplicationFilter,
} from "./view";
import { WinRate } from "./win-rate";

// Rows drawn at first and per "Show more": each row carries two menus, so 2,000 at once is slow.
const PAGE_ROWS = 50;
const ANCHOR_PREFIX = applicationAnchor("");

// The row a resume card's status link points at (/dashboard/applications#application-<id>).
function linkedApplicationId(): string | null {
  if (typeof window === "undefined") return null;
  const hash = decodeURIComponent(window.location.hash.slice(1));
  return hash.startsWith(ANCHOR_PREFIX) ? hash.slice(ANCHOR_PREFIX.length) : null;
}

export function ApplicationsPage() {
  const now = useNow();
  const resumes = useResumeList();
  const { status, items, retry } = useApplications();
  const [filter, setFilter] = useState<ApplicationFilter>("all");
  const [rows, setRows] = useState(PAGE_ROWS);
  const [linked] = useState(linkedApplicationId);
  const [dialog, setDialog] = useState<ApplicationDialogTarget | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const opened = useRef(0);
  // Free tracks FREE_APPLICATIONS and can change it freely; only adding past that offers the trial.
  const full = useProTools() === false && items.length >= FREE_APPLICATIONS;
  const tryPro = useTryProLabel();

  const versions = useMemo(
    () =>
      new Map<string, VersionInfo>(
        resumes.map((resume) => [
          resume.id,
          { title: resumeTitle(resume), tailored: resume.tailor !== null },
        ]),
      ),
    [resumes],
  );
  const counts = useMemo(() => filterCounts(items), [items]);
  const shown = useMemo(() => filterApplications(items, filter), [items, filter]);
  const stale = useMemo(() => (now === 0 ? [] : waitingTooLong(items, now)), [items, now]);
  const totals = useMemo(() => tally(items), [items]);

  // A linked row past the first page is drawn too, so the link always lands.
  const linkedIndex = linked ? shown.findIndex((application) => application.id === linked) : -1;
  const visibleRows = Math.max(rows, linkedIndex + 1);

  // The rows load after the page, so the browser can't scroll to the linked one by itself.
  useEffect(() => {
    if (status !== "ready" || !linked) return;
    const row = document.getElementById(applicationAnchor(linked));
    if (!row) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
    row.querySelector<HTMLElement>("[aria-haspopup=menu]")?.focus({ preventScroll: true });
  }, [status, linked]);

  function pickFilter(next: ApplicationFilter) {
    setFilter(next);
    setRows(PAGE_ROWS);
  }

  async function add() {
    if (!(await roomForApplication(items.length))) return;
    opened.current += 1;
    setDialog({ kind: "add", key: opened.current, resumeId: null });
  }

  function edit(application: Application) {
    setDialog({ kind: "edit", application });
  }

  function setStatus(application: Application, next: ApplicationStatus) {
    setAnnouncement(`${application.company}: ${STATUS_NAMES[next]}`);
    changeApplication(application, { status: next }).catch((error: unknown) => {
      setAnnouncement("");
      toast({
        title: "Couldn't change the status",
        description: errorMessage(error),
        variant: "error",
      });
    });
  }

  // Gone from the list at once; the delete is sent only once the Undo has run out.
  function remove(target: Application) {
    hideApplication(target);
    undoToast({
      title: "Application deleted",
      description: target.company,
      onUndo: () => restoreApplication(target),
      onCommit: (options) => {
        commitDelete(target, options).catch((error: unknown) =>
          toast({
            title: "Couldn't delete it",
            description: errorMessage(error),
            variant: "error",
          }),
        );
      },
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
            Applications
          </h1>
          <p className="mt-2 max-w-prose text-base/7 text-muted">
            {status === "ready" && items.length > 0
              ? `${formatCount(totals.applications, "application")}, ${formatCount(totals.interviews, "interview")} so far. Counted from your own record only.`
              : "Log the jobs you apply to and the resume you sent. See which version gets interviews."}
          </p>
        </div>
        <Button onClick={() => void add()}>
          <Plus aria-hidden />
          Add application
        </Button>
      </header>

      {full ? (
        <OttoNote live={false} message={OTTO.limit.tool("tracker", false)}>
          <Button onClick={() => openUpgradePrompt("tracker")}>{tryPro}</Button>
        </OttoNote>
      ) : null}

      {status === "loading" ? (
        <LoadingState />
      ) : status === "error" ? (
        <Alert
          variant="error"
          title="Your applications didn't load"
          action={
            <Button variant="secondary" size="sm" onClick={retry}>
              Try again
            </Button>
          }
        >
          Check your connection, then try again.
        </Alert>
      ) : items.length === 0 ? (
        <EmptyState onAdd={() => void add()} />
      ) : (
        <>
          <NoReplyNudge stale={stale} />
          <WinRate items={items} versions={versions} />
          <SkillGapsPanel />

          <section aria-labelledby="applications-heading" className="flex flex-col gap-4">
            <h2 id="applications-heading" className="font-sans text-lg/7 font-medium text-ink">
              Every application
            </h2>
            <ApplicationFilters filter={filter} counts={counts} onChange={pickFilter} />
            <p aria-live="polite" className="sr-only">
              {announcement}
            </p>
            <FolderCard
              tab={FILTER_NAMES[filter]}
              tabEnd={
                <span className="text-xs text-subtle tabular-nums">
                  {formatCount(shown.length, "shown", "shown")}
                </span>
              }
              bodyClassName="px-4 py-0 sm:px-6"
            >
              {shown.length > 0 ? (
                <ul className="divide-y divide-border">
                  {shown.slice(0, visibleRows).map((application) => (
                    <ApplicationRow
                      key={application.id}
                      application={application}
                      sent={sentLabel(application, versions)}
                      now={now}
                      onStatus={(target, next) => setStatus(target, next)}
                      onEdit={(target) => edit(target)}
                      onDelete={remove}
                    />
                  ))}
                  {shown.length > visibleRows ? (
                    <li className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRows(visibleRows + PAGE_ROWS)}
                      >
                        Show {Math.min(PAGE_ROWS, shown.length - visibleRows)} more
                      </Button>
                    </li>
                  ) : null}
                </ul>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 py-5">
                  <p className="text-sm/6 text-muted">Nothing with this status right now.</p>
                  <Button variant="secondary" size="sm" onClick={() => pickFilter("all")}>
                    Show all
                  </Button>
                </div>
              )}
            </FolderCard>
          </section>
        </>
      )}

      <ApplicationDialog target={dialog} resumes={resumes} onClose={() => setDialog(null)} />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <section
      aria-labelledby="empty-applications"
      className="flex flex-col items-center rounded-3xl bg-surface px-6 py-14 text-center sm:py-20"
    >
      <Otto pose="point" size={128} />
      <h2 id="empty-applications" className="mt-6 font-sans text-lg/7 font-medium text-ink">
        Your applications will live here
      </h2>
      <p className="mt-2 max-w-sm text-sm/6 text-pretty text-muted">
        Log each job and the resume version you sent. Otto counts the interviews per version, from
        your numbers only.
      </p>
      <div className="mt-6">
        <Button onClick={onAdd}>
          <Plus aria-hidden />
          Add your first application
        </Button>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div aria-busy className="flex flex-col gap-8">
      <span className="sr-only" role="status">
        Loading your applications
      </span>
      <div aria-hidden className="flex flex-col">
        <Skeleton className="h-8 w-28 rounded-t-xl rounded-b-none" />
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl rounded-tl-none bg-border lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="flex flex-col gap-2 bg-surface p-5 sm:p-6">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-10 w-12" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton aria-hidden className="h-64 rounded-2xl bg-surface" />
    </div>
  );
}
