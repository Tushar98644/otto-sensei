"use client";

import { ArrowDown, ArrowUp, GripVertical, Plus, RotateCcw, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { webHref } from "@/lib/portfolio/content";
import { cn } from "@/lib/utils";

// Values save as they change (the store autosaves). "Automatic" fields show Otto's value until
// the owner types over it.

export function AutoNote({ auto, onReset }: { auto: boolean; onReset?: () => void }) {
  if (auto) return <span className="text-xs/5 text-subtle">Filled in for you</span>;
  if (!onReset) return null;
  return (
    <button
      type="button"
      onClick={onReset}
      className="inline-flex items-center gap-1 rounded-md text-xs/5 text-muted underline decoration-border-strong underline-offset-2 hover:text-ink"
    >
      <RotateCcw className="size-3" aria-hidden />
      Fill in for me
    </button>
  );
}

type TextFieldProps = {
  label: string;
  // null: automatic, showing `auto`.
  value: string | null;
  auto?: string;
  max: number;
  multiline?: boolean;
  placeholder?: string;
  hint?: string;
  onChange: (value: string | null) => void;
};

export function TextField({
  label,
  value,
  auto,
  max,
  multiline,
  placeholder,
  hint,
  onChange,
}: TextFieldProps) {
  const id = useId();
  const isAuto = value === null && auto !== undefined;
  const shown = value ?? auto ?? "";
  const common = {
    id,
    value: shown,
    maxLength: max,
    placeholder,
    onChange: (event: { currentTarget: { value: string } }) => onChange(event.currentTarget.value),
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {auto !== undefined ? (
          <AutoNote
            auto={isAuto}
            onReset={value !== null && auto ? () => onChange(null) : undefined}
          />
        ) : null}
      </div>
      {multiline ? <Textarea {...common} autoResize className="max-h-60" /> : <Input {...common} />}
      {hint ? <p className="text-sm/5 text-subtle">{hint}</p> : null}
    </div>
  );
}

export function TagsField({
  label,
  value,
  auto,
  max,
  maxLength = 40,
  hint,
  onChange,
}: {
  label: string;
  value: string[] | null;
  auto?: string[];
  max: number;
  maxLength?: number;
  hint?: string;
  onChange: (value: string[] | null) => void;
}) {
  const id = useId();
  const list = value ?? auto ?? [];
  // The typed text, kept while focused so a trailing comma or space isn't swallowed.
  const [draft, setDraft] = useState<string | null>(null);
  const isAuto = value === null && auto !== undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {auto !== undefined ? (
          <AutoNote
            auto={isAuto}
            onReset={value !== null && auto?.length ? () => onChange(null) : undefined}
          />
        ) : null}
      </div>
      <Input
        id={id}
        value={draft ?? list.join(", ")}
        placeholder="Separate with commas"
        onFocus={() => setDraft(list.join(", "))}
        onBlur={() => setDraft(null)}
        onChange={(event) => {
          const text = event.currentTarget.value;
          setDraft(text);
          const items = text
            .split(",")
            .map((item) => item.trim().slice(0, maxLength))
            .filter(Boolean)
            .slice(0, max);
          onChange(items);
        }}
      />
      <p className="text-sm/5 text-subtle">{hint ?? `Up to ${max}.`}</p>
    </div>
  );
}

/** A web address, saved only once it is one ("example.com" is fine); "" clears it. */
export function LinkField({
  label,
  value,
  auto,
  placeholder = "https://",
  onChange,
}: {
  label: string;
  value: string | null;
  auto?: string;
  placeholder?: string;
  onChange: (value: string | null) => void;
}) {
  const id = useId();
  const noteId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value ?? auto ?? "";
  const bad = draft !== null && draft.trim() !== "" && webHref(draft) === null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {auto !== undefined ? (
          <AutoNote
            auto={value === null && draft === null}
            onReset={value !== null && auto ? () => onChange(null) : undefined}
          />
        ) : null}
      </div>
      <Input
        id={id}
        type="url"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        maxLength={500}
        value={shown}
        placeholder={placeholder}
        invalid={bad}
        aria-describedby={bad ? noteId : undefined}
        onChange={(event) => {
          const text = event.currentTarget.value;
          setDraft(text);
          if (text.trim() === "") onChange("");
          else if (webHref(text)) onChange(text.trim());
        }}
        onBlur={() => setDraft(null)}
      />
      {bad ? (
        <p id={noteId} className="text-sm/5 text-fail">
          That isn&apos;t a web address yet.
        </p>
      ) : null}
    </div>
  );
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 @md:grid-cols-2">{children}</div>;
}

type ListEditorProps<T extends { id: string }> = {
  items: readonly T[];
  max: number;
  addLabel: string;
  // What the Undo toast calls a removed item: "Talk removed".
  noun: string;
  onChange: (items: T[], undo?: string) => void;
  create: () => T;
  title: (item: T) => string;
  children: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  // Shown above the list when it's automatic and not yet edited.
  autoNote?: ReactNode;
  empty?: string;
};

export function ListEditor<T extends { id: string }>({
  items,
  max,
  addLabel,
  noun,
  onChange,
  create,
  title,
  children,
  autoNote,
  empty,
}: ListEditorProps<T>) {
  const [dragging, setDragging] = useState<string | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3">
      {autoNote}
      {items.length === 0 && empty ? <p className="text-sm/6 text-muted">{empty}</p> : null}
      <ol className="flex flex-col gap-3">
        {items.map((item, index) => (
          <li
            key={item.id}
            draggable
            onDragStart={(event) => {
              setDragging(item.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => setDragging(null)}
            onDragOver={(event) => {
              if (dragging) event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              const from = items.findIndex((other) => other.id === dragging);
              if (from >= 0) move(from, index);
              setDragging(null);
            }}
            className={cn(
              "rounded-xl bg-surface-muted p-3 @sm:p-4",
              dragging === item.id && "opacity-60",
            )}
          >
            <div className="flex items-center gap-1">
              <GripVertical className="size-4 shrink-0 cursor-grab text-subtle" aria-hidden />
              <p className="min-w-0 flex-1 truncate text-sm/6 font-medium text-ink">
                {title(item) || "Untitled"}
              </p>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Move ${title(item) || "item"} up`}
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Move ${title(item) || "item"} down`}
                disabled={index === items.length - 1}
                onClick={() => move(index, index + 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove ${title(item) || "item"}`}
                onClick={() =>
                  onChange(
                    items.filter((other) => other.id !== item.id),
                    `${noun} removed`,
                  )
                }
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="mt-3 flex flex-col gap-4">
              {children(item, (patch) =>
                onChange(
                  items.map((other) => (other.id === item.id ? { ...other, ...patch } : other)),
                ),
              )}
            </div>
          </li>
        ))}
      </ol>
      {items.length < max ? (
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => onChange([...items, create()])}
        >
          <Plus className="size-4" />
          {addLabel}
        </Button>
      ) : (
        <p className="text-sm/5 text-subtle">That&apos;s the most this list holds ({max}).</p>
      )}
    </div>
  );
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
