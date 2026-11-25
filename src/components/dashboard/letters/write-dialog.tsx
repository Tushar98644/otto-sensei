"use client";

import { MessageSquareText, PenLine, Send, Upload, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useMe } from "@/components/account/use-me";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { WritingStyleHint } from "@/components/settings/writing-style-hint";
import { JobForm } from "@/components/studio/tailor/job-form";
import { writingAllowance } from "@/components/studio/tailor/writing-allowance";
import type { TailorDraft } from "@/components/studio/tailor/session";
import { useWriting } from "@/components/studio/tailor/use-writing";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { VoiceTextarea } from "@/components/ui/voice-field";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { rich } from "@/i18n/rich";
import { oneLine } from "@/lib/ai/text";
import { api } from "@/lib/api/client";
import type { Application } from "@/lib/applications/schema";
import type { SavedJob } from "@/lib/job-feed/types";
import { resumeTitle } from "@/lib/resume/ops";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { WRITING_LIMITS, type Writing, type WritingKind } from "@/lib/writings/schema";
import type { LettersMessages } from "../i18n";
import { useStudioActions } from "../use-studio-actions";
import { useTargetWords } from "./use-target-words";
import { defaultResume, type LetterEntry } from "./entries";
import { KindPicker } from "./kind-picker";
import { rememberPost, withRememberedPost } from "./post-memory";
import { unsavedEntry, writeBody, type WriteResult } from "./write-save";
import { ANOTHER_JOB, TargetPicker, WriteRow } from "./write-target-section";
import { firstTarget, readTargetPost, writeTargets, type WriteTarget } from "./write-targets";

export type WriteKind = WritingKind;

export type Written =
  | { kind: "saved"; writing: Writing; show: boolean }
  | { kind: "unsaved"; entry: LetterEntry; show: boolean };

const EMPTY_DRAFT: TailorDraft = { title: "", company: "", text: "", link: "" };
const DRAFT_FIELDS = ["title", "company", "text", "link"] as const;
const NO_RESUME = emptyResume(0);
const NO_APPLICATIONS: Application[] = [];
const NO_JOBS: SavedJob[] = [];

type Copy = { title: string; note: string; label: string; icon: LucideIcon; unkept: string };

function copyFor({ write, quick }: LettersMessages): Record<WriteKind, Copy> {
  return {
    letter: {
      title: write.letterTitle,
      note: write.letterNote,
      label: write.letterLabel,
      icon: PenLine,
      unkept: quick.unkept.letter,
    },
    answer: {
      title: write.answerTitle,
      note: write.answerNote,
      label: write.answerLabel,
      icon: MessageSquareText,
      unkept: quick.unkept.answer,
    },
    outreach: {
      title: write.outreachTitle,
      note: write.outreachNote,
      label: write.outreachLabel,
      icon: Send,
      unkept: quick.unkept.outreach,
    },
  };
}

export type WriteDialogProps = {
  kind: WriteKind;
  open: boolean;
  resumes: readonly Resume[];
  // Offered in the For list; left out when `start` already names the job.
  applications?: readonly Application[];
  savedJobs?: readonly SavedJob[];
  onClose: () => void;
  onWritten: (written: Written) => void;
  start?: WriteStart;
  // Opens on the paste form for a job not in the list.
  fresh?: boolean;
  // Writes as soon as it opens: only for a press made elsewhere, such as Letter in Otto for Chrome.
  autoWrite?: boolean;
};

export type WriteStart = {
  draft: TailorDraft;
  resumeId: string | null;
  applicationId: string | null;
};

function resumeNote(
  { write }: LettersMessages,
  resume: Resume,
  picked: string | null,
  target: WriteTarget | null,
  sent?: string | null,
) {
  if (resume.id === sent || (target?.resumeNote === "sent" && resume.id === target.resumeId)) {
    return write.sent;
  }
  if (target?.resumeNote === "tailored" && resume.id === target.resumeId) {
    return write.tailored;
  }
  return resume.id === picked ? "." : write.lastEdited;
}

export function WriteDialog({
  kind: firstKind,
  open,
  resumes,
  applications = NO_APPLICATIONS,
  savedJobs = NO_JOBS,
  onClose,
  onWritten,
  start,
  fresh = false,
  autoWrite = false,
}: WriteDialogProps) {
  const t = useMessages("letters");
  const words = copyFor(t);
  const targetWords = useTargetWords();
  const { user, me, loading } = useMe();
  const actions = useStudioActions();
  const [kind, setKind] = useState(firstKind);
  const [draft, setDraft] = useState(start?.draft ?? EMPTY_DRAFT);
  const [question, setQuestion] = useState("");
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(start?.resumeId ?? null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string | null>(fresh ? ANOTHER_JOB : null);
  // Posts read for a picked job, so writing again doesn't read the post again.
  const [posts, setPosts] = useState<Readonly<Record<string, string>>>({});
  const [pasteFor, setPasteFor] = useState<{ value: string; note: string } | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const queued = useRef<string | null>(null);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const targets = useMemo(
    () =>
      start
        ? []
        : writeTargets(applications, savedJobs, resumes, targetWords).map(withRememberedPost),
    [start, applications, savedJobs, resumes, targetWords],
  );
  const target =
    picked === ANOTHER_JOB
      ? null
      : (targets.find((item) => item.value === picked) ??
        (picked === null ? firstTarget(targets) : null));
  const pasting =
    target !== null && (target.post.kind === "paste" || pasteFor?.value === target.value);
  const known =
    target && !pasting
      ? target.post.kind === "saved"
        ? target.post.text
        : posts[target.value]
      : undefined;
  const job: TailorDraft =
    target && !pasting
      ? { title: target.title, company: target.company, link: target.url, text: known ?? "" }
      : target
        ? { ...draft, title: draft.title || target.title, company: draft.company || target.company }
        : draft;

  const targetResume = target?.resumeId
    ? resumes.find((item) => item.id === target.resumeId)
    : undefined;
  const resume =
    resumes.find((item) => item.id === resumeId) ?? targetResume ?? defaultResume(resumes);
  const writing = useWriting(resume ?? NO_RESUME, job);
  const copy = words[kind];
  const busy = writing.busy !== null || saving || reading;
  const started = start?.draft ?? EMPTY_DRAFT;
  // Following the style link leaves the page, which would drop what's typed here and a letter still being written.
  const keepPage =
    busy ||
    question.trim() !== "" ||
    DRAFT_FIELDS.some((field) => (draft[field] ?? "") !== (started[field] ?? ""));
  const allowance = loading
    ? null
    : writingAllowance(user?.plan, me?.usage?.letter, me?.period, me?.billing.trial !== false);

  // A post read for the picked job lands in state first, so the write sends it.
  useEffect(() => {
    if (queued.current === null || queued.current !== target?.value || !known) return;
    queued.current = null;
    void write();
  });

  const autoWrote = useRef(false);
  useEffect(() => {
    if (!autoWrite || autoWrote.current || !open || !resume || !job.text.trim()) return;
    autoWrote.current = true;
    void write();
  });

  function questionReady(): boolean {
    if (kind !== "answer" || oneLine(question).length >= WRITING_LIMITS.question.min) return true;
    setQuestionError(t.boxes.questionFirst);
    questionRef.current?.focus();
    return false;
  }

  function pick(value: string) {
    queued.current = null;
    setPicked(value);
    setPasteFor(null);
    setDraft(EMPTY_DRAFT);
  }

  function edit(next: TailorDraft) {
    setDraft(next);
    // Once something is typed, jobs that load later never swap the form for the list.
    if (picked === null && target === null) setPicked(ANOTHER_JOB);
  }

  async function writeFor(chosen: WriteTarget) {
    if (!resume || busy || !questionReady()) return;
    if (known) {
      void write();
      return;
    }
    setReading(true);
    let failure: string | null = null;
    let text = "";
    try {
      text = await readTargetPost(chosen.post);
    } catch (caught) {
      failure = errorMessage(caught);
    } finally {
      setReading(false);
    }
    if (!text) {
      setPasteFor({
        value: chosen.value,
        note: fmt(t.write.pasteBelow, { failure: failure ?? t.write.tooShort }),
      });
      setDraft({
        title: chosen.title,
        company: chosen.company,
        link: chosen.url,
        text: "",
        paste: true,
      });
      return;
    }
    queued.current = chosen.value;
    setPosts((current) => ({ ...current, [chosen.value]: text }));
  }

  async function produce(from: Resume, asked: string): Promise<WriteResult | null> {
    if (kind === "letter") {
      const letter = await writing.letter(from);
      return letter && { kind: "letter", ...letter };
    }
    if (kind === "answer") {
      const answer = await writing.answer(from, asked);
      return answer && { kind: "answer", ...answer };
    }
    const draft = await writing.outreach(from);
    return draft && { kind: "outreach", draft };
  }

  async function write() {
    if (!resume || writing.busy !== null || saving || !questionReady()) return;
    const result = await produce(resume, question.trim());
    if (!result) return;
    if (target && job.text.trim()) rememberPost(target, job.text);
    const body = writeBody(
      result,
      {
        title: job.title,
        company: job.company,
        url: job.posting?.url ?? job.link ?? "",
        jobId: target?.jobId ?? null,
        applicationId: target?.applicationId ?? start?.applicationId ?? null,
      },
      { id: resume.id, title: resumeTitle(resume) },
    );
    setSaving(true);
    try {
      const { writing: saved } = await api.saveWriting(body);
      onWritten({ kind: "saved", writing: saved, show: openRef.current });
    } catch (error) {
      toast({ title: words[body.kind].unkept, description: errorMessage(error), variant: "error" });
      onWritten({ kind: "unsaved", show: openRef.current, entry: unsavedEntry(body, Date.now()) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
        size="lg"
        title={copy.title}
        illustration={
          <OttoNote size="sm" live={false} message={resume ? copy.note : t.page.noResume} />
        }
      >
        {resume ? (
          <div className="flex flex-col gap-6">
            {start ? null : (
              <KindPicker
                kind={kind}
                disabled={busy}
                onChange={(next) => {
                  setKind(next);
                  setQuestionError(null);
                }}
              />
            )}

            <div className="flex flex-col gap-2">
              {picking && resumes.length > 1 ? (
                <Field label={t.write.resume}>
                  <Select value={resume.id} onChange={(event) => setResumeId(event.target.value)}>
                    {resumes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.tailor
                          ? fmt(t.write.tailoredOption, { title: resumeTitle(item) })
                          : resumeTitle(item)}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : (
                <p className="text-sm/6 text-muted">
                  {rich(
                    t.write.writtenFrom,
                    { b: (chunk) => <span className="font-medium text-ink">{chunk}</span> },
                    { title: resumeTitle(resume) },
                  )}
                  {resumeNote(t, resume, resumeId, target, start?.resumeId)}{" "}
                  {resumes.length > 1 ? (
                    <button
                      type="button"
                      className="font-medium text-ink underline decoration-border-strong underline-offset-4"
                      onClick={() => setPicking(true)}
                    >
                      {t.write.another}
                    </button>
                  ) : null}
                </p>
              )}
              <WritingStyleHint linked={!keepPage} />
            </div>

            {targets.length > 0 ? (
              <TargetPicker targets={targets} target={target} disabled={busy} onPick={pick} />
            ) : null}

            {kind === "answer" ? (
              <Field label={t.write.question} hint={t.write.questionHint} error={questionError}>
                <VoiceTextarea
                  ref={questionRef}
                  value={question}
                  rows={3}
                  maxLength={WRITING_LIMITS.question.max}
                  placeholder={t.boxes.questionPlaceholder}
                  onChange={(event) => {
                    setQuestion(event.target.value);
                    setQuestionError(null);
                  }}
                  onDictate={(text) => {
                    setQuestion(text);
                    setQuestionError(null);
                  }}
                />
              </Field>
            ) : null}

            {target && !pasting ? (
              <WriteRow
                action={copy}
                busy={busy}
                note={allowance}
                onWrite={() => void writeFor(target)}
              />
            ) : (
              <>
                {target && pasteFor?.value === target.value ? (
                  <Alert role="note">{pasteFor.note}</Alert>
                ) : null}
                <JobForm
                  key={target?.value ?? ANOTHER_JOB}
                  draft={job}
                  onChange={edit}
                  onSubmit={() => void write()}
                  busy={busy}
                  note={allowance}
                  action={{ label: copy.label, icon: copy.icon }}
                  checks={false}
                />
              </>
            )}

            {reading ? (
              <OttoWorking task="job" size="sm" />
            ) : writing.busy !== null ? (
              <OttoWorking task={kind} size="sm" />
            ) : null}
            {writing.error ? <Alert variant="error">{writing.error.message}</Alert> : null}
          </div>
        ) : (
          <Button variant="secondary" className="self-start" onClick={actions.upload}>
            <Upload aria-hidden />
            {t.write.upload}
          </Button>
        )}
      </Dialog>
      {/* Outside the dialog: a native <dialog> inside another passes its close events up. */}
      {writing.dialogs}
    </>
  );
}
