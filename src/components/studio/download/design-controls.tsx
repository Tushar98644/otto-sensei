"use client";

import { useId, type ReactNode } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMessages } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import { ACCENT_COLORS, designOf, withDesign } from "@/lib/pdf/design";
import { PAGE_SIZE_LABELS, PDF_PAGE_SIZES, type PdfPageSize } from "@/lib/pdf/page-size";
import { templateOf } from "@/lib/pdf/templates";
import {
  DESIGN_ACCENTS,
  DESIGN_DENSITIES,
  DESIGN_FONTS,
  type DesignAccent,
  type DesignDensity,
  type DesignFont,
  type Resume,
  type ResumeDesign,
  type TemplateId,
} from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { cn } from "@/lib/utils";
import { FormatPicker } from "./format-picker";
import { setPageSize } from "./use-page-size";

type DesignCopy = Messages["studioDownload"]["design"];

const FORMAT_FONT: Record<TemplateId, DesignFont> = {
  classic: "sans",
  modern: "sans",
  compact: "serif",
  executive: "serif",
  developer: "serif",
  minimal: "serif",
};

const PAIR = "w-fit grid-cols-2";

const OPTION =
  "flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-muted transition-colors peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-control peer-checked:ring-1 peer-checked:ring-ink/5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink hover:text-ink";

type Choice<T extends string> = { value: T; label: ReactNode };

function Segmented<T extends string>({
  legend,
  hint,
  value,
  choices,
  onChange,
  className,
}: {
  legend: string;
  hint?: string;
  value: T;
  choices: readonly Choice<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const name = useId();
  const hintId = `${name}-hint`;
  return (
    <fieldset
      className="flex min-w-0 flex-col gap-1.5"
      aria-describedby={hint ? hintId : undefined}
    >
      <legend className="mb-1.5 text-sm font-medium text-ink">{legend}</legend>
      <div className={cn("grid gap-1 rounded-xl bg-surface-muted p-1", className)}>
        {choices.map((choice) => (
          <label key={choice.value} className="relative min-w-0">
            <input
              type="radio"
              name={name}
              value={choice.value}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
              className="peer sr-only"
            />
            <span className={OPTION}>{choice.label}</span>
          </label>
        ))}
      </div>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}

type AccentValue = DesignAccent | "format";

function accentChoices(
  t: DesignCopy,
): { value: AccentValue; color: string | null; label: string }[] {
  return [
    { value: "format", color: null, label: t.formatColor },
    ...DESIGN_ACCENTS.map((value) => ({
      value,
      color: ACCENT_COLORS[value],
      label: t.accents[value],
    })),
  ];
}

function ColorPicker({
  value,
  onChange,
}: {
  value: AccentValue;
  onChange: (value: AccentValue) => void;
}) {
  const name = useId();
  const hintId = `${name}-hint`;
  const t = useMessages("studioDownload").design;
  const choices = accentChoices(t);
  const current = choices.find((choice) => choice.value === value) ?? choices[0]!;
  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={hintId}>
      <legend className="mb-1.5 text-sm font-medium text-ink">
        {t.color} <span className="font-normal text-muted">· {current.label}</span>
      </legend>
      <div className="-mx-1.5 flex flex-wrap">
        {choices.map((choice) => (
          <label key={choice.value} className="relative" title={choice.label}>
            <input
              type="radio"
              name={name}
              value={choice.value}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
              aria-label={choice.label}
              className="peer sr-only"
            />
            <span className="flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors peer-checked:ring-2 peer-checked:ring-ink peer-checked:ring-inset peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink hover:bg-surface-muted">
              <span
                aria-hidden
                className={cn(
                  "size-7 rounded-full",
                  choice.color ? null : "bg-surface ring-1 ring-border-strong ring-inset",
                )}
                style={choice.color ? { backgroundColor: choice.color } : undefined}
              />
            </span>
          </label>
        ))}
      </div>
      <p id={hintId} className="text-sm text-muted">
        {t.colorHint}
      </p>
    </fieldset>
  );
}

const fontChoices = (t: DesignCopy): Choice<DesignFont>[] =>
  DESIGN_FONTS.map((value) => ({
    value,
    label: (
      <span className={value === "serif" ? "font-page-serif text-base" : "font-page-sans"}>
        {t.fonts[value]}
      </span>
    ),
  }));

const densityChoices = (t: DesignCopy): Choice<DesignDensity>[] =>
  DESIGN_DENSITIES.map((value) => ({
    value,
    label: t.densities[value],
  }));

const pageSizeChoices = (t: DesignCopy): Choice<PdfPageSize>[] =>
  PDF_PAGE_SIZES.map((value) => ({
    value,
    label: value === "LETTER" ? t.letter : PAGE_SIZE_LABELS[value],
  }));

export type DesignCardProps = { resume: Resume; printed: Resume; pageSize: PdfPageSize };

export function DesignCard({ resume, printed, pageSize }: DesignCardProps) {
  const updateResume = useStudioStore((s) => s.updateResume);
  const t = useMessages("studioDownload").design;
  const design = designOf(resume);

  function set(patch: Partial<ResumeDesign>) {
    const next = { ...design, ...patch };
    if (
      next.accent === design.accent &&
      next.font === design.font &&
      next.density === design.density
    ) {
      return;
    }
    updateResume(resume.id, (r) => withDesign(r, patch), { label: t.changedLook });
  }

  const accent: AccentValue = design.accent ?? "format";
  // Picking the printed format's own kind clears the choice; on Free a Pro format prints in Classic.
  const formatFont = FORMAT_FONT[templateOf(printed)];
  const font = design.font ?? formatFont;
  const density = design.density ?? "normal";

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <FormatPicker resume={resume} />
      <ColorPicker
        value={accent}
        onChange={(value) => set({ accent: value === "format" ? undefined : value })}
      />
      <div className="flex flex-wrap gap-x-3 gap-y-4">
        <Segmented
          legend={t.font}
          value={font}
          choices={fontChoices(t)}
          onChange={(value) => set({ font: value === formatFont ? undefined : value })}
          className={PAIR}
        />
        <Segmented
          legend={t.spacing}
          value={density}
          choices={densityChoices(t)}
          onChange={(value) => set({ density: value === "normal" ? undefined : value })}
          className={PAIR}
        />
      </div>
      <Segmented
        legend={t.pageSize}
        hint={t.pageSizeHint}
        value={pageSize}
        choices={pageSizeChoices(t)}
        onChange={setPageSize}
        className={PAIR}
      />
    </Card>
  );
}
