"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useRef, useState, type FormEvent } from "react";
import { errorMessage } from "@/components/account/errors";
import { useProTools } from "@/components/account/pro-tools";
import { upgradeLink } from "@/components/account/upgrade-interval";
import { refreshMe, useMe } from "@/components/account/use-me";
import { forgetPrepPacks } from "@/components/dashboard/interview/use-prep-packs";
import { PREP_START_PARAM } from "@/components/dashboard/interview/view";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { ROUTES } from "@/components/site/routes";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { VoiceTextarea } from "@/components/ui/voice-field";
import { nextPlan, PLANS, TEXT_LIMITS } from "@/config/plans";
import { api, isApiError } from "@/lib/api/client";
import type { InterviewPrep, PrepTarget } from "@/lib/insights/prep";
import { prepJobSource, prepResume } from "@/lib/insights/prep-view";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { prepAllowance, startsByItself } from "./prep-start";

const MIN_POST_CHARS = 80;
const QUIET_LINK = "font-medium text-ink underline decoration-border-strong underline-offset-4";

type PrepFormProps = {
  target: PrepTarget;
  resumes: readonly Resume[];
  onDone: (prep: InterviewPrep, saved: boolean) => void;
  onCancel?: () => void;
  // The link carried ?start=1; without it the form waits, filled in, for one click.
  autoStart?: boolean;
};

type Run = { id: number; phase: "reading" | "writing" };

// Leaving mid-run and coming back mounts a new form while the first run may still count, so each job starts by itself once.
const startedByItself = new Set<string>();

function dropStartParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PREP_START_PARAM)) return;
  url.searchParams.delete(PREP_START_PARAM);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function PrepForm({ target, resumes, onDone, onCancel, autoStart = false }: PrepFormProps) {
  const fallback = useMemo(() => prepResume(target, resumes), [target, resumes]);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const resume = resumes.find((item) => item.id === resumeId) ?? fallback;
  const source = useMemo(() => prepJobSource(target, resume), [target, resume]);
  const [pasting, setPasting] = useState(false);
  const [picking, setPicking] = useState(false);
  const { me, user } = useMe();
  const pro = useProTools();
  const upgradeTo = nextPlan(user?.plan ?? "free");
  const [pasted, setPasted] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const [tried, setTried] = useState(false);
  const [stoppedLate, setStoppedLate] = useState(false);
  const [error, setError] = useState<{ message: string; upgrade: boolean } | null>(null);
  const [linkNote, setLinkNote] = useState("");
  const runs = useRef(0);

  const busy = run !== null;
  const needsPaste = pasting || source.kind === "paste";
  const pastedTooShort = needsPaste && pasted.trim().length < MIN_POST_CHARS;
  const usage = me?.usage?.letter;
  const allowance = prepAllowance(usage, me?.period);
  const facts = {
    asked: autoStart,
    usage,
    resumes: resumes.length,
    jobKnown: !needsPaste,
  };
  const firstVisit = !tried && !onCancel && !startedByItself.has(target.id);
  const auto = firstVisit && startsByItself({ ...facts, pro });
  // While the plan loads, prep that would start by itself waits here instead of flashing the form.
  const deciding = firstVisit && pro === null && startsByItself({ ...facts, pro: true });

  async function jobText(live: () => boolean): Promise<string | null> {
    if (needsPaste) return pasted.trim();
    if (source.kind === "saved") return source.text;
    try {
      return (await api.readJob({ url: source.url })).posting.text;
    } catch (caught) {
      if (live()) {
        setPasting(true);
        setLinkNote(`${errorMessage(caught)} Paste the job post below instead.`);
      }
      return null;
    }
  }

  async function make() {
    if (!resume || run || pastedTooShort) return;
    runs.current += 1;
    const id = runs.current;
    const live = () => runs.current === id;
    let sent = false;
    setTried(true);
    setStoppedLate(false);
    setError(null);
    setRun({ id, phase: needsPaste || source.kind === "saved" ? "writing" : "reading" });
    try {
      const text = await jobText(live);
      if (text === null || !live()) return;
      setRun({ id, phase: "writing" });
      sent = true;
      const { result } = await api.interview({
        applicationId: target.id,
        resume,
        job: { text, title: target.role, company: target.company },
      });
      forgetPrepPacks(target.id, result.saved);
      if (live()) onDone(result.prep, result.saved);
    } catch (caught) {
      if (!live()) return;
      setError({
        message: errorMessage(caught),
        upgrade: isApiError(caught, "limit_reached") || isApiError(caught, "upgrade_required"),
      });
    } finally {
      if (sent) void refreshMe();
      if (live()) setRun(null);
    }
  }

  // Changing the resume or the job mid-run stops waiting for it; the server may still count it.
  function change(next: "resume" | "paste") {
    setTried(true);
    if (run) {
      if (run.phase === "writing") setStoppedLate(true);
      runs.current += 1;
      setRun(null);
    }
    if (next === "resume") setPicking(true);
    else setPasting(true);
  }

  const startByItself = useEffectEvent(() => {
    dropStartParam();
    startedByItself.add(target.id);
    void make();
  });
  useEffect(() => {
    if (!auto) return;
    const timer = window.setTimeout(startByItself, 0);
    return () => window.clearTimeout(timer);
  }, [auto]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void make();
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

  const resumeLine = (
    <p className="text-sm/6 text-muted">
      Stories come from <span className="font-medium text-ink">{resumeTitle(resume)}</span>
      {resume.id === target.resumeId ? ", the version you sent." : "."}{" "}
      {resumes.length > 1 ? (
        <button type="button" className={QUIET_LINK} onClick={() => change("resume")}>
          Use another resume
        </button>
      ) : null}
    </p>
  );

  const jobLine = needsPaste ? null : (
    <p className="text-sm/6 text-muted">
      {source.kind === "saved"
        ? "Using the job post saved with your tailored copy."
        : "I'll read the job post from its link."}{" "}
      <button type="button" className={QUIET_LINK} onClick={() => change("paste")}>
        Paste it instead
      </button>
    </p>
  );

  if (auto || deciding || busy) {
    return (
      <div className="flex flex-col gap-5 rounded-2xl bg-surface p-4 sm:p-6">
        <OttoWorking
          task={run?.phase === "reading" ? "job" : "interview"}
          delayMs={deciding ? undefined : 0}
        />
        <div className="flex flex-col gap-1">
          {resumeLine}
          {jobLine}
          {allowance ? <p className="text-sm/6 text-subtle">{allowance}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <OttoNote
        message="I'll ask what an interviewer would, round by round, and outline stories from your own lines."
        live={false}
      />
      <div className="flex flex-col gap-5 rounded-2xl bg-surface p-4 sm:p-6">
        {stoppedLate ? (
          <Alert role="note">
            Stopped waiting for that prep. It had already started, so it still counts toward your allowance.
          </Alert>
        ) : null}
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
          resumeLine
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
            <VoiceTextarea
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              onDictate={setPasted}
              rows={8}
              maxLength={TEXT_LIMITS.jobPostChars}
              placeholder="About the role…"
            />
          </Field>
        ) : (
          jobLine
        )}

        {error ? (
          <Alert variant="error">
            {error.message}{" "}
            {error.upgrade && upgradeTo ? (
              <Link href={upgradeLink(me, upgradeTo)} className="font-medium underline">
                Upgrade to {PLANS[upgradeTo].name}
              </Link>
            ) : null}
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {allowance ? <p className="text-sm/6 text-subtle">{allowance}</p> : <span />}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {onCancel ? (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Keep the current one
              </Button>
            ) : null}
            <Button type="submit" disabled={pastedTooShort}>
              Make my prep
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
