"use client";

import { FileUp, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  roomForResume,
  unlockFeature,
  useOwnResumeCount,
  useProTools,
  useTryProLabel,
} from "@/components/account/pro-tools";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { openFormat } from "@/components/formats/apply-format";
import { ChosenFormatNote, useChosenFormat } from "@/components/formats/chosen-format-note";
import type { OttoLines } from "@/components/mascot/lines";
import { useOtto } from "@/components/mascot/use-otto";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Lazy, whenIdle } from "@/components/ui/lazy";
import { checkFile, formatBytes } from "@/components/ui/file-check";
import { RESUME_LIMITS, UPLOAD_LIMITS } from "@/config/plans";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import { track } from "@/lib/analytics/client";
import { api, isApiError } from "@/lib/api/client";
import { titleFromFileName } from "@/lib/resume/ops";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { useResumeList, useStudioStore } from "@/lib/store/resume-store";
import { noteReadByRules, noteReadWell } from "../import-notes";
import { uploadFailed } from "../otto";
import { clearGuidedDraft, guidedDraftLoader, guidedDraftRequested } from "../upload/guided-start";
import { clearHandedUpload, handedUpload, UPLOAD_ACCEPT } from "../upload/upload-handoff";
import type { LocalImportError } from "../upload/local-import";
import type { LocalImportKind } from "../upload/local-import-kinds";
import { RecentResumes } from "../upload/recent-resumes";
import { openSample } from "../upload/sample-start";
import { StartOptions } from "../upload/start-options";

const ACCEPT = UPLOAD_ACCEPT;

type UploadState =
  | { status: "idle" }
  | { status: "reading"; file: File }
  | { status: "failed"; message: string; file: File | null };

type Otto = Messages["studio"]["otto"];

export function UploadStep() {
  const studio = useMessages("studio");
  const ottoLines = useOtto();
  const t = studio.upload;
  const { format, addResume } = useChosenFormat();
  const setActive = useStudioStore((s) => s.setActive);
  const setStep = useStudioStore((s) => s.setStep);
  const resumes = useResumeList();
  const [handed] = useState(handedUpload);
  const [state, setState] = useState<UploadState>(() => {
    if (!handed) return { status: "idle" };
    const problem = checkFile(handed, { accept: ACCEPT, maxBytes: UPLOAD_LIMITS.maxBytes });
    return problem
      ? { status: "failed", message: uploadFailed(studio.otto, problem), file: null }
      : { status: "reading", file: handed };
  });
  const [guided, setGuided] = useState(guidedDraftRequested);
  // The import can't be aborted, so a result that lands after the user has moved on is dropped.
  const mounted = useRef(false);
  const handedStarted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    clearGuidedDraft();
    clearHandedUpload();
    return () => {
      mounted.current = false;
    };
  }, []);

  const reading = state.status === "reading";
  const pro = useProTools();

  // Only paid plans can draft with Otto, so only they fetch the form ahead of a click.
  useEffect(() => {
    if (pro === true) return whenIdle(() => void guidedDraftLoader.load().catch(() => {}));
  }, [pro]);
  const own = useOwnResumeCount();
  const full = pro === false && own >= RESUME_LIMITS.free;
  const tryPro = useTryProLabel();

  async function upload(file: File) {
    if (!(await roomForResume(() => void upload(file)))) {
      setState((current) => (current.status === "reading" ? { status: "idle" } : current));
      return;
    }
    setState({ status: "reading", file });
    try {
      const { resume, report, usedAI, basicReader, readWell } = await api.importFile(file);
      if (!mounted.current) return;
      if (readWell) noteReadWell(resume.id, file);
      else if (!usedAI) noteReadByRules(resume.id, basicReader === true);
      addResume({ ...resume, title: titleFromFileName(file.name) || resume.title }, report);
      track("resume_imported", { source: report.kind });
      setStep("review");
    } catch (error) {
      if (!mounted.current) return;
      setState({
        status: "failed",
        message: describeError(studio.otto, error, ottoLines.errors),
        file,
      });
    }
  }

  const startHanded = useEffectEvent(() => {
    if (!handed || handedStarted.current || state.status !== "reading") return;
    handedStarted.current = true;
    void upload(handed);
  });
  useEffect(() => startHanded(), []);

  async function importLocal(kind: LocalImportKind, file: File) {
    if (!(await roomForResume(() => void importLocal(kind, file)))) return;
    setState({ status: "reading", file });
    try {
      const { LocalImportError, readLocalImport } = await import("../upload/local-import");
      try {
        const resume = await readLocalImport(kind, file);
        if (!mounted.current) return;
        addResume(resume);
        track("resume_imported", { source: kind });
        setStep("fix");
      } catch (error) {
        if (!mounted.current) return;
        const message =
          error instanceof LocalImportError
            ? uploadFailed(studio.otto, localImportError(t, error))
            : ottoLines.errors.generic;
        setState({ status: "failed", message, file: null });
      }
    } catch {
      if (mounted.current)
        setState({ status: "failed", message: ottoLines.errors.generic, file: null });
    }
  }

  function finishDraft(resume: Resume) {
    addResume(resume);
    track("resume_imported", { source: "draft" });
    setStep("fix");
  }

  // Free has no drafts, so the trial is offered before the questions, not after them.
  async function startGuided() {
    void guidedDraftLoader.load().catch(() => {});
    if ((await unlockFeature("draft")) && (await roomForResume())) setGuided(true);
  }

  async function startFromScratch() {
    if (!(await roomForResume(() => void startFromScratch()))) return;
    addResume(emptyResume());
    track("resume_imported", { source: "scratch" });
    setStep("fix");
  }

  function trySample() {
    const sample = openSample();
    if (sample.created) track("resume_imported", { source: "sample" });
    // A format picked on a gallery is what the sample is for, so it opens on Download in that format.
    if (format) openFormat(useStudioStore.getState(), format, sample.id);
    else setStep("fix");
  }

  function openResume(id: string) {
    setActive(id);
    setStep("fix");
  }

  const otto = ottoFor(studio.otto, state);
  const retryFile = state.status === "failed" ? state.file : null;

  if (guided) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <Lazy
          loader={guidedDraftLoader}
          wanted
          props={{ onDrafted: finishDraft, onCancel: () => setGuided(false) }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <OttoNote
        message={full && state.status === "idle" ? ottoLines.limit.tool("resumes", false) : otto}
      >
        {retryFile ? (
          <Button variant="secondary" onClick={() => void upload(retryFile)}>
            <RotateCcw />
            {t.tryAgain}
          </Button>
        ) : full ? (
          <Button variant="secondary" onClick={() => openUpgradePrompt("resumes")}>
            {tryPro}
          </Button>
        ) : null}
      </OttoNote>

      {format ? <ChosenFormatNote format={format} onSample={trySample} disabled={reading} /> : null}

      <div className="flex flex-col gap-3">
        <Dropzone
          onFile={(file) => void upload(file)}
          onReject={(message) =>
            setState({ status: "failed", message: uploadFailed(studio.otto, message), file: null })
          }
          accept={ACCEPT}
          maxBytes={UPLOAD_LIMITS.maxBytes}
          disabled={reading}
          label={t.dropLabel}
          className="min-h-56"
        >
          {state.status === "reading" ? (
            <OttoWorking
              task="import"
              layout="stack"
              message={fmt(t.reading, { name: state.file.name })}
              detail={t.readingDetail}
              className="max-w-full"
            />
          ) : (
            <>
              <FileUp className="size-6 text-ink" aria-hidden />
              <p className="font-medium text-ink">
                <span className="pointer-coarse:hidden">{t.drop}</span>
                <span className="hidden pointer-coarse:inline">{t.choose}</span>
              </p>
              <p className="text-sm text-muted">
                {fmt(t.kinds, { size: formatBytes(UPLOAD_LIMITS.maxBytes) })}
              </p>
            </>
          )}
        </Dropzone>
        <p className="flex items-start gap-2 text-sm text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-pass" aria-hidden />
          {t.privacy}
        </p>
      </div>

      <StartOptions
        onGuided={() => void startGuided()}
        onLocalFile={(kind, file) => void importLocal(kind, file)}
        onScratch={() => void startFromScratch()}
        onSample={trySample}
        guidedNeedsPro={pro === false}
        disabled={reading}
      />

      {resumes.length > 0 ? (
        <RecentResumes resumes={resumes} onOpen={openResume} disabled={reading} />
      ) : null}
    </div>
  );
}

function ottoFor(otto: Otto, state: UploadState): string {
  switch (state.status) {
    case "idle":
      return otto.upload.idle;
    case "reading":
      return otto.upload.reading;
    case "failed":
      return state.message;
  }
}

function describeError(otto: Otto, error: unknown, errors: OttoLines["errors"]): string {
  if (isApiError(error, "rate_limited")) return errors.rateLimited;
  if (isApiError(error)) return uploadFailed(otto, error.message);
  return errors.generic;
}

function localImportError(t: Messages["studio"]["upload"], error: LocalImportError): string {
  const { problem } = error;
  if (problem.kind === "empty") return t.fileEmpty;
  if (problem.kind === "tooBig") return fmt(t.fileTooBig, { size: problem.size });
  return error.message;
}
