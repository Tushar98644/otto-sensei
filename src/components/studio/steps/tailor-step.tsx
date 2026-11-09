"use client";

import { useEffect, useMemo, useState } from "react";
import { useMe } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
import { Otto } from "@/components/mascot/otto";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { defaultChoices } from "@/components/studio/tailor/apply";
import { JobForm } from "@/components/studio/tailor/job-form";
import { buildScreener } from "@/components/studio/tailor/screener";
import {
  EMPTY_DRAFT,
  loadDraft,
  peekQueuedJob,
  saveTailorSession,
  type TailorDraft,
} from "@/components/studio/tailor/session";
import { TailorResults } from "@/components/studio/tailor/tailor-results";
import { useTailorRun } from "@/components/studio/tailor/use-tailor";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TrackView } from "@/lib/analytics/track-view";
import { preloadPdfRenderer } from "@/lib/pdf/render";
import type { Resume } from "@/lib/resume/schema";
import { useActiveResume, useStudioStore } from "@/lib/store/resume-store";
import { thisPeriod } from "@/lib/usage-copy";

// The renderer is big; fetching it while the user reads results makes the download step instant.
const PRELOAD_DELAY_MS = 2_000;

function useUsageNote(): string | null {
  const { user, me, loading } = useMe();
  if (loading) return null;
  const trial = me?.billing.trial !== false;
  if (!user) return OTTO.limit.none("tailor", trial);
  const usage = me?.usage?.tailor;
  if (!usage) return null;
  if (usage.limit === 0) return OTTO.limit.none("tailor", trial);
  const left = Math.max(0, usage.limit - usage.used);
  return `${left} of ${usage.limit} tailored versions left ${thisPeriod(me?.period)}.`;
}

function TailorWorkspace({ source, baseTitle }: { source: Resume; baseTitle: string | null }) {
  // A job sent from the Jobs tab replaces whatever post this tab had open.
  const [queued] = useState(peekQueuedJob);
  const [draft, setDraft] = useState<TailorDraft>(() =>
    queued ? { ...EMPTY_DRAFT, link: queued.link } : loadDraft(),
  );
  const run = useTailorRun(source);
  const usageNote = useUsageNote();
  const last = run.last;
  const result = last?.result ?? null;
  const savedChoices = last?.choices ?? null;
  // Keyed on the result and the choices only: typing a letter changes `last` on every keystroke.
  const choices = useMemo(
    () => (result ? (savedChoices ?? defaultChoices(source, result)) : null),
    [source, result, savedChoices],
  );
  // Recomputed from the resume, so an added line moves the count at once.
  const screener = useMemo(
    () => (result && choices ? buildScreener(source, result, choices) : null),
    [source, result, choices],
  );

  useEffect(() => {
    saveTailorSession(draft, run.last);
  }, [draft, run.last]);

  let otto: string = OTTO.tailor.intro;
  if (run.loading) otto = OTTO.tailor.working;
  else if (run.error) otto = run.error;
  else if (screener) otto = OTTO.tailor.screener(screener.counts.must, screener.counts.nice);

  const postChanged = run.last !== null && run.last.job.text.trim() !== draft.text.trim();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <OttoNote message={otto} />
      {baseTitle ? (
        <Alert title={`Tailoring a copy of “${baseTitle}”`} className="bg-surface">
          This resume is already tailored, so I&apos;ll work from the original it came from. Each
          job gets its own copy.
        </Alert>
      ) : null}
      <Card>
        <JobForm
          draft={draft}
          onChange={setDraft}
          onSubmit={() => void run.start(draft)}
          busy={run.loading}
          note={usageNote}
          queued={queued}
        />
      </Card>
      {run.loading ? <OttoWorking task="tailor" /> : null}
      {last && choices && screener ? (
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
          <TailorResults
            // A fresh result starts with fresh choices.
            key={last.id}
            source={source}
            saved={last}
            choices={choices}
            screener={screener}
            onPatch={(patch) => run.update(last.id, patch)}
          />
          <Button
            variant="ghost"
            onClick={() => {
              run.clear();
              setDraft(EMPTY_DRAFT);
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

  useEffect(() => {
    const timer = window.setTimeout(preloadPdfRenderer, PRELOAD_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

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
  // Tailoring a tailored copy would stack one job's changes on another's, so work from the original
  // while it still exists.
  const source = base ?? active;
  const baseTitle = base ? base.title || "your original resume" : null;
  return <TailorWorkspace key={source.id} source={source} baseTitle={baseTitle} />;
}
