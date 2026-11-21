"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { OTTO } from "@/components/mascot/lines";
import { Button } from "@/components/ui/button";
import { ProMark } from "@/components/ui/pro-mark";
import { cn } from "@/lib/utils";
import { LOCAL_IMPORT_ACCEPT, type LocalImportKind } from "./local-import-kinds";

export type StartOptionsProps = {
  onGuided: () => void;
  onLocalFile: (kind: LocalImportKind, file: File) => void;
  onScratch: () => void;
  onSample: () => void;
  guidedNeedsPro?: boolean;
  disabled?: boolean;
};

const LIST = "flex flex-col divide-y divide-border overflow-hidden rounded-2xl bg-surface";

export function StartOptions({
  onGuided,
  onLocalFile,
  onScratch,
  onSample,
  guidedNeedsPro = false,
  disabled = false,
}: StartOptionsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className={LIST}>
        <OptionRow
          title="No resume yet? Build with Otto"
          pro={guidedNeedsPro}
          description="Answer a few questions and I'll write the first draft."
          onClick={onGuided}
          disabled={disabled}
        />
      </div>

      <details className="group">
        <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 rounded-lg text-sm font-medium text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
          Other ways to start
          <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <ul className={cn("mt-2", LIST)}>
          <li>
            <FileRow
              kind="linkedin"
              title="Import from LinkedIn"
              description="Use the ZIP from LinkedIn's “Get a copy of your data”. It stays on your device."
              onFile={onLocalFile}
              disabled={disabled}
            />
          </li>
          <li>
            <FileRow
              kind="jsonresume"
              title="Import a JSON Resume"
              description="A resume.json file from jsonresume.org or another resume tool."
              onFile={onLocalFile}
              disabled={disabled}
            />
          </li>
          <li>
            <OptionRow
              title="Start from scratch"
              description={OTTO.upload.scratch}
              onClick={onScratch}
              disabled={disabled}
            />
          </li>
        </ul>
      </details>

      <p className="flex min-h-11 flex-wrap items-center gap-x-1 text-sm text-muted">
        No file handy?
        <Button
          variant="link"
          onClick={onSample}
          disabled={disabled}
          className="text-muted hover:text-ink pointer-coarse:min-h-11"
        >
          Try a sample resume
        </Button>
      </p>
    </div>
  );
}

type OptionRowProps = {
  title: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
  pro?: boolean;
};

function OptionRow({ title, description, onClick, disabled, pro = false }: OptionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left -outline-offset-2 transition-colors hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-60 sm:px-5"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
          {title}
          {pro ? <ProMark /> : null}
        </span>
        <span className="text-sm text-muted">{description}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden />
    </button>
  );
}

type FileRowProps = Omit<OptionRowProps, "onClick" | "pro"> & {
  kind: LocalImportKind;
  onFile: (kind: LocalImportKind, file: File) => void;
};

function FileRow({ kind, onFile, ...row }: FileRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <OptionRow {...row} onClick={() => inputRef.current?.click()} />
      <input
        ref={inputRef}
        type="file"
        accept={LOCAL_IMPORT_ACCEPT[kind]}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared so picking the same file again (after a fix) still fires a change.
          event.target.value = "";
          if (file) onFile(kind, file);
        }}
      />
    </>
  );
}
