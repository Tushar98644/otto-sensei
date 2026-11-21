"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { useProTools } from "@/components/account/pro-tools";
import { openFeaturePrompt } from "@/components/account/upgrade-prompt";
import { useNow } from "@/components/studio/use-now";
import { Dialog } from "@/components/ui/dialog";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { ProMark } from "@/components/ui/pro-mark";
import { useResumeList, useStudioStore } from "@/lib/store/resume-store";
import { cn, pluralize } from "@/lib/utils";
import {
  groupCommands,
  moveActive,
  paletteCommands,
  tailorHref,
  type PaletteCommand,
  type PaletteHandlers,
} from "./command-palette-items";
import type { StudioActions } from "./use-studio-actions";
import { useTailorLocked } from "./use-tailor-locked";

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: StudioActions;
};

export function CommandPalette({ open, onOpenChange, actions }: CommandPaletteProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      className="gap-3"
    >
      <PaletteBody actions={actions} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}

function PaletteBody({ actions, onClose }: { actions: StudioActions; onClose: () => void }) {
  const router = useRouter();
  const resumes = useResumeList();
  const activeId = useStudioStore((s) => s.activeId);
  const proTools = useProTools();
  const tailorLocked = useTailorLocked();
  const now = useNow();
  const listId = useId();
  const [{ query, index }, setSearch] = useState({ query: "", index: 0 });

  const handlers = useMemo<PaletteHandlers>(
    () => ({
      go: (href) => router.push(href),
      openResume: (id) => actions.open(id, "fix"),
      tailor: (id, jobLink) => {
        const store = useStudioStore.getState();
        store.setActive(id);
        store.setStep("tailor");
        router.push(tailorHref(jobLink));
      },
      lockedTailor: () => openFeaturePrompt("tailor"),
      upload: actions.upload,
      scratch: actions.scratch,
      sample: actions.sample,
    }),
    [actions, router],
  );

  const commands = useMemo(
    () => paletteCommands({ query, resumes, activeId, proTools, tailorLocked, now }, handlers),
    [query, resumes, activeId, proTools, tailorLocked, now, handlers],
  );
  const groups = useMemo(() => groupCommands(commands), [commands]);
  const positions = useMemo(
    () => new Map(commands.map((command, at) => [command.id, at])),
    [commands],
  );
  const current = Math.min(index, commands.length - 1);
  const activeCommand = commands[current];
  const optionId = (command: PaletteCommand) => `${listId}-${command.id}`;
  const activeOption = activeCommand ? optionId(activeCommand) : undefined;
  const typed = query.trim();

  useEffect(() => {
    if (!activeOption) return;
    document.getElementById(activeOption)?.scrollIntoView({ block: "nearest" });
  }, [activeOption]);

  function run(command: PaletteCommand) {
    // Closed first, so focus is back where it was before a picker, dialog or page opens.
    flushSync(onClose);
    command.run();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && query) {
      event.preventDefault();
      setSearch({ query: "", index: 0 });
      return;
    }
    if (event.key === "Enter") {
      if (event.nativeEvent.isComposing || !activeCommand) return;
      event.preventDefault();
      run(activeCommand);
      return;
    }
    const next = moveActive(current, commands.length, event.key);
    if (next === null) return;
    event.preventDefault();
    setSearch({ query, index: next });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
        />
        <Input
          data-autofocus=""
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption}
          aria-label="Search pages and resumes, or paste a job link"
          placeholder="Search, or paste a job link"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          value={query}
          onChange={(event) => setSearch({ query: event.currentTarget.value, index: 0 })}
          onKeyDown={handleKeyDown}
          className="pl-10"
        />
      </div>
      <div
        id={listId}
        role="listbox"
        aria-label="Results"
        className="-mx-2 h-80 max-h-[45dvh] overflow-y-auto overscroll-contain px-2"
      >
        {groups.map(({ group, commands: items }) => (
          <div key={group} role="group" aria-label={group} className="pb-2">
            <Eyebrow aria-hidden className="px-2.5 pt-2 pb-1">
              {group}
            </Eyebrow>
            {items.map((command) => {
              const at = positions.get(command.id) ?? -1;
              const selected = at === current;
              return (
                <div
                  key={command.id}
                  id={optionId(command)}
                  role="option"
                  aria-selected={selected}
                  // Keeps focus in the search box, where the keys work.
                  onMouseDown={(event) => event.preventDefault()}
                  onPointerMove={() => {
                    if (!selected) setSearch({ query, index: at });
                  }}
                  onClick={() => run(command)}
                  className={cn(
                    "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink pointer-coarse:min-h-11",
                    selected && "bg-ink/6",
                  )}
                >
                  <command.icon aria-hidden className="size-4 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{command.label}</span>
                    {command.detail ? (
                      <span className="block truncate text-xs/5 text-muted">{command.detail}</span>
                    ) : null}
                  </span>
                  {command.pro ? <ProMark /> : null}
                </div>
              );
            })}
          </div>
        ))}
        {commands.length === 0 ? (
          <p className="px-2.5 py-6 text-sm/6 text-pretty text-muted">
            Nothing matches “{typed}”. Try a page, a resume&apos;s name or a job link.
          </p>
        ) : null}
      </div>
      <p role="status" className="sr-only">
        {typed ? pluralize(commands.length, "result") : ""}
      </p>
      <p aria-hidden className="hidden items-center gap-1.5 text-xs/5 text-subtle pointer-fine:flex">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd>
        to move
        <Kbd className="ml-2">Enter</Kbd>
        to open
        <Kbd className="ml-2">Esc</Kbd>
        to close
      </p>
    </div>
  );
}
