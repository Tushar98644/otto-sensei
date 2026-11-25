"use client";

import { useCallback, useEffect, useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/config/plans";
import { useMessagesOr } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import EN_FORMATS from "@/i18n/messages/en/formats";
import type { RecruiterReport } from "@/lib/checks/types";
import { isProTemplate, TEMPLATE_INFO } from "@/lib/pdf/templates";
import { DEFAULT_TEMPLATE, type Resume, type TemplateId } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { chosenFormat, clearChosenFormat, inFormat } from "./apply-format";
import { FormatImage } from "./format-image";

export type ChosenFormat = {
  format: TemplateId | null;
  addResume: (resume: Resume, report?: RecruiterReport) => void;
};

// Read once on arrival, so a later visit to Upload starts without it.
export function useChosenFormat(): ChosenFormat {
  const [format] = useState(chosenFormat);
  const add = useStudioStore((s) => s.addResume);
  useEffect(() => clearChosenFormat(), []);
  const addResume = useCallback(
    (resume: Resume, report?: RecruiterReport) =>
      add(format ? inFormat(resume, format) : resume, report),
    [add, format],
  );
  return { format, addResume };
}

type ChosenWords = (typeof EN_FORMATS)["chosen"];

export function chosenFormatLines(
  format: TemplateId,
  pro: boolean | null,
  t: ChosenWords = EN_FORMATS.chosen,
): { title: string; detail: string } {
  const { name } = TEMPLATE_INFO[format];
  if (!isProTemplate(format) || pro === true) {
    return { title: fmt(t.comesOut, { name }), detail: t.change };
  }
  if (pro === null) return { title: fmt(t.setTo, { name }), detail: t.change };
  return {
    title: fmt(t.setTo, { name }),
    detail: fmt(t.proOnly, {
      name,
      pro: PLANS.pro.name,
      free: PLANS.free.name,
      fallback: TEMPLATE_INFO[DEFAULT_TEMPLATE].name,
    }),
  };
}

export type ChosenFormatNoteProps = {
  format: TemplateId;
  onSample: () => void;
  disabled?: boolean;
};

export function ChosenFormatNote({ format, onSample, disabled = false }: ChosenFormatNoteProps) {
  const words = useMessagesOr("formats", EN_FORMATS);
  const { title, detail } = chosenFormatLines(format, useProTools(), words.chosen);
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-surface p-3 sm:px-4">
      <div
        aria-hidden
        className="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-muted px-1.5 pt-1.5"
      >
        <FormatImage
          info={TEMPLATE_INFO[format]}
          sizes="3rem"
          alt={fmt(words.gallery.alt, { name: TEMPLATE_INFO[format].name })}
          className="shadow-page"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-sm/6 font-medium text-ink">{title}</p>
          <p className="text-sm/6 text-pretty text-muted">{detail}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onSample}
          disabled={disabled}
          className="self-start sm:self-auto"
        >
          {words.chosen.sample}
        </Button>
      </div>
    </div>
  );
}
