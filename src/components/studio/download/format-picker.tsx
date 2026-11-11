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

// How long the pointer rests on a format before its PDF is made, so sweeping across the row
// doesn't render every format on the way. A click usually follows a rest by a few hundred ms.
const REST_MS = 120;

export type FormatPickerProps = {
  resume: Resume;
  className?: string;
};

// The format is saved on the resume, so the preview, the download and "Check my new PDF" all use
// it, and it follows the resume to other devices. Native radios, like the page size toggle.
// Classic and Compact are on every plan. The others carry a Pro badge on Free and offer the trial
// instead of switching; a resume already set to one (a paid plan that ended) keeps it, but its
// download comes out in Classic, which the line under the picker says.
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
  const resting = useRef(0);

  function prepare(id: TemplateId) {
    window.clearTimeout(resting.current);
    if (id === current || locked(id)) return;
    resting.current = window.setTimeout(
      () => preparePdf(printedResume(withTemplate(resume, id), pro), pageSize),
      REST_MS,
    );
  }

  async function choose(id: TemplateId) {
    // Every update counts as an edit (new PDF, new sync), so the current format is left alone.
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
            onPointerEnter={() => prepare(info.id)}
            onPointerLeave={() => window.clearTimeout(resting.current)}
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
