"use client";

import { Check, Pencil, Trash, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trashWithUndo } from "@/components/ui/trash-with-undo";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "./relative-time";
import { resumeLabel, tailoredLabel } from "./resume-label";

const TITLE_MAX = 200;

type Mode = "view" | "rename";

export type ResumeSwitcherItemProps = {
  resume: Resume;
  active: boolean;
  now: number;
  onSelect: () => void;
  onDeleted: () => void;
};

export function ResumeSwitcherItem({
  resume,
  active,
  now,
  onSelect,
  onDeleted,
}: ResumeSwitcherItemProps) {
  const updateResume = useStudioStore((s) => s.updateResume);
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLButtonElement>(null);
  const previousMode = useRef<Mode>("view");

  const title = resumeLabel(resume);
  const tailored = tailoredLabel(resume);

  useEffect(() => {
    const previous = previousMode.current;
    previousMode.current = mode;
    if (previous === mode) return;
    if (mode === "rename") {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (previous === "rename") {
      renameRef.current?.focus();
    }
  }, [mode]);

  function startRename() {
    setDraft(resume.title);
    setMode("rename");
  }

  function saveRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = draft.trim().slice(0, TITLE_MAX);
    if (next && next !== resume.title) updateResume(resume.id, (r) => ({ ...r, title: next }));
    setMode("view");
  }

  // Escape cancels the rename only; without preventDefault it would also close the menu.
  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    setMode("view");
  }

  function remove() {
    if (trashWithUndo(resume.id)) onDeleted();
  }

  if (mode === "rename") {
    return (
      <li>
        <form onSubmit={saveRename} className="flex items-center gap-1 p-1">
          <Input
            ref={inputRef}
            value={draft}
            maxLength={TITLE_MAX}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleRenameKeyDown}
            aria-label="Resume name"
            className="h-10"
          />
          <Button type="submit" variant="ghost" size="icon" aria-label="Save name">
            <Check />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Cancel" onClick={() => setMode("view")}>
            <X />
          </Button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex min-h-11 min-w-0 flex-1 flex-col items-start gap-1 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-muted",
          active && "bg-surface-muted",
        )}
      >
        <span className="flex w-full min-w-0 items-center gap-2">
          <span title={title} className="truncate text-sm font-medium text-ink">
            {title}
          </span>
          {active ? <Check className="size-4 shrink-0 text-ink" aria-hidden /> : null}
          {active ? <span className="sr-only">(open now)</span> : null}
        </span>
        <span className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {tailored ? <Badge className="max-w-full truncate bg-lavender text-ink">{tailored}</Badge> : null}
          <span>Edited {formatRelativeTime(resume.updatedAt, now)}</span>
        </span>
      </button>
      <Button
        ref={renameRef}
        variant="ghost"
        size="icon"
        aria-label={`Rename ${title}`}
        onClick={startRename}
        className="text-muted hover:text-ink"
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${title}`}
        onClick={remove}
        className="text-muted hover:text-fail-ink"
      >
        <Trash />
      </Button>
    </li>
  );
}
