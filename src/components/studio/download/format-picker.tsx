"use client";

import { useId, useRef } from "react";
import { unlockProTool, useProTools, useTryProLabel } from "@/components/account/pro-tools";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { ResumeThumbnail } from "@/components/dashboard/resume-thumbnail";
import { Button } from "@/components/ui/button";
import { ProMark } from "@/components/ui/pro-mark";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
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
  const t = useMessages("studioDownload").format;
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
      <legend className="mb-1.5 text-sm font-medium text-ink">{t.legend}</legend>
      <div className="grid grid-cols-3 gap-2">
        {TEMPLATE_LIST.map((info) => {
          const checked = current === info.id;
          return (
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
                checked={checked}
                onFocus={() => prepare(info.id)}
                onChange={() => void choose(info.id)}
                className="peer sr-only"
              />
              <span className="group/format flex cursor-pointer flex-col gap-1.5 rounded-xl text-muted transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink hover:text-ink">
                <span
                  className={cn(
                    "block h-16 overflow-hidden rounded-lg bg-surface-muted px-2.5 pt-2.5 transition-colors",
                    checked ? "ring-2 ring-ink" : "group-hover/format:bg-surface-strong",
                  )}
                >
                  <ResumeThumbnail
                    resume={resume}
                    template={info.id}
                    className="rounded-t-xs shadow-page"
                  />
                </span>
                <span
                  className={cn(
                    "flex min-h-5 flex-wrap items-center gap-x-1 gap-y-0.5 px-0.5 text-xs font-medium",
                    checked && "text-ink",
                  )}
                >
                  {info.name}
                  {locked(info.id) ? <ProMark /> : null}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <p id={hintId} className="text-sm text-muted">
        {TEMPLATE_INFO[current].bestFor} {t.clean}
      </p>
      {locked(current) ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm text-ink">
            {fmt(t.proFormat, {
              format: TEMPLATE_INFO[current].name,
              fallback: TEMPLATE_INFO[DEFAULT_TEMPLATE].name,
            })}
          </p>
          <Button variant="ghost" onClick={() => openUpgradePrompt("formats")}>
            {tryPro}
          </Button>
        </div>
      ) : null}
      {offer ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm text-muted">
            {fmt(t.putsHigher, { format: TEMPLATE_INFO[current].name, sections: offer.moved })}
          </p>
          <Button
            variant="ghost"
            onClick={() => updateResume(resume.id, (r) => ({ ...r, sectionOrder: offer.order }))}
          >
            {offer.count === 1 ? t.moveIt : t.moveThem}
          </Button>
        </div>
      ) : null}
    </fieldset>
  );
}
