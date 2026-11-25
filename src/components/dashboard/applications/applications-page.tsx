"use client";

import { Columns3, List, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { LazyCareerLogOffer, useCareerLogOfferSettled } from "@/components/career-log/lazy-offer";
import { roomForApplication, useProTools, useTryProLabel } from "@/components/account/pro-tools";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { useOtto } from "@/components/mascot/use-otto";
import { Otto } from "@/components/mascot/otto";
import { OttoNote } from "@/components/mascot/otto-note";
import { useNow } from "@/components/studio/use-now";
import { applicationLimit } from "@/config/plans";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import { Lazy, preload, useLazy } from "@/components/ui/lazy";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { waitingTooLong } from "@/lib/applications/nudge";
import { latestOffer } from "@/lib/career-log/resume-lines";
import type { Application } from "@/lib/applications/schema";
import { tally, type VersionInfo } from "@/lib/applications/stats";
import type { ApplicationStatus } from "@/lib/applications/status";
import { browserStorage } from "@/lib/browser-storage";
import { resumeTitle } from "@/lib/resume/ops";
import { useResumeList } from "@/lib/store/resume-store";
import { emailActivity, emailTrackingPanel, skillGapsPanel, whatsWorkingPanel } from "../page-code";
import { LazyApplicationDialog } from "./lazy-application-dialog";
import type { ApplicationDialogTarget } from "./application-dialog";
import { ApplicationFilters } from "./application-filters";
import { ApplicationRow } from "./application-row";
import { sentLine } from "./copy";
import { ApplicationsBoard } from "./board/applications-board";
import { emailedCards, useEmailTracking } from "./email/use-email-tracking";
import { readView, toApplyItems, writeView, type BoardView } from "./board/board";
import { useBoardExtras } from "./board/use-board-extras";
import { NoReplyNudge } from "./no-reply-nudge";
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
  type ApplicationFilter,
} from "./view";
import { WinRate } from "./win-rate";

preload(skillGapsPanel);
preload(whatsWorkingPanel);
preload(emailTrackingPanel);

const PAGE_ROWS = 50;
const ANCHOR_PREFIX = applicationAnchor("");

// Views draw only after the list loads in the browser, so the server's "board" needn't match.
function initialView(linked: string | null): BoardView {
  if (typeof window === "undefined") return "board";
  return linked ? "list" : readView(browserStorage());
}

function linkedApplicationId(): string | null {
  if (typeof window === "undefined") return null;
  const hash = decodeURIComponent(window.location.hash.slice(1));
  return hash.startsWith(ANCHOR_PREFIX) ? hash.slice(ANCHOR_PREFIX.length) : null;
}

export function ApplicationsPage() {
  const t = useMessages("applications");
  const format = useFormat();
  const now = useNow();
  const resumes = useResumeList();
  const { status, items, retry } = useApplications();
  const [filter, setFilter] = useState<ApplicationFilter>("all");
  const [rows, setRows] = useState(PAGE_ROWS);
  const [linked] = useState(linkedApplicationId);
  const [view, setView] = useState<BoardView>(() => initialView(linked));
  const extras = useBoardExtras();
  const pro = useProTools();
  const [dialog, setDialog] = useState<ApplicationDialogTarget | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const opened = useRef(0);
  const full = pro === false && items.length >= applicationLimit("free");
  const tryPro = useTryProLabel();
  const otto = useOtto();
  const { tracking } = useEmailTracking();
  const trackingPanel = <Lazy loader={emailTrackingPanel} wanted props={{}} />;
  const trackingReady = useLazy(emailTrackingPanel, true) !== null;
  const emailed = useMemo(() => emailedCards(tracking, now), [tracking, now]);

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
  const offer = useMemo(() => latestOffer(items), [items]);
  const offerSettled = useCareerLogOfferSettled(offer !== null);
  const toApply = useMemo(
    () => toApplyItems(extras.savedJobs, resumes, items, extras.savedPosts),
    [extras.savedJobs, resumes, items, extras.savedPosts],
  );
  const waiting = toApply.length;

  const linkedIndex = linked ? shown.findIndex((application) => application.id === linked) : -1;
  const visibleRows = Math.max(rows, linkedIndex + 1);

  useEffect(() => {
    if (status !== "ready" || !linked) return;
    const row = document.getElementById(applicationAnchor(linked));
    if (!row) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
    row.querySelector<HTMLElement>("[aria-haspopup=menu]")?.focus({ preventScroll: true });
  }, [status, linked]);

  function pickView(next: BoardView) {
    setView(next);
    writeView(browserStorage(), next);
  }

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
    setAnnouncement(`${application.company}: ${t.statuses[next]}`);
    changeApplication(application, { status: next }).catch((error: unknown) => {
      setAnnouncement("");
      toast({
        title: t.page.cantChange,
        description: errorMessage(error),
        variant: "error",
      });
    });
  }

  function remove(target: Application) {
    hideApplication(target);
    undoToast({
      title: t.page.deleted,
      description: target.company,
      onUndo: () => restoreApplication(target),
      onCommit: (options) => {
        commitDelete(target, options).catch((error: unknown) =>
          toast({
            title: t.page.cantDelete,
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
            {t.page.title}
          </h1>
          <p className="mt-2 max-w-prose text-base/7 text-muted">
            {status === "ready" && items.length > 0
              ? fmt(t.page.soFar, {
                  applications: format.plural(t.count.applications, totals.applications),
                  interviews: format.plural(t.count.interviews, totals.interviews),
                })
              : t.page.intro}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status === "ready" && (items.length > 0 || waiting > 0) ? (
            <ViewToggle view={view} onChange={pickView} />
          ) : null}
          <Button onClick={() => void add()}>
            <Plus aria-hidden />
            {t.page.add}
          </Button>
        </div>
      </header>

      {full ? (
        <OttoNote live={false} message={otto.limit.tool("tracker", false)}>
          <Button onClick={() => openUpgradePrompt("tracker")}>{tryPro}</Button>
        </OttoNote>
      ) : null}

      {/* The nudge, tracking panel and offer sit above the list: it waits until they can draw. */}
      {status === "loading" ||
      (items.length > 0 && (!trackingReady || !offerSettled || now === 0)) ? (
        <LoadingState />
      ) : status === "error" ? (
        <Alert
          variant="error"
          title={t.page.didntLoad}
          action={
            <Button variant="secondary" size="sm" onClick={retry}>
              {t.page.tryAgain}
            </Button>
          }
        >
          {t.page.checkConnection}
        </Alert>
      ) : items.length === 0 && waiting === 0 ? (
        <>
          {trackingPanel}
          <EmptyState onAdd={() => void add()} />
          <Lazy loader={emailActivity} wanted={tracking !== null} props={{ applications: items }} />
        </>
      ) : (
        <>
          <NoReplyNudge stale={stale} />
          {trackingPanel}
          <LazyCareerLogOffer
            moment={offer !== null}
            job={offer ? { role: offer.role, company: offer.company } : undefined}
          />

          <section aria-labelledby="applications-heading" className="flex flex-col gap-4">
            <h2 id="applications-heading" className="sr-only">
              {view === "board" ? t.page.boardHeading : t.page.listHeading}
            </h2>
            <p aria-live="polite" className="sr-only">
              {announcement}
            </p>
            {view === "board" ? (
              <ApplicationsBoard
                applications={items}
                resumes={resumes}
                toApply={toApply}
                writings={extras.writings}
                emailed={emailed}
                now={now}
                pro={pro}
                onNeedsDetails={(resumeId) => {
                  opened.current += 1;
                  setDialog({ kind: "add", key: opened.current, resumeId });
                }}
              />
            ) : (
              <>
                <ApplicationFilters filter={filter} counts={counts} onChange={pickFilter} />
                <FolderCard
                  tab={t.filters[filter]}
                  tabEnd={
                    <span className="text-xs text-subtle tabular-nums">
                      {fmt(t.page.shown, { count: format.number(shown.length) })}
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
                          sent={sentLine(application, versions, t)}
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
                            {fmt(t.page.showMore, {
                              count: format.number(Math.min(PAGE_ROWS, shown.length - visibleRows)),
                            })}
                          </Button>
                        </li>
                      ) : null}
                    </ul>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 py-5">
                      <p className="text-sm/6 text-muted">{t.page.nothingHere}</p>
                      <Button variant="secondary" size="sm" onClick={() => pickFilter("all")}>
                        {t.page.showAll}
                      </Button>
                    </div>
                  )}
                </FolderCard>
              </>
            )}
          </section>

          <Lazy loader={emailActivity} wanted={tracking !== null} props={{ applications: items }} />
          <Lazy
            loader={whatsWorkingPanel}
            wanted={items.length > 0}
            props={{
              applications: items,
              resumes,
              variant: "page",
              onAddApplication: () => void add(),
            }}
          />
          {items.length > 0 ? <WinRate items={items} versions={versions} /> : null}
          <Lazy loader={skillGapsPanel} wanted props={{}} />
        </>
      )}

      <LazyApplicationDialog target={dialog} resumes={resumes} onClose={() => setDialog(null)} />
    </div>
  );
}

const VIEW_OPTIONS = [
  { value: "board", icon: Columns3 },
  { value: "list", icon: List },
] as const;

function ViewToggle({ view, onChange }: { view: BoardView; onChange: (view: BoardView) => void }) {
  const { page } = useMessages("applications");
  return (
    <div
      role="group"
      aria-label={page.view}
      className="flex gap-1 rounded-xl bg-surface-strong p-1"
    >
      {VIEW_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={view === option.value}
          onClick={() => onChange(option.value)}
          className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted -outline-offset-2 transition-colors hover:text-ink aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-control pointer-coarse:h-10"
        >
          <option.icon aria-hidden className="size-4" />
          {page[option.value]}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { page } = useMessages("applications");
  return (
    <section
      aria-labelledby="empty-applications"
      className="flex flex-col items-center rounded-3xl bg-surface px-6 py-14 text-center sm:py-20"
    >
      <Otto pose="point" size={128} />
      <h2 id="empty-applications" className="mt-6 font-sans text-lg/7 font-medium text-ink">
        {page.emptyTitle}
      </h2>
      <p className="mt-2 max-w-sm text-sm/6 text-pretty text-muted">{page.emptyBody}</p>
      <div className="mt-6">
        <Button onClick={onAdd}>
          <Plus aria-hidden />
          {page.addFirst}
        </Button>
      </div>
    </section>
  );
}

function LoadingState() {
  const { page } = useMessages("applications");
  return (
    <div aria-busy className="flex flex-col gap-8">
      <span className="sr-only" role="status">
        {page.loading}
      </span>
      <div aria-hidden className="flex flex-col">
        <Skeleton className="h-8 w-28 rounded-t-xl rounded-b-none" />
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl rounded-tl-none bg-border">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex flex-col gap-2 bg-surface p-4 sm:p-6">
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
