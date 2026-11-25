"use client";

import { CircleCheck, FileUp, ShieldCheck } from "lucide-react";
import { Dropzone } from "@/components/ui/dropzone";
import { formatBytes } from "@/components/ui/file-check";
import { Spinner } from "@/components/ui/spinner";
import { UPLOAD_ACCEPT } from "@/components/studio/upload/upload-handoff";
import { UPLOAD_LIMITS } from "@/config/plans";
import { fmt } from "@/i18n/format";
import { formatFor, type Format } from "@/i18n/intl";
import matchCheckEn from "@/i18n/messages/en/match-check";
import type { MatchCheckMessages } from "@/lib/match-check/copy";

export type UploadState =
  | { status: "idle" }
  | { status: "reading"; file: File }
  | { status: "read"; file: File; text: string; words: number }
  | { status: "failed"; message: string };

// The check route reads the file the way hiring software does and keeps nothing; it's rate-limited per device.
export async function readResumeFile(
  file: File,
  t: MatchCheckMessages = matchCheckEn,
): Promise<UploadState> {
  const { api, isApiError } = await import("@/lib/api/client");
  try {
    const { report } = await api.checkFile(file, file.name);
    const text = report.readText.trim();
    if (!text) return { status: "failed", message: t.upload.pictureOnly };
    return { status: "read", file, text, words: report.wordCount };
  } catch (error) {
    return { status: "failed", message: isApiError(error) ? error.message : t.upload.failed };
  }
}

export type ResumeUploadProps = {
  state: UploadState;
  invalid: boolean;
  onFile: (file: File) => void;
  onReject: (message: string) => void;
  t?: MatchCheckMessages;
  format?: Format;
};

export function ResumeUpload({
  state,
  invalid,
  onFile,
  onReject,
  t = matchCheckEn,
  format = formatFor("en"),
}: ResumeUploadProps) {
  const reading = state.status === "reading";
  const words = t.upload;
  return (
    <div className="flex flex-col gap-3">
      <Dropzone
        onFile={onFile}
        onReject={onReject}
        accept={UPLOAD_ACCEPT}
        maxBytes={UPLOAD_LIMITS.maxBytes}
        disabled={reading}
        label={words.label}
        className={invalid ? "min-h-40 border-fail sm:min-h-72" : "min-h-40 sm:min-h-72"}
      >
        {state.status === "reading" ? (
          <p className="flex items-center gap-2 text-sm text-ink" role="status">
            <Spinner />
            {fmt(words.reading, { name: state.file.name })}
          </p>
        ) : state.status === "read" ? (
          <>
            <CircleCheck className="size-6 text-pass" aria-hidden />
            <p className="font-medium break-all text-ink">{state.file.name}</p>
            <p className="text-sm text-muted">
              {fmt(words.read, { words: format.number(state.words) })}
            </p>
          </>
        ) : (
          <>
            <FileUp className="size-6 text-ink" aria-hidden />
            <p className="font-medium text-ink">{words.drop}</p>
            <p className="text-sm text-muted">
              {fmt(words.formats, { size: formatBytes(UPLOAD_LIMITS.maxBytes) })}
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
        {words.kept}
      </p>
    </div>
  );
}
