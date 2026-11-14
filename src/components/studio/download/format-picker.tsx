"use client";

import { useId, useRef } from "react";
import { unlockProTool, useProTools, useTryProLabel } from "@/components/account/pro-tools";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  isProTemplate,
  TEMPLATE_INFO,
  TEMPLATE_LIST,
  templateOf,
  withTemplate,
} from "@/lib/pdf/templates";
import { DEFAULT_TEMPLATE, type Resume, type TemplateId } from "@/lib/resume/schema";
import { EDIT_LABELS, useStudioStore } from "@/lib/store/resume-store";
import { cn } from "@/lib/utils";
import { sectionOrderOffer } from "./format-choice";
import { preparePdf, printedResume } from "./pdf-cache";
import { usePageSize } from "./use-page-size";

const REST_MS = 120;

export type FormatPickerProps = {
  resume: Resume;
  className?: string;
};

export function FormatPicker({ resume, className }: FormatPickerProps) {
  const updateResume = useStudioStore((s) => s.updateResume);
  const name = useId();
  const hintId = `${name}-hint`;
  const current = templateOf(resume);
  const offer = sectionOrderOffer(resume);
  const pro = useProTools();
  const tryPro = useTryProLabel();
  const locked = (id: TemplateId) => pro === false && isProTemplate(id);
  const pageSize = usePageSize();
  const stopPreparing = useRef(() => {});

  function stop() {
    stopPreparing.current();
    stopPreparing.current = () => {};
  }

  function prepare(id: TemplateId) {
    stop();
    if (id === current || locked(id)) return;
    let cancel = () => {};
    const timer = window.setTimeout(() => {
      cancel = preparePdf(printedResume(withTemplate(resume, id), pro), pageSize);
    }, REST_MS);
    stopPreparing.current = () => {
      window.clearTimeout(timer);
      cancel();
    };
  }

  async function choose(id: TemplateId) {
    if (id === current) return;
    if (isProTemplate(id) && !(await unlockProTool("formats"))) return;
    updateResume(resume.id, (r) => withTemplate(r, id), { label: EDIT_LABELS.format });
  }

  return (
    <fieldset className={cn("flex flex-col gap-1.5", className)} aria-describedby={hintId}>
      <legend className="mb-1.5 text-sm font-medium text-ink">Format</legend>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1 sm:grid-cols-3">
        {TEMPLATE_LIST.map((info) => (
          <label
            key={info.id}
            className="relative"
            onPointerEnter={(event) => {
              // A tap picks the format at once, so only a resting mouse or pen renders ahead.
              if (event.pointerType !== "touch") prepare(info.id);
            }}
            onPointerLeave={stop}
          >
            <input
              type="radio"
              name={name}
              value={info.id}
              checked={current === info.id}
              onFocus={() => prepare(info.id)}
              onChange={() => void choose(info.id)}
              className="peer sr-only"
            />
            <span className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted transition-colors peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-control peer-checked:ring-1 peer-checked:ring-ink/5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink hover:text-ink">
              {info.name}
              {locked(info.id) ? (
                <Badge variant="ink" className="h-5 px-1.5">
                  Pro
                </Badge>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      <p id={hintId} className="text-sm text-muted">
        {TEMPLATE_INFO[current].bestFor} Every format reads cleanly in hiring software.
      </p>
      {locked(current) ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm text-ink">
            {TEMPLATE_INFO[current].name} is a Pro format, so your download comes out in{" "}
            {TEMPLATE_INFO[DEFAULT_TEMPLATE].name}.
          </p>
          <Button variant="ghost" onClick={() => openUpgradePrompt("formats")}>
            {tryPro}
          </Button>
        </div>
      ) : null}
      {offer ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm text-muted">
            {TEMPLATE_INFO[current].name} puts {offer.moved} higher up.
          </p>
          <Button
            variant="ghost"
            onClick={() => updateResume(resume.id, (r) => ({ ...r, sectionOrder: offer.order }))}
          >
            Move {offer.count === 1 ? "it" : "them"} up
          </Button>
        </div>
      ) : null}
    </fieldset>
  );
}
