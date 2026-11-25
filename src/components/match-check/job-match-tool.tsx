"use client";

import { FileText, RotateCcw, ScanSearch, ShieldCheck } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TEXT_LIMITS } from "@/config/plans";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { formatFor } from "@/i18n/intl";
import matchCheckEn from "@/i18n/messages/en/match-check";
import type { MatchCheck } from "@/lib/match-check/check";
import { matchOtto, type MatchCheckMessages } from "@/lib/match-check/copy";
import { JOB_MATCH_PARAM } from "@/lib/seo-pages/paths";
import {
  jobDraft,
  jobLinkParam,
  postProblem,
  privacyNote,
  resumeProblem,
  type JobMode,
  type ResumeMode,
} from "./inputs";
import { JobPostCard } from "./job-post-card";
import { MatchResult } from "./match-result";
import type { StudioHandoff } from "./open-studio";
import { ResumeCard } from "./resume-card";
import { readResumeFile, type UploadState } from "./resume-upload";
import type { SampleTexts } from "./sample";
import { StudioCta } from "./studio-cta";
import { TextHint } from "./text-hint";
import { useJobLink } from "./use-job-link";

type Result = { check: MatchCheck; resume: string; job: string; handoff: StudioHandoff };
type Typed = { mode: ResumeMode; resume: string; jobMode: JobMode; job: string };

const loadChecker = () => import("@/lib/match-check/from-text");
const loadSample = () => import("./sample");

// The page passes its language's words and locale from the server; the browser gets no other messages.
export function JobMatchTool({
  t = matchCheckEn,
  locale = DEFAULT_LOCALE,
}: {
  t?: MatchCheckMessages;
  locale?: Locale;
}) {
  const format = formatFor(locale);
  const [mode, setMode] = useState<ResumeMode>("paste");
  const [resumeText, setResumeText] = useState("");
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });
  const [jobMode, setJobMode] = useState<JobMode>("paste");
  const [jobText, setJobText] = useState("");
  const [sample, setSample] = useState<SampleTexts | null>(null);
  const [typed, setTyped] = useState<Typed | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [failed, setFailed] = useState(false);
  const resumeRef = useRef<HTMLTextAreaElement>(null);
  const jobRef = useRef<HTMLTextAreaElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const uploadId = useRef(0);
  const focusPost = useRef(false);

  function showPost() {
    focusPost.current = true;
    setJobMode("paste");
  }

  const reader = useJobLink({
    onRead: setJobText,
    onPost: (text) => {
      setJobText(text);
      showPost();
    },
    t,
  });

  const resumeError = submitted ? resumeProblem(mode, resumeText, upload, t) : null;
  const jobError = submitted ? postProblem(jobText, t, format) : null;
  const resumeUsed = mode === "upload" ? (upload.status === "read" ? upload.text : "") : resumeText;
  const stale = result !== null && (result.resume !== resumeUsed || result.job !== jobText);
  const usingSample =
    sample !== null && mode === "paste" && resumeText === sample.resume && jobText === sample.job;

  useEffect(() => {
    if (!result) return;
    resultRef.current?.scrollIntoView({ block: "start" });
    resultRef.current?.focus({ preventScroll: true });
  }, [result]);

  useEffect(() => {
    if (!focusPost.current) return;
    focusPost.current = false;
    jobRef.current?.focus();
  });

  function readPastedLink(link: string) {
    setJobMode("link");
    reader.edit(link);
    void reader.readLink(link);
  }

  // Guide pages link here with ?job=<link>, so the post is read before the resume is in.
  const prefill = useEffectEvent(readPastedLink);
  useEffect(() => {
    // A tick later, so a client-side arrival has already put its address in the bar.
    const timer = window.setTimeout(() => {
      const link = jobLinkParam(new URLSearchParams(window.location.search).get(JOB_MATCH_PARAM));
      if (link) prefill(link);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function readFile(file: File) {
    const id = ++uploadId.current;
    setUpload({ status: "reading", file });
    const next = await readResumeFile(file, t);
    if (id === uploadId.current) setUpload(next);
  }

  async function run(resume: string, job: string, handoff: StudioHandoff) {
    setChecking(true);
    setFailed(false);
    try {
      const { matchCheckFromText } = await loadChecker();
      setResult({
        check: matchCheckFromText(resume, job, t.result.places.top),
        resume,
        job,
        handoff,
      });
    } catch {
      setFailed(true);
    } finally {
      setChecking(false);
    }
  }

  async function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const needsRead =
      jobMode === "link" &&
      reader.read?.ok !== true &&
      (reader.link.trim() !== "" || jobText.trim() === "");
    if (resumeProblem(mode, resumeText, upload, t)) {
      // The link is read meanwhile, so the post is ready by the time the resume is.
      if (needsRead) void reader.readLink();
      if (mode === "paste") resumeRef.current?.focus();
      return;
    }
    let job = jobText;
    let read = reader.latest;
    if (needsRead) {
      setChecking(true);
      const outcome = await reader.readLink();
      setChecking(false);
      if (!outcome) {
        linkRef.current?.focus();
        return;
      }
      job = outcome.text;
      read = outcome.read;
    }
    if (postProblem(job, t, format)) {
      if (jobMode === "paste") jobRef.current?.focus();
      else linkRef.current?.focus();
      return;
    }
    const file = mode === "upload" && upload.status === "read" ? upload.file : null;
    const draft = jobDraft(job, read);
    await run(
      resumeUsed,
      job,
      file
        ? { file, job: draft }
        : { text: resumeUsed, sample: resumeUsed === sample?.resume, job: draft },
    );
  }

  async function trySample() {
    try {
      const texts = (await loadSample()).sampleTexts();
      const own =
        resumeText.trim() !== "" ||
        jobText.trim() !== "" ||
        mode === "upload" ||
        jobMode === "link";
      setTyped(own ? { mode, resume: resumeText, jobMode, job: jobText } : null);
      // Stops a link still being read from replacing the sample post when it lands.
      reader.edit(reader.link);
      setSample(texts);
      setMode("paste");
      setJobMode("paste");
      setResumeText(texts.resume);
      setJobText(texts.job);
      setSubmitted(false);
      await run(texts.resume, texts.job, {
        text: texts.resume,
        sample: true,
        job: jobDraft(texts.job, null),
      });
    } catch {
      setFailed(true);
    }
  }

  function leaveSample() {
    setMode(typed?.mode ?? "paste");
    setResumeText(typed?.resume ?? "");
    setJobMode(typed?.jobMode ?? "paste");
    setJobText(typed?.job ?? "");
    setTyped(null);
    setResult(null);
    setSubmitted(false);
    resumeRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <form onSubmit={(event) => void check(event)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p className="flex items-start gap-2 text-sm text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-pass" aria-hidden />
            {privacyNote(mode, jobMode, t)}
          </p>
          {usingSample ? (
            <Button variant="ghost" size="sm" onClick={leaveSample}>
              <RotateCcw />
              {typed ? t.sample.putBack : t.sample.clear}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onPointerEnter={() => void loadSample().catch(() => undefined)}
              onFocus={() => void loadSample().catch(() => undefined)}
              onClick={() => void trySample()}
            >
              <FileText />
              {t.sample.try}
            </Button>
          )}
        </div>
        <div className="grid gap-3 sm:gap-6 lg:grid-cols-2">
          <ResumeCard
            mode={mode}
            onModeChange={setMode}
            text={resumeText}
            onTextChange={setResumeText}
            error={resumeError}
            hint={
              <TextHint
                text={t.resume.hint}
                length={resumeText.trim().length}
                max={TEXT_LIMITS.resumeChars}
                format={format}
              />
            }
            textRef={resumeRef}
            upload={upload}
            onFile={(file) => void readFile(file)}
            onReject={(message) => setUpload({ status: "failed", message })}
            onFocus={() => void loadChecker()}
            t={t}
            format={format}
          />
          <JobPostCard
            mode={jobMode}
            onModeChange={setJobMode}
            text={jobText}
            onTextChange={setJobText}
            error={jobError}
            hint={
              <TextHint
                text={t.post.hint}
                length={jobText.trim().length}
                max={TEXT_LIMITS.jobPostChars}
                format={format}
              />
            }
            textRef={jobRef}
            linkRef={linkRef}
            reader={reader}
            onFocus={() => void loadChecker()}
            onShowText={showPost}
            onPasteLink={readPastedLink}
            t={t}
          />
        </div>
        <div className="max-sm:sticky max-sm:bottom-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:z-10 max-sm:rounded-2xl max-sm:bg-surface max-sm:p-1.5 max-sm:shadow-float max-sm:ring-1 max-sm:ring-ink/5 sm:mt-2">
          <Button type="submit" size="lg" loading={checking} className="w-full sm:w-auto">
            <ScanSearch />
            {t.submit}
          </Button>
        </div>
      </form>

      {failed ? (
        <Alert variant="error" title={t.failed.title}>
          {t.failed.body}
        </Alert>
      ) : null}
      {result ? (
        <div
          ref={resultRef}
          tabIndex={-1}
          className="flex scroll-mt-24 flex-col gap-4 outline-hidden"
        >
          <OttoNote message={matchOtto(result.check, t, format)} />
          {stale ? (
            <Alert variant="warn" title={t.stale.title}>
              {t.stale.body}
            </Alert>
          ) : null}
          <MatchResult
            check={result.check}
            t={t}
            format={format}
            footer={<StudioCta handoff={result.handoff} t={t} format={format} />}
          />
        </div>
      ) : null}
    </div>
  );
}
