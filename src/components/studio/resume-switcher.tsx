"use client";

import { ChevronDown, FileText, Plus } from "lucide-react";
import { useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { useResumeList, useStudioStore } from "@/lib/store/resume-store";
import { Popover, usePopover } from "./popover";
import { resumeLabel } from "./resume-label";
import { ResumeSwitcherItem } from "./resume-switcher-item";
import { useNow } from "./use-now";

type StudioState = ReturnType<typeof useStudioStore.getState>;

// A string, not the resume, so typing in the editor doesn't re-render the switcher.
function activeLabel(state: StudioState): string | null {
  const resume = state.activeId ? state.resumes[state.activeId] : undefined;
  return resume ? resumeLabel(resume) : null;
}

export function ResumeSwitcher() {
  const label = useStudioStore(activeLabel);
  const activeId = useStudioStore((s) => s.activeId);
  const count = useStudioStore((s) => s.order.length);
  const t = useMessages("studio").switcher;
  if (count === 0) return null;
  const title = label ?? t.choose;

  return (
    <Popover
      label={t.yours}
      triggerLabel={label !== null ? fmt(t.current, { title }) : title}
      triggerClassName="inline-flex h-11 max-w-full min-w-0 items-center gap-2 rounded-xl border border-border-control bg-surface px-3.5 text-sm font-medium text-ink shadow-control transition hover:border-border-control-hover hover:bg-surface-hover aria-expanded:bg-surface-hover"
      trigger={
        <>
          <FileText className="size-4 shrink-0 text-muted" aria-hidden />
          <span className="truncate">{title}</span>
          <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
        </>
      }
    >
      <SwitcherPanel activeId={label !== null ? activeId : null} />
    </Popover>
  );
}

function SwitcherPanel({ activeId }: { activeId: string | null }) {
  const { close } = usePopover();
  const resumes = useResumeList();
  const setActive = useStudioStore((s) => s.setActive);
  const setStep = useStudioStore((s) => s.setStep);
  const now = useNow();
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const t = useMessages("studio").switcher;

  function select(id: string) {
    setActive(id);
    if (useStudioStore.getState().step === "upload") setStep("fix");
    close();
  }

  function startNew() {
    setStep("upload");
    close();
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="px-2.5 pt-2 pb-1 text-xs/4 font-medium tracking-widest text-subtle uppercase">
        {t.yours}
      </p>
      <ul className="flex flex-col gap-1">
        {resumes.map((resume) => (
          <ResumeSwitcherItem
            key={resume.id}
            resume={resume}
            active={resume.id === activeId}
            now={now}
            onSelect={() => select(resume.id)}
            onDeleted={() => newButtonRef.current?.focus()}
          />
        ))}
      </ul>
      <Separator className="my-1" />
      <button
        ref={newButtonRef}
        type="button"
        onClick={startNew}
        className="flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-ink -outline-offset-2 transition-colors hover:bg-ink/5 pointer-coarse:h-11"
      >
        <Plus className="size-4 text-ink" aria-hidden />
        {t.newResume}
      </button>
    </div>
  );
}
