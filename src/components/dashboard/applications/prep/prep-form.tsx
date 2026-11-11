"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { errorMessage } from "@/components/account/errors";
import { upgradeLink } from "@/components/account/upgrade-interval";
import { refreshMe, useMe } from "@/components/account/use-me";
import { forgetPrepPacks } from "@/components/dashboard/interview/use-prep-packs";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { ROUTES } from "@/components/site/routes";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { nextPlan, PLANS, TEXT_LIMITS } from "@/config/plans";
import { api, isApiError } from "@/lib/api/client";
import type { InterviewPrep, PrepTarget } from "@/lib/insights/prep";
import { prepJobSource, prepResume } from "@/lib/insights/prep-view";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { thisPeriod } from "@/lib/usage-copy";

const MIN_POST_CHARS = 80;

type PrepFormProps = {
  target: PrepTarget;
  resumes: readonly Resume[];
  onDone: (prep: InterviewPrep, saved: boolean) => void;
  onCancel?: () => void;
};

export function PrepForm({ target, resumes, onDone, onCancel }: PrepFormProps) {
  const fallback = useMemo(() => prepResume(target, resumes), [target, resumes]);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const resume = resumes.find((item) => item.id === resumeId) ?? fallback;
  const source = useMemo(() => prepJobSource(target, resume), [target, resume]);
  const [pasting, setPasting] = useState(false);
  const [picking, setPicking] = useState(false);
  const { me, user } = useMe();
  const upgradeTo = nextPlan(user?.plan ?? "free");
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; upgrade: boolean } | null>(null);
  const [linkNote, setLinkNote] = useState("");

  const needsPaste = pasting || source.kind === "paste";
  const pastedTooShort = needsPaste && pasted.trim().length < MIN_POST_CHARS;

  async function jobText(): Promise<string | null> {
    if (needsPaste) return pasted.trim();
    if (source.kind === "saved") return source.text;
    try {
      return (await api.readJob({ url: source.url })).posting.text;
    } catch (caught) {
      setPasting(true);
      setLinkNote(`${errorMessage(caught)} Paste the job post below instead.`);
      return null;
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resume || busy || pastedTooShort) return;
    setBusy(true);
    setError(null);
    try {
      const text = await jobText();
      if (text === null) return;
      const { result } = await api.interview({
        applicationId: target.id,
        resume,
        job: { text, title: target.role, company: target.company },
      });
      void refreshMe();
      forgetPrepPacks();
      onDone(result.prep, result.saved);
    } catch (caught) {
      setError({
        message: errorMessage(caught),
        upgrade: isApiError(caught, "limit_reached") || isApiError(caught, "upgrade_required"),
      });
    } finally {
      setBusy(false);
    }
  }

  if (!resume) {
    return (
      <OttoNote message="I need a resume to build stories from. Add one, then come back here.">
        <Link href={ROUTES.studio} className="text-sm font-medium text-ink underline">
          Add a resume
        </Link>
      </OttoNote>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-6">
      <OttoNote
        message="I'll ask what an interviewer would, round by round, and outline stories from your own lines."
        meta={`Uses 1 cover letter or answer from ${thisPeriod(me?.period)}`}
        live={false}
      />
      <div className="flex flex-col gap-5 rounded-2xl bg-surface p-4 sm:p-6">
        {picking && resumes.length > 1 ? (
          <Field
            label="Resume to build stories from"
            hint={resume.id === target.resumeId ? "The version you sent." : undefined}
          >
            <Select value={resume.id} onChange={(event) => setResumeId(event.target.value)}>
              {resumes.map((item) => (
                <option key={item.id} value={item.id}>
                  {resumeTitle(item)}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <p className="text-sm/6 text-muted">
            Stories come from <span className="font-medium text-ink">{resumeTitle(resume)}</span>
            {resume.id === target.resumeId ? ", the version you sent." : "."}{" "}
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

        {needsPaste ? (
          <Field
            label="The job post"
            hint={linkNote || "Paste the whole post: what they do, what they ask for."}
            error={
              pasted.trim() !== "" && pastedTooShort
                ? "That's too short to be a job post. Paste all of it."
                : undefined
            }
          >
            <Textarea
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              rows={8}
              maxLength={TEXT_LIMITS.jobPostChars}
              placeholder="About the role…"
            />
          </Field>
        ) : (
          <p className="text-sm/6 text-muted">
            {source.kind === "saved"
              ? "Using the job post saved with your tailored copy."
              : "I'll read the job post from its link."}{" "}
            <button
              type="button"
              className="font-medium text-ink underline decoration-border-strong underline-offset-4"
              onClick={() => setPasting(true)}
            >
              Paste it instead
            </button>
          </p>
        )}

        {error ? (
          <Alert variant="error">
            {error.message}{" "}
            {error.upgrade && upgradeTo ? (
              <Link
                href={upgradeLink(me, upgradeTo)}
                className="font-medium underline"
              >
                Upgrade to {PLANS[upgradeTo].name}
              </Link>
            ) : null}
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
              Keep the current one
            </Button>
          ) : null}
          <Button type="submit" loading={busy} disabled={pastedTooShort}>
            Make my prep
          </Button>
        </div>
      </div>
      {busy ? <OttoWorking task="interview" /> : null}
    </form>
  );
}
