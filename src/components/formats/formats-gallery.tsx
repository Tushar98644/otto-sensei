"use client";

import { useEffect, useId, useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { resumeLabel } from "@/components/studio/resume-label";
import { Select } from "@/components/ui/select";
import { useMessages } from "@/i18n/client";
import { rich } from "@/i18n/rich";
import { isProTemplate, TEMPLATE_INFO, TEMPLATE_LIST, templateOf } from "@/lib/pdf/templates";
import type { Resume, TemplateId } from "@/lib/resume/schema";
import { FormatCard } from "./format-card";
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
  const t = useMessages("formats").gallery;
  const actionFor = (id: TemplateId) => (id === current ? t.download : t.use);
  usePreloadPreviewsWhenIdle();

  return (
    <div className="flex flex-col gap-6">
      <div className="min-h-11">
        {!ready ? null : target && resumes.length > 1 ? (
          <ResumePicker resumes={resumes} target={target} onPick={pick} />
        ) : target ? (
          <p className="py-2.5 text-sm/6 text-muted">
            {rich(
              t.appliesTo,
              { b: (chunk) => <span className="font-medium text-ink">{chunk}</span> },
              { name: resumeLabel(target) },
            )}
          </p>
        ) : (
          <p className="py-2.5 text-sm/6 text-muted">{t.noResume}</p>
        )}
      </div>
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
        actionLabel={previewId ? actionFor(previewId) : t.use}
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
  const t = useMessages("formats").gallery;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <label htmlFor={id} className="text-sm/6 font-medium text-ink">
        {t.applyTo}
      </label>
      <Select
        id={id}
        value={target.id}
        onChange={(event) => onPick(event.target.value)}
        aria-describedby={`${id}-hint`}
        className="sm:w-72"
      >
        {resumes.map((resume) => (
          <option key={resume.id} value={resume.id}>
            {resumeLabel(resume)}
          </option>
        ))}
      </Select>
      <p id={`${id}-hint`} className="text-sm/6 text-muted">
        {t.appliesHint}
      </p>
    </div>
  );
}
