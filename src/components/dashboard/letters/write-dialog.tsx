"use client";

import { MessageSquareText, PenLine, Upload, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useMe } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
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
import { api } from "@/lib/api/client";
import { normalizeJobUrl } from "@/lib/applications/schema";
import { resumeTitle } from "@/lib/resume/ops";
import { emptyResume, newId, type Resume } from "@/lib/resume/schema";
import { WRITING_LIMITS, type Writing, type WritingKind } from "@/lib/writings/schema";
import { useStudioActions } from "../use-studio-actions";
import { defaultResume, type LetterEntry } from "./entries";

export type WriteKind = Exclude<WritingKind, "outreach">;

export type Written =
  | { kind: "saved"; writing: Writing; show: boolean }
  | { kind: "unsaved"; entry: LetterEntry; show: boolean };

const EMPTY_DRAFT: TailorDraft = { title: "", company: "", text: "", link: "" };
const DRAFT_FIELDS = ["title", "company", "text", "link"] as const;
const NO_RESUME = emptyResume(0);

const COPY: Record<WriteKind, { title: string; note: string; label: string; icon: LucideIcon }> = {
  letter: {
    title: "Write a cover letter",
    note: OTTO.letters.write,
    label: "Write my letter",
    icon: PenLine,
  },
  answer: {
    title: "Answer an application question",
    note: OTTO.letters.answer,
    label: "Draft my answer",
    icon: MessageSquareText,
  },
};

export type WriteDialogProps = {
  kind: WriteKind;
  open: boolean;
  resumes: readonly Resume[];
  onClose: () => void;
  onWritten: (written: Written) => void;
  start?: { draft: TailorDraft; resumeId: string | null; applicationId: string };
};

export function WriteDialog({ kind, open, resumes, onClose, onWritten, start }: WriteDialogProps) {
  const { user, me, loading } = useMe();
  const actions = useStudioActions();
  const [draft, setDraft] = useState(start?.draft ?? EMPTY_DRAFT);
  const [question, setQuestion] = useState("");
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(start?.resumeId ?? null);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const resume = resumes.find((item) => item.id === resumeId) ?? defaultResume(resumes);
  const writing = useWriting(resume ?? NO_RESUME, draft);
  const copy = COPY[kind];
  const busy = writing.busy !== null || saving;
  const started = start?.draft ?? EMPTY_DRAFT;
  // Following the style link leaves the page, which would drop what's typed here and a letter still being written.
  const keepPage =
    busy ||
    question.trim() !== "" ||
    DRAFT_FIELDS.some((field) => (draft[field] ?? "") !== (started[field] ?? ""));
  const allowance = loading
    ? null
    : writingAllowance(user?.plan, me?.usage?.letter, me?.period, me?.billing.trial !== false);

  async function write() {
    if (!resume || busy) return;
    const asked = question.trim();
    if (kind === "answer" && asked.length < WRITING_LIMITS.question.min) {
      setQuestionError("Paste the question from the application first.");
      questionRef.current?.focus();
      return;
    }
    const result =
      kind === "letter" ? await writing.letter(resume) : await writing.answer(resume, asked);
    if (!result) return;

    const body = {
      kind,
      resumeId: resume.id,
      resumeTitle: resumeTitle(resume),
      company: draft.company.trim(),
      role: draft.title.trim(),
      jobUrl: normalizeJobUrl(draft.posting?.url ?? draft.link ?? "") ?? "",
      question: kind === "answer" ? asked : "",
      text: result.text,
      warnings: result.warnings,
      demo: result.demo,
      applicationId: start?.applicationId ?? null,
    };
    setSaving(true);
    try {
      const { writing: saved } = await api.saveWriting(body);
      onWritten({ kind: "saved", writing: saved, show: openRef.current });
    } catch (error) {
      toast({
        title: kind === "letter" ? "Couldn't keep this letter" : "Couldn't keep this answer",
        description: errorMessage(error),
        variant: "error",
      });
      onWritten({
        kind: "unsaved",
        show: openRef.current,
        entry: {
          ...body,
          key: `new:${newId()}`,
          createdAt: Date.now(),
          writingId: null,
          copyId: null,
          applicationId: body.applicationId,
        },
      });
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
        illustration={<OttoNote size="sm" live={false} message={resume ? copy.note : OTTO.letters.noResume} />}
      >
        {resume ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              {picking && resumes.length > 1 ? (
                <Field label="Resume to write from">
                  <Select value={resume.id} onChange={(event) => setResumeId(event.target.value)}>
                    {resumes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.tailor ? `${resumeTitle(item)} (tailored)` : resumeTitle(item)}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : (
                <p className="text-sm/6 text-muted">
                  Written from <span className="font-medium text-ink">{resumeTitle(resume)}</span>,
                  {start?.resumeId === resume.id ? " the version you sent." : " the resume you edited last."}{" "}
                  {resumes.length > 1 ? (
                    <button
                      type="button"
                      className="font-medium text-ink underline decoration-border-strong underline-offset-4"
                      onClick={() => setPicking(true)}
                    >
                      Use another resume
                    </button>
                  ) : null}
                </p>
              )}
              <WritingStyleHint linked={!keepPage} />
            </div>

            {kind === "answer" ? (
              <Field
                label="The question"
                hint="Paste it as the application asks it."
                error={questionError}
              >
                <VoiceTextarea
                  ref={questionRef}
                  value={question}
                  rows={3}
                  maxLength={WRITING_LIMITS.question.max}
                  placeholder="e.g. Why do you want to work here?"
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

            <JobForm
              draft={draft}
              onChange={setDraft}
              onSubmit={() => void write()}
              busy={busy}
              note={allowance}
              action={{ label: copy.label, icon: copy.icon }}
              checks={false}
            />

            {writing.busy !== null ? <OttoWorking task={kind} size="sm" /> : null}
            {writing.error ? <Alert variant="error">{writing.error.message}</Alert> : null}
          </div>
        ) : (
          <Button variant="secondary" className="self-start" onClick={actions.upload}>
            <Upload aria-hidden />
            Upload a resume
          </Button>
        )}
      </Dialog>
      {/* Outside the dialog: a native <dialog> inside another passes its close events up. */}
      {writing.dialogs}
    </>
  );
}
