"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import dynamic from "next/dynamic";
import { Pencil } from "lucide-react";
import { useResumeAfterSignIn } from "@/components/account/account-gate";
import { useProTools } from "@/components/account/pro-tools";
import { useMe } from "@/components/account/use-me";
import { EligibilityCard } from "@/components/eligibility/eligibility-card";
import { Otto } from "@/components/mascot/otto";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { preparePdf, printedResume } from "@/components/studio/download/pdf-cache";
import { usePageSize } from "@/components/studio/download/use-page-size";
import { defaultChoices } from "@/components/studio/tailor/apply";
import { JobForm } from "@/components/studio/tailor/job-form";
import { buildScreener } from "@/components/studio/tailor/screener";
import {
  EMPTY_DRAFT,
  flushTailorSession,
  loadDraft,
  peekQueuedJob,
  queuedJobVersion,
  queueTailorSession,
  subscribeQueuedJob,
  type TailorDraft,
} from "@/components/studio/tailor/session";
import { SkipBar } from "@/components/studio/tailor/skip-bar";
import { tailorIncluded } from "@/components/studio/tailor/tailor-access";
import { TailorResults } from "@/components/studio/tailor/tailor-results";
import { TailorWait } from "@/components/studio/tailor/tailor-wait";
import {
  compareActionKind,
  useTailorRun,
  type ResultPatch,
} from "@/components/studio/tailor/use-tailor";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useFormat, useLocale, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import { TrackView } from "@/lib/analytics/track-view";
import { preloadPdfRenderer } from "@/lib/pdf/render";
import type { Resume } from "@/lib/resume/schema";
import { useActiveResume, useStudioStore } from "@/lib/store/resume-store";
import { screenerLine } from "@/components/studio/tailor/otto";
import { thisPeriodIn } from "@/components/studio/usage";

const PRELOAD_DELAY_MS = 2_000;

// Editing the post re-renders the workspace on each keystroke; the results below don't change.
const Results = memo(TailorResults);

// Only Free accounts and signed-out visitors need the word check, so it loads when first shown.
const FreeMatch = dynamic(
  () => import("@/components/studio/tailor/free-match").then((module) => module.FreeMatch),
  { loading: () => <OttoWorking task="tailor" /> },
);

type Tailor = Messages["studioTailor"];

function useUsageNote(t: Tailor): string | null {
  const { user, me, loading } = useMe();
  const usageWords = useMessages("studio").usage;
  if (loading) return null;
  if (!user) return t.free.usage;
  const usage = me?.usage?.tailor;
  if (!usage) return null;
  if (usage.limit === 0) return t.free.usage;
  const left = Math.max(0, usage.limit - usage.used);
  return fmt(t.left, { left, limit: usage.limit, period: thisPeriodIn(usageWords, me?.period) });
}

function jobLabel(t: Tailor, title: string, company: string): string {
  const parts = [title.trim(), company.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : t.pastedPost;
}

const noQueue = () => 0;

function TailorWorkspace({ source, baseTitle }: { source: Resume; baseTitle: string | null }) {
  const [queued] = useState(peekQueuedJob);
  const [draft, setDraft] = useState<TailorDraft>(() =>
    queued ? { ...EMPTY_DRAFT, link: queued.link } : loadDraft(),
  );
  const [editingPost, setEditingPost] = useState(false);
  // The post a Free account last compared, shown with the free word check instead of a paywall.
  const [freeJob, setFreeJob] = useState<TailorDraft | null>(null);
  const pro = useProTools();
  const { user } = useMe();
  const run = useTailorRun(source);
  const t = useMessages("studioTailor");
  const format = useFormat();
  const usageNote = useUsageNote(t);
  const last = run.last;
  const result = last?.result ?? null;
  const savedChoices = last?.choices ?? null;
  const choices = useMemo(
    () => (result ? (savedChoices ?? defaultChoices(source, result)) : null),
    [source, result, savedChoices],
  );
  const [now] = useState(() => Date.now());
  const lint = useMessages("lint");
  const locale = useLocale();
  const screener = useMemo(
    () =>
      result && choices
        ? buildScreener(source, result, choices, now, { words: t.reasons, lint, locale })
        : null,
    [source, result, choices, now, t, lint, locale],
  );

  useEffect(() => {
    queueTailorSession(draft, run.last);
  }, [draft, run.last]);
  // Leaving the step writes the queued draft at once.
  useEffect(() => flushTailorSession, []);

  const { update } = run;
  const lastId = last?.id ?? null;
  const patchLast = useCallback(
    (patch: ResultPatch) => {
      if (lastId) update(lastId, patch);
    },
    [update, lastId],
  );

  // Once a sign-in shows the plan includes tailoring, the free check makes way for the real one.
  const free = pro === true ? null : freeJob;

  let otto: string = t.otto.intro;
  if (run.loading) otto = t.otto.working;
  else if (run.error) otto = run.error;
  else if (run.cancelled) otto = t.otto.cancelled;
  else if (free) otto = t.free.otto;
  else if (screener) {
    otto = screenerLine(t.otto.screener, format, screener.counts.must, screener.counts.nice);
  }

  const showingResults = !free && Boolean(last && choices && screener);
  const shownJob = free ?? run.last?.job ?? null;
  const postChanged = shownJob !== null && shownJob.text.trim() !== draft.text.trim();
  const folded =
    Boolean(free ?? (last && screener)) && !editingPost && !run.loading && !postChanged;
  let jobName = "";
  if (free) jobName = jobLabel(t, free.title, free.company);
  else if (last) {
    jobName = jobLabel(
      t,
      last.job.title || last.result.job.title,
      last.job.company || last.result.job.company,
    );
  }

  async function compare() {
    setEditingPost(false);
    const job = draft;
    if (await tailorIncluded()) {
      setFreeJob(null);
      void run.start(job);
    } else {
      setFreeJob(job);
    }
  }
  // Signing in re-renders the workspace before it resolves, so the compare that follows sees the account.
  const compareNow = useRef(compare);
  useEffect(() => {
    compareNow.current = compare;
  });
  async function signInAndCompare() {
    if (await run.signIn()) void compareNow.current();
  }
  useResumeAfterSignIn(compareActionKind(source.id), () => void compareNow.current());
  const location = draft.posting?.location ?? "";
  const eligibility = useMemo(
    () =>
      folded && draft.text.trim() ? (
        <EligibilityCard location={location} text={draft.text} />
      ) : null,
    [folded, location, draft.text],
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <OttoNote message={otto} />
      {baseTitle ? (
        <Alert title={fmt(t.base.title, { title: baseTitle })} className="bg-surface">
          {t.base.note}
        </Alert>
      ) : null}
      {folded ? (
        <Card className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-0.5">
            <Eyebrow>{t.comparedWith}</Eyebrow>
            <p className="text-base/6 font-semibold text-pretty text-ink">{jobName}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditingPost(true)}
            className="self-start sm:self-auto"
          >
            <Pencil />
            {t.changePost}
          </Button>
        </Card>
      ) : null}
      <Card hidden={folded}>
        <JobForm
          draft={draft}
          onChange={setDraft}
          onSubmit={() => void compare()}
          busy={run.loading}
          note={usageNote}
          queued={queued}
          onPageLink={() => setEditingPost(true)}
          recent
        />
      </Card>
      {run.loading && run.startedAt !== null ? (
        <TailorWait startedAt={run.startedAt} onCancel={run.cancel} />
      ) : null}
      {free ? (
        <>
          {postChanged ? (
            <Alert variant="warn" title={t.stale.freeTitle}>
              {t.stale.freeNote}
            </Alert>
          ) : null}
          <FreeMatch
            source={source}
            jobText={free.text}
            onSignIn={user ? undefined : () => void signInAndCompare()}
          />
          <Button
            variant="ghost"
            onClick={() => {
              run.clear();
              setFreeJob(null);
              setDraft(EMPTY_DRAFT);
              setEditingPost(false);
            }}
            className="self-start"
          >
            {t.startOver}
          </Button>
        </>
      ) : last && choices && screener ? (
        <>
          <TrackView
            event="screener_viewed"
            props={{
              must: screener.counts.must.total,
              must_proven: screener.counts.must.proven,
              nice: screener.counts.nice.total,
              nice_proven: screener.counts.nice.proven,
            }}
            once={last.id}
          />
          {postChanged ? (
            <Alert variant="warn" title={t.stale.title}>
              {t.stale.note}
            </Alert>
          ) : null}
          <Results
            key={last.id}
            source={source}
            saved={last}
            choices={choices}
            screener={screener}
            onPatch={patchLast}
            beforeApply={eligibility}
          />
          <Button
            variant="ghost"
            onClick={() => {
              run.clear();
              setFreeJob(null);
              setDraft(EMPTY_DRAFT);
              setEditingPost(false);
            }}
            className="self-start"
          >
            {t.startOver}
          </Button>
        </>
      ) : null}
      {showingResults ? null : <SkipBar />}
      {run.dialogs}
    </div>
  );
}

export function TailorStep() {
  const active = useActiveResume();
  const base = useStudioStore((s) =>
    active?.tailor ? (s.resumes[active.tailor.baseResumeId] ?? null) : null,
  );
  const setStep = useStudioStore((s) => s.setStep);
  const pro = useProTools();
  const pageSize = usePageSize();
  const studio = useMessages("studio");
  const t = useMessages("studioTailor");
  // A job handed over while the step shows starts a fresh workspace, which reads it like Jobs does.
  const queueVersion = useSyncExternalStore(subscribeQueuedJob, queuedJobVersion, noQueue);

  useEffect(() => {
    const timer = window.setTimeout(preloadPdfRenderer, PRELOAD_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancel = () => {};
    const timer = window.setTimeout(() => {
      cancel = preparePdf(printedResume(active, pro), pageSize);
    }, PRELOAD_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      cancel();
    };
  }, [active, pro, pageSize]);

  if (!active) {
    return (
      <EmptyState
        illustration={<Otto pose="think" size={120} />}
        title={t.empty}
        description={studio.otto.noResumes}
        action={<Button onClick={() => setStep("upload")}>{studio.uploadResume}</Button>}
      />
    );
  }
  // Tailoring a copy would stack two jobs' changes, so work from the original while it exists.
  const source = base ?? active;
  const baseTitle = base ? base.title || t.base.fallback : null;
  return (
    <TailorWorkspace key={`${source.id}:${queueVersion}`} source={source} baseTitle={baseTitle} />
  );
}
