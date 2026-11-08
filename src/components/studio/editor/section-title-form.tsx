"use client";

import { Check, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type SectionTitleFormProps = {
  initial: string;
  placeholder: string;
  maxLength: number;
  // `focus` is true when the person pressed Enter or Save, so focus goes back to the heading.
  // Clicking away saves too, and leaves focus where they clicked.
  onSave: (title: string, focus: boolean) => void;
  onCancel: () => void;
};

export function SectionTitleForm({
  initial,
  placeholder,
  maxLength,
  onSave,
  onCancel,
}: SectionTitleFormProps) {
  const [draft, setDraft] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Saving or cancelling unmounts the form; a blur on the way out must not save a second time.
  const done = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function finish(run: () => void) {
    if (done.current) return;
    done.current = true;
    run();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    finish(() => onSave(draft, true));
  }

  // Escape cancels the rename only; without stopPropagation it would also close a dialog around it.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    finish(onCancel);
  }

  function handleBlur(event: FocusEvent<HTMLFormElement>) {
    if (event.relatedTarget instanceof Node && formRef.current?.contains(event.relatedTarget))
      return;
    finish(() => onSave(draft, false));
  }

  return (
    <form ref={formRef} onSubmit={submit} onBlur={handleBlur} className="flex items-center gap-1">
      <Input
        ref={inputRef}
        value={draft}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label="Section title"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        aria-label="Save title"
        className="shrink-0"
      >
        <Check />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Cancel"
        onClick={() => finish(onCancel)}
        className="shrink-0"
      >
        <X />
      </Button>
    </form>
  );
}
