"use client";

import { Copy, Download, PanelsTopLeft } from "lucide-react";
import { useId, useState } from "react";
import { DemoNote } from "@/components/studio/demo-note";
import { copyText } from "@/components/studio/tailor/letter-panel";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Textarea } from "@/components/ui/textarea";
import { wordCount } from "@/lib/ai/writing-guards";
import { textLimit } from "@/lib/writings/schema";
import { formatDay } from "../applications/view";
import { jobLine, type LetterEntry } from "./entries";

export type LetterDialogProps = {
  entry: LetterEntry;
  open: boolean;
  source: string;
  now: number;
  rendering: boolean;
  canOpenInStudio: boolean;
  onClose: () => void;
  // Resolves false when the edit couldn't be kept; the text stays in the box to try again.
  onSave: (entry: LetterEntry, text: string) => Promise<boolean>;
  onDownload: (text: string) => void;
  onOpenInStudio: () => void;
};

type SaveState = "idle" | "saving" | "saved" | "failed";

const SAVE_LINES: Record<SaveState, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  failed: "Not saved yet",
};

// Edits are kept on blur and on close, so there's no Save button to forget. Mounted per opening,
// so the box always starts from the latest text.
export function LetterDialog({
  entry,
  open,
  source,
  now,
  rendering,
  canOpenInStudio,
  onClose,
  onSave,
  onDownload,
  onOpenInStudio,
}: LetterDialogProps) {
  const boxId = useId();
  const [text, setText] = useState(entry.text);
  const [save, setSave] = useState<SaveState>("idle");
  const letter = entry.kind === "letter";
  const kept = entry.writingId !== null || entry.copyId !== null;
  const changed = text.trim() !== "" && text.trim() !== entry.text.trim();

  async function settle() {
    if (!changed) return;
    setSave("saving");
    setSave((await onSave(entry, text)) ? "saved" : "failed");
  }

  function close() {
    void settle();
    onClose();
  }

  const title = jobLine(entry) || (letter ? "Cover letter" : "Answer");
  const meta = [source ? `From “${source}”` : null, formatDay(entry.createdAt, now)]
    .filter(Boolean)
    .join(" · ");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      size="lg"
      title={title}
      description={meta}
      footer={
        <>
          {canOpenInStudio ? (
            <Button
              variant="ghost"
              onClick={() => {
                void settle();
                onOpenInStudio();
              }}
            >
              <PanelsTopLeft aria-hidden />
              Open in the studio
            </Button>
          ) : null}
          {letter ? (
            <Button
              variant="secondary"
              loading={rendering}
              disabled={!text.trim()}
              onClick={() => onDownload(text)}
            >
              <Download aria-hidden />
              Download PDF
            </Button>
          ) : null}
          <Button
            disabled={!text.trim()}
            onClick={() => void copyText(text, letter ? "letter" : "answer")}
            data-autofocus
          >
            <Copy aria-hidden />
            Copy
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {entry.question ? (
          <div className="rounded-xl bg-surface-muted px-4 py-3">
            <Eyebrow>Question</Eyebrow>
            <p className="mt-1 text-sm/6 text-ink">{entry.question}</p>
          </div>
        ) : null}
        {kept ? null : (
          <Alert variant="warn" title="Not saved to your account">
            Copy it now: it will be gone when you leave this page.
          </Alert>
        )}
        {entry.demo ? <DemoNote /> : null}
        {entry.warnings.length ? (
          <Alert variant="warn" title="Check before you send it">
            <ul className="flex list-disc flex-col gap-1 pl-4">
              {entry.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </Alert>
        ) : null}
        <label htmlFor={boxId} className="sr-only">
          {letter ? "Cover letter" : "Answer"}
        </label>
        <Textarea
          id={boxId}
          autoResize
          maxLength={textLimit(entry.kind)}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setSave("idle");
          }}
          onBlur={() => void settle()}
          className="max-h-[55vh] text-base/7 sm:text-sm/6"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-subtle">
          <span className="tabular-nums">{wordCount(text)} words</span>
          <span role="status" className={save === "failed" ? "text-fail-ink" : undefined}>
            {SAVE_LINES[save]}
          </span>
        </div>
      </div>
    </Dialog>
  );
}
