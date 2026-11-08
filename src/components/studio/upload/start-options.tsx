"use client";

import { ChevronRight } from "lucide-react";
import { useRef } from "react";
import { OTTO } from "@/components/mascot/lines";
import { LOCAL_IMPORTS, type LocalImportKind } from "./local-import";

export type StartOptionsProps = {
  onGuided: () => void;
  onLocalFile: (kind: LocalImportKind, file: File) => void;
  onScratch: () => void;
  onSample: () => void;
  disabled?: boolean;
};

// The other ways in, as rows on one sheet rather than a grid of icon cards.
export function StartOptions({
  onGuided,
  onLocalFile,
  onScratch,
  onSample,
  disabled = false,
}: StartOptionsProps) {
  return (
    <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl bg-surface">
      <li>
        <OptionRow
          title="Build with Otto"
          description="No resume yet? Answer a few questions and I'll write the first draft."
          onClick={onGuided}
          disabled={disabled}
        />
      </li>
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
      <li>
        <OptionRow
          title="Try a sample"
          description={OTTO.upload.sample}
          onClick={onSample}
          disabled={disabled}
        />
      </li>
    </ul>
  );
}

type OptionRowProps = {
  title: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
};

function OptionRow({ title, description, onClick, disabled }: OptionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left -outline-offset-2 transition-colors hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-60 sm:px-5"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-ink">{title}</span>
        <span className="text-sm text-muted">{description}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden />
    </button>
  );
}

type FileRowProps = Omit<OptionRowProps, "onClick"> & {
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
        accept={LOCAL_IMPORTS[kind].accept}
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
