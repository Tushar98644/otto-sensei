"use client";

import { useEffect, useId, useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { resumeLabel } from "@/components/studio/resume-label";
import { Select } from "@/components/ui/select";
import { isProTemplate, TEMPLATE_INFO, TEMPLATE_LIST, templateOf } from "@/lib/pdf/templates";
import type { Resume, TemplateId } from "@/lib/resume/schema";
import { FormatCard } from "./format-card";
import { formatsLead } from "./formats-lead";
import { preloadFormatPreview } from "./format-image";
import { FormatPreviewDialog } from "./format-preview-dialog";
import { useApplyFormat } from "./use-apply-format";

function preloadAllPreviews(): void {
  for (const info of TEMPLATE_LIST) preloadFormatPreview(info.id);
}

function usePreloadPreviewsWhenIdle(): void {
  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const handle = requestIdleCallback(preloadAllPreviews, { timeout: 2000 });
      return () => cancelIdleCallback(handle);
    }
    const handle = setTimeout(preloadAllPreviews, 1000);
    return () => clearTimeout(handle);
  }, []);
}

export function FormatsGallery() {
  const { ready, resumes, target, pick, opening, apply } = useApplyFormat();
  const [previewId, setPreviewId] = useState<TemplateId | null>(null);
  const free = useProTools() === false;
  const current = target ? templateOf(target) : null;
  const actionFor = (id: TemplateId) => (id === current ? "Download" : "Use this format");
  usePreloadPreviewsWhenIdle();

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="min-w-0">
          <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
            Formats
          </h1>
          <p className="mt-3 max-w-prose text-base/7 text-pretty text-muted">{formatsLead(free)}</p>
        </div>
        {ready && target && resumes.length > 1 ? (
          <ResumePicker resumes={resumes} target={target} onPick={pick} />
        ) : null}
      </header>
      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {TEMPLATE_LIST.map((info) => (
          <li key={info.id}>
            <FormatCard
              info={info}
              inUse={current === info.id}
              pro={free && isProTemplate(info.id)}
              actionLabel={actionFor(info.id)}
              ready={ready && opening === null}
              opening={opening === info.id}
              onUse={() => apply(info.id)}
              onPreview={() => setPreviewId(info.id)}
            />
          </li>
        ))}
      </ul>
      <FormatPreviewDialog
        info={previewId ? TEMPLATE_INFO[previewId] : null}
        pro={previewId ? free && isProTemplate(previewId) : false}
        onClose={() => setPreviewId(null)}
        actionLabel={previewId ? actionFor(previewId) : "Use this format"}
        ready={ready && opening === null}
        opening={opening !== null && opening === previewId}
        onUse={(info) => apply(info.id)}
      />
    </div>
  );
}

type ResumePickerProps = {
  resumes: readonly Resume[];
  target: Resume;
  onPick: (id: string) => void;
};

function ResumePicker({ resumes, target, onPick }: ResumePickerProps) {
  const id = useId();
  return (
    <div className="flex shrink-0 items-center gap-3">
      <label htmlFor={id} className="shrink-0 text-sm/6 font-medium text-ink">
        Apply to
      </label>
      <Select
        id={id}
        value={target.id}
        onChange={(event) => onPick(event.target.value)}
        className="min-w-0 flex-1 md:w-64 md:flex-none"
      >
        {resumes.map((resume) => (
          <option key={resume.id} value={resume.id}>
            {resumeLabel(resume)}
          </option>
        ))}
      </Select>
    </div>
  );
}
