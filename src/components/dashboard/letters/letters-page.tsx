"use client";

import { PenLine } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useProTools } from "@/components/account/pro-tools";
import { LazyUpgradeDialog } from "@/components/account/lazy-dialogs";
import { useMe } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
import { saveLetterOnCopy } from "@/components/studio/tailor/copy-letter";
import { writingAllowance } from "@/components/studio/tailor/writing-allowance";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { api } from "@/lib/api/client";
import type { Application } from "@/lib/applications/schema";
import { resumeTitle } from "@/lib/resume/ops";
import { useResumeList, useStudioHydrated } from "@/lib/store/resume-store";
import { pluralize } from "@/lib/utils";
import type { WritingKind } from "@/lib/writings/schema";
import { outreachChange, type OutreachFields } from "../jobs/outreach-saved";
import { NewResumeMenu } from "../new-resume-menu";
import { offerLabel } from "../plan-slip";
import { useStudioActions } from "../use-studio-actions";
import { useApplications } from "../applications/use-applications";
import {
  entryApplication,
  filterEntries,
  jobLine,
  KIND_NAMES,
  kindCounts,
  kindsTally,
  letterEntries,
  letterResume,
  sourceTitle,
  studioTarget,
  withChange,
  type LetterEntry,
  type LetterFilter,
} from "./entries";
import { LetterGroupCard } from "./letter-group";
import { LETTER_FILTERS, LetterFilters } from "./letter-filters";
import { fieldsOfEntry, LetterReader } from "./letter-reader";
import { LettersFolder, OtherPaths } from "./letters-parts";
import { withRememberedPost } from "./post-memory";
import type { QuickState } from "./quick-actions";
import {
  emailSubject,
  hasKind,
  letterGroups,
  readyTargets,
  targetForGroup,
  type LetterGroup,
} from "./ready";
import { ReadyCard } from "./ready-card";
import { SampleLetter } from "./sample-letter";
import { LazyWriteDialog } from "./lazy-write-dialog";
import { useLetterFiles } from "./use-letter-files";
import { useOpenLetter } from "./use-open-letter";
import { quickResume, useQuickWrite } from "./use-quick-write";
import { useSavedJobs } from "./use-saved-jobs";
import { useWritings } from "./use-writings";
import type { Written } from "./write-dialog";
import { writeTargets, type WriteTarget } from "./write-targets";

const count = new Intl.NumberFormat("en-US");
const PAGE_GROUPS = 20;
const READY_SHOWN = 4;

// Kept mounted after closing, so focus returns before the next opening replaces it.
type Opening<T> = T & { key: number; open: boolean };
type Composer = { kind: WritingKind; fresh: boolean };

function groupApplication(
  group: LetterGroup,
  applications: readonly Application[],
  resumes: Parameters<typeof entryApplication>[2],
): Application | null {
  for (const entry of group.entries) {
    const found = entryApplication(entry, applications, resumes);
    if (found) return found;
  }
  return null;
}

export function LettersPage() {
  const hydrated = useStudioHydrated();
  const resumes = useResumeList();
  const writings = useWritings();
  const applications = useApplications();
  const now = useNow();
  const actions = useStudioActions();
  const files = useLetterFiles(resumes);
  const pro = useProTools();
  const locked = pro === false;
  const { me, user, loading: planLoading } = useMe();
  const tryPro = me?.billing.trial === false ? "See Pro" : offerLabel(true);
  const savedJobs = useSavedJobs(pro === true);
  const reader = useOpenLetter();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [filter, setFilter] = useState<LetterFilter>("all");
  const [shownGroups, setShownGroups] = useState(PAGE_GROUPS);
  const [allReady, setAllReady] = useState(false);
  const [composer, setComposer] = useState<Opening<Composer> | null>(null);
  const [unsaved, setUnsaved] = useState<LetterEntry[]>([]);
  const [justWritten, setJustWritten] = useState<string | null>(null);
  const openings = useRef(0);
  const linkChecked = useRef(false);
  const writtenId = useId();
  const otherId = useId();
  const quick = useQuickWrite(resumes, written);

  const entries = useMemo(
    () => [...unsaved, ...letterEntries(writings.items, resumes)],
    [unsaved, writings.items, resumes],
  );
  const counts = useMemo(() => kindCounts(entries), [entries]);
  const groups = useMemo(() => letterGroups(filterEntries(entries, filter)), [entries, filter]);
  const targets = useMemo(
    () => writeTargets(applications.items, savedJobs, resumes),
    [applications.items, savedJobs, resumes],
  );
  // Read each render: a post pasted a moment ago makes its job one click from then on.
  const known = targets.map(withRememberedPost);
  const ready = readyTargets(known, entries);
  const viewing = reader.key ? entries.find((entry) => entry.key === reader.key) : undefined;
  const loaded = hydrated && writings.status === "ready";
  const kinds = LETTER_FILTERS.filter((item) => item !== "all" && counts[item] > 0).length;
  const allowance = planLoading
    ? null
    : writingAllowance(user?.plan, me?.usage?.letter, me?.period, me?.billing.trial !== false);

  // A link to a letter that's gone opens the list instead.
  useEffect(() => {
    if (!loaded || linkChecked.current) return;
    linkChecked.current = true;
    if (reader.key && !entries.some((entry) => entry.key === reader.key)) reader.forget();
  }, [loaded, entries, reader]);

  function compose(kind: WritingKind, fresh = false) {
    if (locked) {
      setUpgradeOpen(true);
      return;
    }
    openings.current += 1;
    setComposer({ kind, fresh, key: openings.current, open: true });
  }

  function written(result: Written) {
    setComposer((current) => current && { ...current, open: false });
    const key = result.kind === "saved" ? `writing:${result.writing.id}` : result.entry.key;
    if (result.kind === "saved") writings.add(result.writing);
    else setUnsaved((list) => [result.entry, ...list]);
    setFilter("all");
    setJustWritten(key);
    if (result.show) reader.open(key, { replace: true });
  }

  function quickState(target: WriteTarget): QuickState {
    const run = quick.run?.value === target.value ? quick.run : null;
    return {
      run,
      blocked: quick.run !== null && run === null,
      ask: quick.asks[target.value] ?? null,
      error: quick.error?.value === target.value ? quick.error.message : null,
    };
  }

  function outreachFor(target: WriteTarget): string | null {
    return (
      entries.find((entry) => entry.kind === "outreach" && hasKind([entry], target, "outreach"))
        ?.key ?? null
    );
  }

  // A message is about the job, not the resume, so it has no studio step to open.
  const studioFor = (entry: LetterEntry) =>
    entry.kind === "outreach" ? null : studioTarget(entry, resumes);

  function openInStudio(entry: LetterEntry) {
    const target = studioFor(entry);
    if (target) actions.open(target.id, target.step);
  }

  async function saveEdit(entry: LetterEntry, text: string): Promise<boolean> {
    const value = text.trim();
    if (!value || value === entry.text.trim()) return true;
    if (entry.writingId === null && entry.copyId === null) {
      setUnsaved((list) =>
        list.map((item) => (item.key === entry.key ? { ...item, text: value } : item)),
      );
      return true;
    }
    const before = writings.items.find((item) => item.id === entry.writingId);
    if (before) writings.replace({ ...before, text: value });
    saveLetterOnCopy(entry.copyId, value);
    if (!before) return true;
    try {
      const { writing } = await api.editWriting(before.id, { text: value });
      writings.replace(writing);
      saveLetterOnCopy(entry.copyId, writing.text);
      return true;
    } catch (error) {
      writings.replace(before);
      saveLetterOnCopy(entry.copyId, entry.text);
      toast({
        title: "Couldn't save your edit",
        description: errorMessage(error),
        variant: "error",
      });
      return false;
    }
  }

  async function saveOutreach(entry: LetterEntry, fields: OutreachFields): Promise<boolean> {
    const change = outreachChange(fields, fieldsOfEntry(entry));
    if (!change) return true;
    if (entry.writingId === null) {
      setUnsaved((list) =>
        list.map((item) =>
          item.key === entry.key && item.outreach
            ? {
                ...item,
                text: change.text ?? item.text,
                outreach: {
                  ...item.outreach,
                  subject: change.subject ?? item.outreach.subject,
                  note: change.note ?? item.outreach.note,
                },
              }
            : item,
        ),
      );
      return true;
    }
    const before = writings.items.find((item) => item.id === entry.writingId);
    if (!before?.outreach) return true;
    writings.replace(withChange(before, change));
    try {
      const { writing } = await api.editWriting(before.id, change);
      writings.replace(writing);
      return true;
    } catch (error) {
      writings.replace(before);
      toast({
        title: "Couldn't save your edit",
        description: errorMessage(error),
        variant: "error",
      });
      return false;
    }
  }

  function remove(entry: LetterEntry) {
    if (reader.key === entry.key) reader.close();
    const saved = writings.items.find((item) => item.id === entry.writingId);
    if (saved) writings.hide(saved.id);
    saveLetterOnCopy(entry.copyId, "");
    const local = !saved && entry.copyId === null;
    if (local) setUnsaved((list) => list.filter((item) => item.key !== entry.key));
    undoToast({
      title: `${KIND_NAMES[entry.kind].label} deleted`,
      description: jobLine(entry) || undefined,
      onUndo: () => {
        if (saved) writings.restore(saved);
        saveLetterOnCopy(entry.copyId, entry.text);
        if (local) setUnsaved((list) => [entry, ...list]);
      },
      onCommit: saved
        ? ({ keepalive }) => {
            api.deleteWriting(saved.id, { keepalive }).catch((error: unknown) => {
              writings.restore(saved);
              toast({
                title: "Couldn't delete it",
                description: errorMessage(error),
                variant: "error",
              });
            });
          }
        : undefined,
    });
  }

  const sourceFor = (entry: LetterEntry) => sourceTitle(entry, resumes);
  const subjectFor = (entry: LetterEntry) =>
    emailSubject(entry.role, letterResume(entry, resumes).basics.name);
  const readyShown = allReady ? ready : ready.slice(0, READY_SHOWN);

  const dialogs = (
    <>
      {/* Free accounts can't write here, so they skip loading the dialog's code. */}
      {locked && composer === null ? null : (
        <LazyWriteDialog
          key={composer?.key}
          kind={composer?.kind ?? "letter"}
          fresh={composer?.fresh ?? false}
          open={composer?.open ?? false}
          resumes={resumes}
          applications={applications.items}
          savedJobs={savedJobs}
          onClose={() => setComposer((current) => current && { ...current, open: false })}
          onWritten={written}
        />
      )}
      {quick.dialogs}
      <LazyUpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="letter" />
    </>
  );

  if (loaded && viewing) {
    const target = targetForGroup(
      {
        key: viewing.key,
        company: viewing.company,
        role: viewing.role,
        jobUrl: viewing.jobUrl,
        applicationId: viewing.applicationId,
        entries: [viewing],
        newest: viewing.createdAt,
      },
      known,
    );
    const state = quickState(withRememberedPost(target));
    return (
      <>
        <LetterReader
          key={viewing.key}
          entry={viewing}
          resume={letterResume(viewing, resumes)}
          source={sourceFor(viewing)}
          application={entryApplication(viewing, applications.items, resumes)}
          rendering={files.rendering?.key === viewing.key ? files.rendering.file : null}
          canOpenInStudio={studioFor(viewing) !== null}
          again={locked ? { run: null, blocked: true, ask: null, error: null } : state}
          fresh={justWritten === viewing.key}
          onBack={reader.close}
          onSave={saveEdit}
          onSaveOutreach={saveOutreach}
          onPdf={(text) => files.download(viewing, "pdf", text)}
          onWord={(text) => files.download(viewing, "word", text)}
          onOpenInStudio={() => openInStudio(viewing)}
          onDelete={() => remove(viewing)}
          onWriteAgain={(post) =>
            locked
              ? setUpgradeOpen(true)
              : quick.start(withRememberedPost(target), viewing.kind, {
                  question: viewing.question,
                  post,
                })
          }
          onDismissAgain={() => quick.dismiss(target.value)}
        />
        {dialogs}
      </>
    );
  }

  const ownResume = resumes.length > 0;
  const showReady = pro === true && ownResume && ready.length > 0;
  const firstResume = ready[0] ? quickResume(ready[0], resumes) : null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
            Letters
          </h1>
          <p className="mt-2 max-w-prose text-base/7 text-pretty text-muted">
            {loaded && entries.length > 0
              ? `${kindsTally(counts)}, each written for one job.`
              : "Cover letters, answers to application questions and outreach messages, written only from your resume and the job post."}
          </p>
        </div>
        {pro === true && loaded && ownResume && (entries.length > 0 || showReady) ? (
          <Button variant="secondary" onClick={() => compose("letter")}>
            <PenLine aria-hidden />
            Write
          </Button>
        ) : null}
      </header>

      {(!loaded || (entries.length === 0 && planLoading)) && writings.status !== "error" ? (
        <LoadingState />
      ) : writings.status === "error" ? (
        <Alert
          variant="error"
          title="Your letters didn't load"
          action={
            <Button variant="secondary" size="sm" onClick={writings.retry}>
              Try again
            </Button>
          }
        >
          Check your connection, then try again.
        </Alert>
      ) : (
        <>
          {locked ? (
            <LettersFolder
              tab="Written for you"
              meta="comes with Pro"
              title="A letter for every job, in one click"
              detail={entries.length > 0 ? OTTO.letters.lockedKept : OTTO.letters.locked}
            >
              <Button size="lg" onClick={() => setUpgradeOpen(true)}>
                {tryPro}
              </Button>
            </LettersFolder>
          ) : !ownResume ? (
            <LettersFolder
              tab="Start here"
              title="First, a resume to write from"
              detail={OTTO.letters.noResume}
            >
              <NewResumeMenu actions={actions} />
            </LettersFolder>
          ) : showReady ? (
            <section aria-labelledby="ready-heading" className="flex flex-col gap-4">
              <LettersFolder
                tab="Ready to write"
                tabEnd={
                  <span className="text-xs text-subtle tabular-nums">
                    {pluralize(ready.length, "job")}
                  </span>
                }
                meta={firstResume ? `from “${resumeTitle(firstResume)}”` : undefined}
                title={
                  <span id="ready-heading">
                    {ready.length === 1
                      ? "One job has no letter yet."
                      : `${count.format(ready.length)} jobs have no letter yet.`}
                  </span>
                }
                detail={
                  <>
                    One click and I write it from your resume and the job post, nothing made up.
                    {allowance ? <span className="mt-1 block text-subtle">{allowance}</span> : null}
                  </>
                }
              />
              <ul className="grid gap-3 sm:gap-4 lg:grid-cols-2">
                {readyShown.map((target, index) => (
                  <ReadyCard
                    key={target.value}
                    target={target}
                    application={
                      target.applicationId
                        ? (applications.items.find((item) => item.id === target.applicationId) ??
                          null)
                        : null
                    }
                    source={(() => {
                      const resume = quickResume(target, resumes);
                      return resume ? resumeTitle(resume) : "";
                    })()}
                    now={now}
                    state={quickState(target)}
                    outreachKey={outreachFor(target)}
                    index={index}
                    onWrite={(kind, extra) => quick.start(target, kind, extra)}
                    onOpen={(key) => reader.open(key)}
                    onDismiss={() => quick.dismiss(target.value)}
                  />
                ))}
              </ul>
              {ready.length > READY_SHOWN ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => setAllReady(!allReady)}
                >
                  {allReady ? "Show fewer" : `Show all ${count.format(ready.length)}`}
                </Button>
              ) : null}
            </section>
          ) : entries.length === 0 ? (
            <LettersFolder tab="Start here" title="Nothing written yet" detail={OTTO.letters.empty}>
              <Button size="lg" onClick={() => compose("letter", true)}>
                <PenLine aria-hidden />
                Start writing
              </Button>
            </LettersFolder>
          ) : null}

          {locked && entries.length === 0 ? <SampleLetter /> : null}

          {entries.length > 0 ? (
            <section aria-labelledby={writtenId} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
                <h2
                  id={writtenId}
                  className="font-sans text-xs/4 font-medium tracking-widest text-subtle uppercase"
                >
                  Written so far
                </h2>
                {kinds > 1 ? (
                  <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                    <LetterFilters
                      filter={filter}
                      counts={counts}
                      onChange={(next) => {
                        setFilter(next);
                        setShownGroups(PAGE_GROUPS);
                      }}
                    />
                  </div>
                ) : null}
              </div>
              <ul className="flex flex-col gap-3 sm:gap-4">
                {groups.slice(0, shownGroups).map((group, index) => {
                  const target = withRememberedPost(targetForGroup(group, known));
                  return (
                    <LetterGroupCard
                      key={group.key}
                      group={group}
                      application={groupApplication(group, applications.items, resumes)}
                      now={now}
                      index={index}
                      sourceFor={sourceFor}
                      canOpenInStudio={(entry) => studioFor(entry) !== null}
                      subjectFor={subjectFor}
                      quick={
                        pro === true && ownResume
                          ? {
                              state: quickState(target),
                              // Jobs in Ready to write keep their Write letter key up there.
                              letter:
                                !group.entries.some((entry) => entry.kind === "letter") &&
                                !ready.some((item) => item.value === target.value),
                              outreachKey:
                                group.entries.find((entry) => entry.kind === "outreach")?.key ??
                                null,
                            }
                          : null
                      }
                      onOpen={(key) => reader.open(key)}
                      onPdf={(entry) => files.download(entry, "pdf")}
                      onOpenInStudio={openInStudio}
                      onDelete={remove}
                      onWrite={(kind, extra) => quick.start(target, kind, extra)}
                      onDismiss={() => quick.dismiss(target.value)}
                    />
                  );
                })}
              </ul>
              {groups.length > shownGroups ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => setShownGroups(shownGroups + PAGE_GROUPS)}
                >
                  Show {Math.min(PAGE_GROUPS, groups.length - shownGroups)} more
                </Button>
              ) : null}
              {writings.total > writings.items.length ? (
                <p className="px-1 text-sm/6 text-subtle">
                  Showing your newest {count.format(writings.items.length)} saved of{" "}
                  {count.format(writings.total)}.
                </p>
              ) : null}
            </section>
          ) : null}

          {pro === true && ownResume ? (
            <OtherPaths headingId={otherId} disabled={quick.run !== null} onPick={compose} />
          ) : null}
        </>
      )}
      {dialogs}
    </div>
  );
}

function LoadingState() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <span className="sr-only" role="status">
        Loading your letters
      </span>
      <Skeleton aria-hidden className="h-52 rounded-2xl bg-surface" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton aria-hidden className="h-44 rounded-2xl bg-surface" />
        <Skeleton aria-hidden className="h-44 rounded-2xl bg-surface max-lg:hidden" />
      </div>
    </div>
  );
}
