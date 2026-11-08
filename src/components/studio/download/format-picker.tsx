"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import { TEMPLATE_INFO, TEMPLATE_LIST, templateOf, withTemplate } from "@/lib/pdf/templates";
import type { Resume, TemplateId } from "@/lib/resume/schema";
import { EDIT_LABELS, useStudioStore } from "@/lib/store/resume-store";
import { cn } from "@/lib/utils";
import { sectionOrderOffer } from "./format-choice";

export type FormatPickerProps = {
  resume: Resume;
  className?: string;
};

// The format is saved on the resume, so the preview, the download and "Check my new PDF" all use
// it, and it follows the resume to other devices. Native radios, like the page size toggle.
export function FormatPicker({ resume, className }: FormatPickerProps) {
  const updateResume = useStudioStore((s) => s.updateResume);
  const name = useId();
  const hintId = `${name}-hint`;
  const current = templateOf(resume);
  const offer = sectionOrderOffer(resume);

  function choose(id: TemplateId) {
    // Every update counts as an edit (new PDF, new sync), so the current format is left alone.
    if (id !== current)
      updateResume(resume.id, (r) => withTemplate(r, id), { label: EDIT_LABELS.format });
  }

  return (
    <fieldset className={cn("flex flex-col gap-1.5", className)} aria-describedby={hintId}>
      <legend className="mb-1.5 text-sm font-medium text-ink">Format</legend>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1 sm:grid-cols-3">
        {TEMPLATE_LIST.map((info) => (
          <label key={info.id} className="relative">
            <input
              type="radio"
              name={name}
              value={info.id}
              checked={current === info.id}
              onChange={() => choose(info.id)}
              className="peer sr-only"
            />
            <span className="flex h-11 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-medium text-muted transition-colors peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-control peer-checked:ring-1 peer-checked:ring-ink/5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink hover:text-ink">
              {info.name}
            </span>
          </label>
        ))}
      </div>
      <p id={hintId} className="text-sm text-muted">
        {TEMPLATE_INFO[current].bestFor} Every format reads cleanly in hiring software.
      </p>
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
