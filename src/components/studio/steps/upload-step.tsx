"use client";

import { FileUp, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { roomForResume, useProTools, useTryProLabel } from "@/components/account/pro-tools";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { formatBytes } from "@/components/ui/file-check";
import { RESUME_LIMITS, UPLOAD_LIMITS } from "@/config/plans";
import { track } from "@/lib/analytics/client";
import { api, isApiError } from "@/lib/api/client";
import { createSampleResume } from "@/lib/resume/sample";
import { titleFromFileName } from "@/lib/resume/ops";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { useResumeList, useStudioStore } from "@/lib/store/resume-store";
import { noteReadByRules } from "../import-notes";
import { GuidedDraft } from "../upload/guided-draft";
import { LocalImportError, readLocalImport, type LocalImportKind } from "../upload/local-import";
import { RecentResumes } from "../upload/recent-resumes";
import { StartOptions } from "../upload/start-options";

const ACCEPT = ".pdf,.docx";

type UploadState =
  | { status: "idle" }
  | { status: "reading"; file: File }
  // `file` is kept for "Try again" when the server failed; null when the file itself was the problem.
  | { status: "failed"; message: string; file: File | null };

export function UploadStep() {
  const addResume = useStudioStore((s) => s.addResume);
  const setActive = useStudioStore((s) => s.setActive);
  const setStep = useStudioStore((s) => s.setStep);
  const resumes = useResumeList();
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [guided, setGuided] = useState(false);
  // The import can't be aborted, so a result that lands after the user has moved on is dropped.
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reading = state.status === "reading";
  // Free keeps RESUME_LIMITS.free resumes: every way in below asks roomForResume() first.
  const pro = useProTools();
  const full = pro === false && resumes.length >= RESUME_LIMITS.free;
  const tryPro = useTryProLabel();

  async function upload(file: File) {
    if (!(await roomForResume())) return;
    setState({ status: "reading", file });
    try {
      const { resume, report, usedAI, basicReader } = await api.importFile(file);
      if (!mounted.current) return;
      if (!usedAI) noteReadByRules(resume.id, basicReader === true);
      // Named after the file the person picked; addResume numbers it if the name is taken.
      addResume({ ...resume, title: titleFromFileName(file.name) || resume.title }, report);
      track("resume_imported", { source: report.kind });
      setStep("review");
    } catch (error) {
      if (!mounted.current) return;
      setState({ status: "failed", message: describeError(error), file });
    }
  }

  // LinkedIn exports and JSON Resume files are read in the browser, so there's no report to review.
  async function importLocal(kind: LocalImportKind, file: File) {
    if (!(await roomForResume())) return;
    setState({ status: "reading", file });
    try {
      const resume = await readLocalImport(kind, file);
      if (!mounted.current) return;
      addResume(resume);
      track("resume_imported", { source: kind });
      setStep("fix");
    } catch (error) {
      if (!mounted.current) return;
      const message = error instanceof LocalImportError ? OTTO.upload.failed(error.message) : OTTO.errors.generic;
      setState({ status: "failed", message, file: null });
    }
  }

  function finishDraft(resume: Resume) {
    addResume(resume);
    track("resume_imported", { source: "draft" });
    setStep("fix");
  }

  // Checked before the questions, so nobody writes a draft they can't keep.
  async function startGuided() {
    if (await roomForResume()) setGuided(true);
  }

  async function startFromScratch() {
    if (!(await roomForResume())) return;
    addResume(emptyResume());
    track("resume_imported", { source: "scratch" });
    setStep("fix");
  }

  async function trySample() {
    if (!(await roomForResume())) return;
    addResume(createSampleResume());
    track("resume_imported", { source: "sample" });
    setStep("fix");
  }

  function openResume(id: string) {
    setActive(id);
    setStep("fix");
  }

  const otto = ottoFor(state);
  const retryFile = state.status === "failed" ? state.file : null;

  if (guided) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <GuidedDraft onDrafted={finishDraft} onCancel={() => setGuided(false)} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <OttoNote message={full && state.status === "idle" ? OTTO.limit.tool("resumes", false) : otto}>
        {retryFile ? (
          <Button variant="outline" onClick={() => void upload(retryFile)}>
            <RotateCcw />
            Try again
          </Button>
        ) : full ? (
          <Button variant="outline" onClick={() => openUpgradePrompt("resumes")}>
            {tryPro}
          </Button>
        ) : null}
      </OttoNote>

      <div className="flex flex-col gap-3">
        <Dropzone
          onFile={(file) => void upload(file)}
          onReject={(message) =>
            setState({ status: "failed", message: OTTO.upload.failed(message), file: null })
          }
          accept={ACCEPT}
          maxBytes={UPLOAD_LIMITS.maxBytes}
          disabled={reading}
          label="Upload your resume, a PDF or Word file"
          className="min-h-56"
        >
          {state.status === "reading" ? (
            <OttoWorking
              task="import"
              layout="stack"
              message={`Otto is reading ${state.file.name}.`}
              detail="This takes a few seconds."
              className="max-w-full"
            />
          ) : (
            <>
              <FileUp className="size-6 text-ink" aria-hidden />
              <p className="font-medium text-ink">Drop your resume here, or choose a file</p>
              <p className="text-sm text-muted">
                PDF or Word (.docx), up to {formatBytes(UPLOAD_LIMITS.maxBytes)}
              </p>
            </>
          )}
        </Dropzone>
        <p className="flex items-start gap-2 text-sm text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-pass" aria-hidden />
          Your file is checked and then thrown away. We don&apos;t store it.
        </p>
      </div>

      <StartOptions
        onGuided={() => void startGuided()}
        onLocalFile={(kind, file) => void importLocal(kind, file)}
        onScratch={() => void startFromScratch()}
        onSample={() => void trySample()}
        disabled={reading}
      />

      {resumes.length > 0 ? (
        <RecentResumes resumes={resumes} onOpen={openResume} disabled={reading} />
      ) : null}
    </div>
  );
}

function ottoFor(state: UploadState): string {
  switch (state.status) {
    case "idle":
      return OTTO.upload.idle;
    case "reading":
      return OTTO.upload.reading;
    case "failed":
      return state.message;
  }
}

// Server messages are already written for people ("That file isn't a PDF or Word document."), so
// they go straight into Otto's line.
function describeError(error: unknown): string {
  if (isApiError(error, "rate_limited")) return OTTO.errors.rateLimited;
  if (isApiError(error)) return OTTO.upload.failed(error.message);
  return OTTO.errors.generic;
}
