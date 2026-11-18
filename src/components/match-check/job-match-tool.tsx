"use client";

import { ArrowRight, ClipboardPaste, FileUp, ScanSearch, ShieldCheck } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { IntentLink } from "@/components/site/intent-link";
import { ROUTES } from "@/components/site/routes";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PLANS, TEXT_LIMITS } from "@/config/plans";
import type { MatchCheck } from "@/lib/match-check/check";
import { matchOtto } from "@/lib/match-check/copy";
import { cn } from "@/lib/utils";
import { MatchResult } from "./match-result";
import { readResumeFile, ResumeUpload, type UploadState } from "./resume-upload";

type Mode = "paste" | "upload";
type Result = { check: MatchCheck; resume: string; job: string; file: File | null };

const MIN_RESUME_CHARS = 100;
const MIN_POST_CHARS = 80;

const loadChecker = () => import("@/lib/match-check/from-text");
// The studio's store loads only on intent, so the page itself stays light.
const loadOpener = () => import("./open-studio");

// Mounts only once a Free account with a resume already saved hands over another file.
const UpgradeHost = dynamic(() =>
  import("@/components/account/upgrade-prompt").then((module) => module.UpgradePromptHost),
);

function resumeProblem(mode: Mode, text: string, upload: UploadState): string | null {
  if (mode === "upload") {
    if (upload.status === "reading") return "Wait a moment while Otto reads your file.";
    return upload.status === "read" ? null : "Choose your resume file, or paste the text instead.";
  }
  const length = text.trim().length;
  if (length === 0) return "Paste your resume first.";
  if (length < MIN_RESUME_CHARS) return "That's a bit short. Paste your whole resume.";
  if (length > TEXT_LIMITS.resumeChars)
    return "That's longer than a resume. Paste just your resume.";
  return null;
}

function postProblem(text: string): string | null {
  const length = text.trim().length;
  if (length === 0) return "Paste the job post first.";
  if (length < MIN_POST_CHARS)
    return "That's a bit short. Paste the whole job post, not just the title.";
  if (length > TEXT_LIMITS.jobPostChars) {
    return `That's over ${TEXT_LIMITS.jobPostChars.toLocaleString("en-US")} characters. Cut the company intro or the benefits.`;
  }
  return null;
}

function Counter({ length, max }: { length: number; max: number }) {
  return (
    <span className={cn("tabular-nums", length > max && "font-medium text-fail-ink")}>
      {length.toLocaleString("en-US")} / {max.toLocaleString("en-US")}
    </span>
  );
}

export function JobMatchTool() {
  const [mode, setMode] = useState<Mode>("paste");
  const [resumeText, setResumeText] = useState("");
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });
  const [jobText, setJobText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [failed, setFailed] = useState(false);
  const resumeRef = useRef<HTMLTextAreaElement>(null);
  const jobRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const uploadId = useRef(0);

  const resumeError = submitted ? resumeProblem(mode, resumeText, upload) : null;
  const jobError = submitted ? postProblem(jobText) : null;
  const resumeUsed = mode === "upload" ? (upload.status === "read" ? upload.text : "") : resumeText;
  const stale = result !== null && (result.resume !== resumeUsed || result.job !== jobText);

  useEffect(() => {
    if (!result) return;
    resultRef.current?.scrollIntoView({ block: "start" });
    resultRef.current?.focus({ preventScroll: true });
  }, [result]);

  async function readFile(file: File) {
    const id = ++uploadId.current;
    setUpload({ status: "reading", file });
    const next = await readResumeFile(file);
    if (id === uploadId.current) setUpload(next);
  }

  async function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (resumeProblem(mode, resumeText, upload)) {
      if (mode === "paste") resumeRef.current?.focus();
      return;
    }
    if (postProblem(jobText)) {
      jobRef.current?.focus();
      return;
    }
    setChecking(true);
    setFailed(false);
    try {
      const { matchCheckFromText } = await loadChecker();
      const file = mode === "upload" && upload.status === "read" ? upload.file : null;
      setResult({
        check: matchCheckFromText(resumeUsed, jobText),
        resume: resumeUsed,
        job: jobText,
        file,
      });
    } catch {
      setFailed(true);
    } finally {
      setChecking(false);
    }
  }

  const resumeLength = resumeText.trim().length;
  const jobLength = jobText.trim().length;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <form onSubmit={(event) => void check(event)} noValidate className="flex flex-col gap-6">
        <div className="grid gap-3 sm:gap-6 lg:grid-cols-2">
          <Card>
            <Tabs
              value={mode}
              onValueChange={(value) => setMode(value === "upload" ? "upload" : "paste")}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base/6 font-semibold text-ink">Your resume</h2>
                <TabList aria-label="How to add your resume">
                  <Tab value="paste">
                    <ClipboardPaste aria-hidden />
                    Paste text
                  </Tab>
                  <Tab value="upload" onFocus={() => void import("@/lib/api/client")}>
                    <FileUp aria-hidden />
                    Upload a file
                  </Tab>
                </TabList>
              </div>
              <TabPanel value="paste" tabIndex={-1}>
                <Field
                  label="Resume text"
                  hideLabel
                  error={resumeError}
                  hint={
                    <span className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                      <span>Copy it from your file or your profile, headings and all.</span>
                      <Counter length={resumeLength} max={TEXT_LIMITS.resumeChars} />
                    </span>
                  }
                >
                  <Textarea
                    ref={resumeRef}
                    value={resumeText}
                    rows={12}
                    spellCheck={false}
                    placeholder="Paste your resume here"
                    className="min-h-72"
                    onFocus={() => void loadChecker()}
                    onChange={(event) => setResumeText(event.target.value)}
                  />
                </Field>
              </TabPanel>
              <TabPanel value="upload" tabIndex={-1}>
                <ResumeUpload
                  state={upload}
                  invalid={resumeError !== null}
                  onFile={(file) => void readFile(file)}
                  onReject={(message) => setUpload({ status: "failed", message })}
                />
                {resumeError && upload.status !== "failed" ? (
                  <p role="alert" className="mt-2 text-sm font-medium text-fail-ink">
                    {resumeError}
                  </p>
                ) : null}
              </TabPanel>
            </Tabs>
          </Card>
          <Card>
            <h2 className="text-base/6 font-semibold text-ink">The job post</h2>
            <Field
              label="Job post text"
              hideLabel
              error={jobError}
              hint={
                <span className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <span>Paste all of it: duties, requirements and nice-to-haves.</span>
                  <Counter length={jobLength} max={TEXT_LIMITS.jobPostChars} />
                </span>
              }
            >
              <Textarea
                ref={jobRef}
                value={jobText}
                rows={12}
                spellCheck={false}
                placeholder="Paste the job post here"
                className="min-h-72"
                onFocus={() => void loadChecker()}
                onChange={(event) => setJobText(event.target.value)}
              />
            </Field>
          </Card>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" loading={checking} className="w-full sm:w-auto">
            <ScanSearch />
            Check the match
          </Button>
          <p className="flex items-start gap-2 text-sm text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-pass" aria-hidden />
            {mode === "paste"
              ? "Pasted text is checked in your browser and never leaves it."
              : "The job post is checked in your browser. Nothing is stored."}
          </p>
        </div>
      </form>

      {failed ? (
        <Alert variant="error" title="The check didn't load">
          Check your connection, then try again.
        </Alert>
      ) : null}
      {result ? (
        <div
          ref={resultRef}
          tabIndex={-1}
          className="flex scroll-mt-24 flex-col gap-4 outline-hidden"
        >
          <OttoNote message={matchOtto(result.check)} />
          {stale ? (
            <Alert variant="warn" title="You've changed the text since this check">
              Check the match again to update it.
            </Alert>
          ) : null}
          <MatchResult check={result.check} footer={<StudioCta file={result.file} />} />
        </div>
      ) : null}
    </div>
  );
}

function StudioCta({ file }: { file: File | null }) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [upgrade, setUpgrade] = useState(false);

  function prepare() {
    router.prefetch(ROUTES.studio);
    void loadOpener().catch(() => undefined);
  }

  async function openWith(handed: File) {
    setOpening(true);
    try {
      const { openStudioWithFile } = await loadOpener();
      if (await openStudioWithFile(handed)) {
        router.push(ROUTES.studio);
        return;
      }
      setUpgrade(true);
      setOpening(false);
    } catch {
      window.location.assign(ROUTES.studio);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface-muted p-4 sm:p-6">
      <p className="text-base/6 font-semibold text-ink">Fix these lines with Otto</p>
      <p className="max-w-prose text-sm/6 text-muted">
        {file
          ? "The free studio opens with your file. "
          : "Upload your resume in the free studio. "}
        See what hiring software reads, fix lines by hand or with Otto ({PLANS.free.limits.fix} line
        fixes a month free) and download a clean PDF. On Pro, Otto tailors your resume to this job.
      </p>
      {file ? (
        <Button
          loading={opening}
          className="self-start"
          onPointerEnter={prepare}
          onFocus={prepare}
          onClick={() => void openWith(file)}
        >
          Fix these lines with Otto
          <ArrowRight />
        </Button>
      ) : (
        <IntentLink href={ROUTES.studio} className={buttonClasses({ className: "self-start" })}>
          Fix these lines with Otto
          <ArrowRight />
        </IntentLink>
      )}
      {upgrade ? <UpgradeHost /> : null}
    </div>
  );
}
