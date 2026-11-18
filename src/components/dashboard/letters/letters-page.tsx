"use client";

import { MessageSquareText, PenLine } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useProTools, useTryProLabel } from "@/components/account/pro-tools";
import { LazyUpgradeDialog } from "@/components/account/lazy-dialogs";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { saveLetterOnCopy } from "@/components/studio/tailor/copy-letter";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { api } from "@/lib/api/client";
import { useResumeList, useStudioHydrated } from "@/lib/store/resume-store";
import { outreachChange, type OutreachFields } from "../jobs/outreach-saved";
import { LazyWriteDialog } from "./lazy-write-dialog";
import { NewResumeMenu } from "../new-resume-menu";
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
  sourceTitle,
  studioTarget,
  withChange,
  type LetterEntry,
  type LetterFilter,
} from "./entries";
import { LetterDialog } from "./letter-dialog";
import { LETTER_FILTER_NAMES, LetterFilters } from "./letter-filters";
import { LetterRow } from "./letter-row";
import { fieldsOfEntry, OutreachView } from "./outreach-view";
import { useLetterPdf } from "./use-letter-pdf";
import { useWritings } from "./use-writings";
import type { WriteKind, Written } from "./write-dialog";

const count = new Intl.NumberFormat("en-US");
const PAGE_ROWS = 50;

// Kept mounted after closing, so focus returns before the next opening replaces it.
type Opening<T> = T & { key: number; open: boolean };

export function LettersPage() {
  const hydrated = useStudioHydrated();
  const resumes = useResumeList();
  const writings = useWritings();
  const applications = useApplications();
  const now = useNow();
  const actions = useStudioActions();
  const pdf = useLetterPdf(resumes);
  const locked = useProTools() === false;
  const tryPro = useTryProLabel();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [filter, setFilter] = useState<LetterFilter>("all");
  const [rows, setRows] = useState(PAGE_ROWS);
  const [composer, setComposer] = useState<Opening<{ kind: WriteKind }> | null>(null);
  const [viewer, setViewer] = useState<Opening<{ entryKey: string }> | null>(null);
  const [unsaved, setUnsaved] = useState<LetterEntry[]>([]);
  const openings = useRef(0);

  const entries = useMemo(
    () => [...unsaved, ...letterEntries(writings.items, resumes)],
    [unsaved, writings.items, resumes],
  );
  const counts = useMemo(() => kindCounts(entries), [entries]);
  const shown = useMemo(() => filterEntries(entries, filter), [entries, filter]);
  const viewing = viewer ? entries.find((entry) => entry.key === viewer.entryKey) : undefined;
  const ready = hydrated && writings.status === "ready";

  function start(kind: WriteKind) {
    if (locked) {
      setUpgradeOpen(true);
      return;
    }
    openings.current += 1;
    setComposer({ kind, key: openings.current, open: true });
  }

  function view(entryKey: string) {
    openings.current += 1;
    setViewer({ entryKey, key: openings.current, open: true });
  }

  function written(result: Written) {
    setComposer((current) => current && { ...current, open: false });
    const key = result.kind === "saved" ? `writing:${result.writing.id}` : result.entry.key;
    if (result.kind === "saved") writings.add(result.writing);
    else setUnsaved((list) => [result.entry, ...list]);
    pickFilter("all");
    if (result.show) view(key);
  }

  function pickFilter(next: LetterFilter) {
    setFilter(next);
    setRows(PAGE_ROWS);
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
      setUnsaved((list) => list.map((item) => (item.key === entry.key ? { ...item, text: value } : item)));
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
      toast({ title: "Couldn't save your edit", description: errorMessage(error), variant: "error" });
      return false;
    }
  }

  async function saveOutreach(entry: LetterEntry, fields: OutreachFields): Promise<boolean> {
    const before = writings.items.find((item) => item.id === entry.writingId);
    const change = outreachChange(fields, fieldsOfEntry(entry));
    if (!before?.outreach || !change) return true;
    writings.replace(withChange(before, change));
    try {
      const { writing } = await api.editWriting(before.id, change);
      writings.replace(writing);
      return true;
    } catch (error) {
      writings.replace(before);
      toast({ title: "Couldn't save your edit", description: errorMessage(error), variant: "error" });
      return false;
    }
  }

  function remove(entry: LetterEntry) {
    if (viewer?.entryKey === entry.key) setViewer({ ...viewer, open: false });
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
              toast({ title: "Couldn't delete it", description: errorMessage(error), variant: "error" });
            });
          }
        : undefined,
    });
  }

  const visibleRows = Math.min(rows, shown.length);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
            Letters and messages
          </h1>
          <p className="mt-2 max-w-prose text-base/7 text-muted">
            {ready && entries.length > 0
              ? `${kindsTally(counts)}, each written for one job.`
              : "Cover letters, answers to application questions and outreach messages, written only from your resume and the job post."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => start("answer")}>
            <MessageSquareText aria-hidden />
            Answer a question
          </Button>
          <Button onClick={() => start("letter")}>
            <PenLine aria-hidden />
            Write a letter
          </Button>
        </div>
      </header>

      {locked ? (
        <OttoNote live={false} message={OTTO.limit.none("letter", false)}>
          <Button onClick={() => setUpgradeOpen(true)}>{tryPro}</Button>
          {entries.length > 0 ? (
            <p className="text-sm/6 text-muted">
              What you wrote before stays here to read, copy and edit.
            </p>
          ) : null}
        </OttoNote>
      ) : null}

      {!ready && writings.status !== "error" ? (
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
      ) : entries.length === 0 ? (
        locked ? null : resumes.length === 0 ? (
          <div className="rounded-2xl bg-surface p-6 sm:p-8">
            <OttoNote live={false} message={OTTO.letters.noResume}>
              <NewResumeMenu actions={actions} />
            </OttoNote>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface p-6 sm:p-8">
            <OttoNote live={false} message={OTTO.letters.empty}>
              <Button onClick={() => start("letter")}>
                <PenLine aria-hidden />
                Write your first letter
              </Button>
              <Button variant="secondary" onClick={() => start("answer")}>
                <MessageSquareText aria-hidden />
                Answer a question
              </Button>
            </OttoNote>
          </div>
        )
      ) : (
        <section aria-labelledby="letters-heading" className="flex flex-col gap-4">
          <h2 id="letters-heading" className="sr-only">
            Your letters, answers and messages
          </h2>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <LetterFilters filter={filter} counts={counts} onChange={pickFilter} />
          </div>
          <FolderCard
            tab={LETTER_FILTER_NAMES[filter]}
            tabEnd={
              <span className="text-xs text-subtle tabular-nums">
                {count.format(shown.length)} shown
              </span>
            }
            bodyClassName="px-4 py-0 sm:px-6"
          >
            {shown.length > 0 ? (
              <ul className="divide-y divide-border">
                {shown.slice(0, visibleRows).map((entry) => (
                  <LetterRow
                    key={entry.key}
                    entry={entry}
                    source={sourceTitle(entry, resumes)}
                    application={entryApplication(entry, applications.items, resumes)}
                    now={now}
                    canOpenInStudio={studioFor(entry) !== null}
                    onOpen={() => view(entry.key)}
                    onDownload={() => void pdf.download(entry)}
                    onOpenInStudio={() => openInStudio(entry)}
                    onDelete={() => remove(entry)}
                  />
                ))}
                {shown.length > visibleRows ? (
                  <li className="py-3">
                    <Button variant="ghost" size="sm" onClick={() => setRows(visibleRows + PAGE_ROWS)}>
                      Show {Math.min(PAGE_ROWS, shown.length - visibleRows)} more
                    </Button>
                  </li>
                ) : null}
              </ul>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 py-5">
                <p className="text-sm/6 text-muted">Nothing of this kind yet.</p>
                <Button variant="secondary" size="sm" onClick={() => pickFilter("all")}>
                  Show all
                </Button>
              </div>
            )}
          </FolderCard>
          {writings.total > writings.items.length ? (
            <p className="text-sm/6 text-subtle">
              Showing your newest {count.format(writings.items.length)} saved of{" "}
              {count.format(writings.total)}.
            </p>
          ) : null}
        </section>
      )}

      {/* Free accounts can't write here, so they skip loading the dialog's code. */}
      {locked && composer === null ? null : (
        <LazyWriteDialog
          key={composer?.key}
          kind={composer?.kind ?? "letter"}
          open={composer?.open ?? false}
          resumes={resumes}
          onClose={() => setComposer((current) => current && { ...current, open: false })}
          onWritten={written}
        />
      )}
      {viewer && viewing?.kind === "outreach" ? (
        <OutreachView
          key={viewer.key}
          entry={viewing}
          open={viewer.open}
          source={sourceTitle(viewing, resumes)}
          now={now}
          onClose={() => setViewer({ ...viewer, open: false })}
          onSave={saveOutreach}
        />
      ) : viewer && viewing ? (
        <LetterDialog
          key={viewer.key}
          entry={viewing}
          open={viewer.open}
          source={sourceTitle(viewing, resumes)}
          now={now}
          rendering={pdf.rendering === viewing.key}
          canOpenInStudio={studioTarget(viewing, resumes) !== null}
          onClose={() => setViewer({ ...viewer, open: false })}
          onSave={saveEdit}
          onDownload={(text) => void pdf.download(viewing, text)}
          onOpenInStudio={() => openInStudio(viewing)}
        />
      ) : null}
      <LazyUpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="letter" />
    </div>
  );
}

function LoadingState() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <span className="sr-only" role="status">
        Loading your letters
      </span>
      <Skeleton aria-hidden className="h-11 w-56 rounded-xl" />
      <Skeleton aria-hidden className="h-64 rounded-2xl bg-surface" />
    </div>
  );
}
