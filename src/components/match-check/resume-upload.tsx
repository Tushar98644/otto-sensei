"use client";

import { CircleCheck, FileUp, ShieldCheck } from "lucide-react";
import { Dropzone } from "@/components/ui/dropzone";
import { formatBytes } from "@/components/ui/file-check";
import { Spinner } from "@/components/ui/spinner";
import { UPLOAD_ACCEPT } from "@/components/studio/upload/upload-handoff";
import { UPLOAD_LIMITS } from "@/config/plans";

export type UploadState =
  | { status: "idle" }
  | { status: "reading"; file: File }
  | { status: "read"; file: File; text: string; words: number }
  | { status: "failed"; message: string };

const GENERIC = "Something went wrong reading that file. Try again, or paste the text instead.";
const PICTURE_ONLY =
  "That file is only a picture, so hiring software sees a blank page. Paste your resume text instead.";

const count = new Intl.NumberFormat("en-US");

// The check route reads the file the way hiring software does and keeps nothing; it's rate-limited per device.
export async function readResumeFile(file: File): Promise<UploadState> {
  const { api, isApiError } = await import("@/lib/api/client");
  try {
    const { report } = await api.checkFile(file, file.name);
    const text = report.readText.trim();
    if (!text) return { status: "failed", message: PICTURE_ONLY };
    return { status: "read", file, text, words: report.wordCount };
  } catch (error) {
    return { status: "failed", message: isApiError(error) ? error.message : GENERIC };
  }
}

export type ResumeUploadProps = {
  state: UploadState;
  invalid: boolean;
  onFile: (file: File) => void;
  onReject: (message: string) => void;
};

export function ResumeUpload({ state, invalid, onFile, onReject }: ResumeUploadProps) {
  const reading = state.status === "reading";
  return (
    <div className="flex flex-col gap-3">
      <Dropzone
        onFile={onFile}
        onReject={onReject}
        accept={UPLOAD_ACCEPT}
        maxBytes={UPLOAD_LIMITS.maxBytes}
        disabled={reading}
        label="Upload your resume, a PDF or Word file"
        className={invalid ? "min-h-72 border-fail" : "min-h-72"}
      >
        {state.status === "reading" ? (
          <p className="flex items-center gap-2 text-sm text-ink" role="status">
            <Spinner />
            Reading {state.file.name}…
          </p>
        ) : state.status === "read" ? (
          <>
            <CircleCheck className="size-6 text-pass" aria-hidden />
            <p className="font-medium break-all text-ink">{state.file.name}</p>
            <p className="text-sm text-muted">
              Read {count.format(state.words)} words. Choose another file to swap it.
            </p>
          </>
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
      {state.status === "failed" ? (
        <p role="alert" className="text-sm font-medium text-fail-ink">
          {state.message}
        </p>
      ) : null}
      <p className="flex items-start gap-2 text-sm text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-pass" aria-hidden />
        Your file is read on our server for its text, then thrown away. We don&apos;t store it.
      </p>
    </div>
  );
}
