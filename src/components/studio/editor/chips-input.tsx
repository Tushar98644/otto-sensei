"use client";

import { X } from "lucide-react";
import { useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from "react";
import { Label } from "@/components/ui/label";
import { splitSkillDraft, splitSkills } from "./edits";

// Room for a whole pasted skills line; each skill is trimmed to the schema's cap when it's added.
const MAX_DRAFT_CHARS = 2_000;

export type ChipsInputProps = {
  id: string;
  label: string;
  items: string[];
  onAdd: (items: string[]) => void;
  onRemove: (index: number) => void;
  // No room for more; the input says so instead of accepting text that would be dropped.
  full: boolean;
  // For screen readers only, when a heading right above already says what the list is.
  labelHidden?: boolean;
};

// Text left in the box is added on blur, so nothing typed is lost.
export function ChipsInput({
  id,
  label,
  items,
  onAdd,
  onRemove,
  full,
  labelHidden = false,
}: ChipsInputProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = `${id}-hint`;

  function commit(text: string) {
    const skills = splitSkills(text);
    if (skills.length > 0) onAdd(skills);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { done, draft: rest } = splitSkillDraft(event.target.value);
    if (done.length > 0) onAdd(done);
    setDraft(rest);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    commit(draft);
    setDraft("");
  }

  function handleBlur() {
    if (!draft.trim()) return;
    commit(draft);
    setDraft("");
  }

  function remove(index: number) {
    onRemove(index);
    // The chip's own button is about to disappear; keep focus in the field.
    inputRef.current?.focus();
  }

  function focusInput(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className={labelHidden ? "sr-only" : undefined}>
        {label}
      </Label>
      <div
        onClick={focusInput}
        className="flex flex-col gap-2 rounded-xl border border-border-strong bg-surface px-2 py-2 transition-colors focus-within:border-ink focus-within:ring-3 focus-within:ring-ink/15"
      >
        {items.length > 0 ? (
          <ul role="list" aria-label={label} className="flex flex-wrap gap-2">
            {items.map((item, index) => (
              <li
                // Imported lists can repeat a skill, so the text alone isn't a safe key.
                key={`${index}:${item}`}
                className="inline-flex h-8 max-w-full items-center gap-0.5 rounded-full bg-surface-muted pl-3 text-sm text-ink"
              >
                <span className="truncate">{item}</span>
                <button
                  type="button"
                  aria-label={`Remove ${item}`}
                  onClick={() => remove(index)}
                  className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors after:absolute after:-inset-1.5 hover:bg-surface-strong hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <input
          ref={inputRef}
          id={id}
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={full}
          maxLength={MAX_DRAFT_CHARS}
          aria-describedby={hintId}
          placeholder={
            full ? undefined : items.length > 0 ? "Add another" : "Type a skill, then press Enter"
          }
          autoComplete="off"
          className="h-9 w-full min-w-0 bg-transparent px-1 text-base text-ink outline-hidden placeholder:text-subtle disabled:cursor-not-allowed sm:text-sm"
        />
      </div>
      <p id={hintId} className="text-sm text-muted">
        {full
          ? "This group is full. Start a new group for more."
          : "Press Enter or type a comma after each one."}
      </p>
    </div>
  );
}
