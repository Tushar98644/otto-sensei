"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Pencil } from "lucide-react";
import { useProTools } from "@/components/account/pro-tools";
import { useMe } from "@/components/account/use-me";
import { EligibilityCard } from "@/components/eligibility/eligibility-card";
import { OTTO } from "@/components/mascot/lines";
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
  queueTailorSession,
  type TailorDraft,
} from "@/components/studio/tailor/session";
import { tailorIncluded } from "@/components/studio/tailor/tailor-access";
import { TailorResults } from "@/components/studio/tailor/tailor-results";
import { useTailorRun, type ResultPatch } from "@/components/studio/tailor/use-tailor";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { TrackView } from "@/lib/analytics/track-view";
import { preloadPdfRenderer } from "@/lib/pdf/render";
import type { Resume } from "@/lib/resume/schema";
import { useActiveResume, useStudioStore } from "@/lib/store/resume-store";
import { thisPeriod } from "@/lib/usage-copy";

const PRELOAD_DELAY_MS = 2_000;

// Editing the post re-renders the workspace on each keystroke; the results below don't change.
const Results = memo(TailorResults);

// Only Free accounts and signed-out visitors need the word check, so it loads when first shown.
const FreeMatch = dynamic(
  () => import("@/components/studio/tailor/free-match").then((module) => module.FreeMatch),
  { loading: () => <OttoWorking task="tailor" /> },
);

const FREE_OTTO = "Here's each skill this post names, and where your resume shows it.";
const FREE_NOTE =
  "Free shows which skills the post names and where you show them. Tailoring comes with Pro.";

function useUsageNote(): string | null {
  const { user, me, loading } = useMe();
  if (loading) return null;
  if (!user) return FREE_NOTE;
  const usage = me?.usage?.tailor;
  if (!usage) return null;
  if (usage.limit === 0) return FREE_NOTE;
  const left = Math.max(0, usage.limit - usage.used);
  return `${left} of ${usage.limit} tailored versions left ${thisPeriod(me?.period)}.`;
}

function jobLabel(title: string, company: string): string {
  const parts = [title.trim(), company.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "The job post you pasted";
}

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
  const usageNote = useUsageNote();
  const last = run.last;
  const result = last?.result ?? null;
  const savedChoices = last?.choices ?? null;
  const choices = useMemo(
    () => (result ? (savedChoices ?? defaultChoices(source, result)) : null),
    [source, result, savedChoices],
  );
  const [now] = useState(() => Date.now());
  const screener = useMemo(
    () => (result && choices ? buildScreener(source, result, choices, now) : null),
    [source, result, choices, now],
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

  let otto: string = OTTO.tailor.intro;
  if (run.loading) otto = OTTO.tailor.working;
  else if (run.error) otto = run.error;
  else if (free) otto = FREE_OTTO;
  else if (screener) otto = OTTO.tailor.screener(screener.counts.must, screener.counts.nice);

  const shownJob = free ?? run.last?.job ?? null;
  const postChanged = shownJob !== null && shownJob.text.trim() !== draft.text.trim();
  const folded =
    Boolean(free ?? (last && screener)) && !editingPost && !run.loading && !postChanged;
  let jobName = "";
  if (free) jobName = jobLabel(free.title, free.company);
  else if (last) {
    jobName = jobLabel(
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
        <Alert title={`Tailoring a copy of “${baseTitle}”`} className="bg-surface">
          This resume is already tailored, so I&apos;ll work from the original it came from. Each
          job gets its own copy.
        </Alert>
      ) : null}
      {folded ? (
        <Card className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-0.5">
            <Eyebrow>Compared with</Eyebrow>
            <p className="text-base/6 font-semibold text-pretty text-ink">{jobName}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditingPost(true)}
            className="self-start sm:self-auto"
          >
            <Pencil />
            Change the job post
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
        />
      </Card>
      {run.loading ? <OttoWorking task="tailor" /> : null}
      {free ? (
        <>
          {postChanged ? (
            <Alert variant="warn" title="This check is for the post you compared before">
              Compare again to check the post as it is now.
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
            Start over with another job
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
            <Alert variant="warn" title="These results are for the post you sent before">
              Compare again to update them for the post as it is now.
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
            Start over with another job
          </Button>
        </>
      ) : null}
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
        title="Add a resume first"
        description={OTTO.empty.noResumes}
        action={<Button onClick={() => setStep("upload")}>Upload a resume</Button>}
      />
    );
  }
  // Tailoring a copy would stack two jobs' changes, so work from the original while it exists.
  const source = base ?? active;
  const baseTitle = base ? base.title || "your original resume" : null;
  return <TailorWorkspace key={source.id} source={source} baseTitle={baseTitle} />;
}
