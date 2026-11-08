"use client";

import { useId, type ReactNode } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ACCENT_COLORS,
  ACCENT_LABELS,
  DENSITY_LABELS,
  FONT_LABELS,
  designOf,
  withDesign,
} from "@/lib/pdf/design";
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
} from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { cn } from "@/lib/utils";

// Accent, font and spacing, saved on the resume like the format, so the preview, both downloads
// and every device agree. Native radios, like the format picker: arrow keys and announcements
// come for free.

const LOOK_LABEL = "Changed the look";

// Executive is the one serif format; the toggle shows what the page uses now.
const FORMAT_FONT: Partial<Record<string, DesignFont>> = { executive: "serif" };

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
    <fieldset className="flex flex-col gap-1.5" aria-describedby={hint ? hintId : undefined}>
      <legend className="mb-1.5 text-sm font-medium text-ink">{legend}</legend>
      <div className={cn("grid gap-1 rounded-xl bg-surface-muted p-1", className)}>
        {choices.map((choice) => (
          <label key={choice.value} className="relative">
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

function Swatch({ color }: { color: string | null }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-4 shrink-0 rounded-full",
        color ? null : "bg-surface ring-1 ring-border-strong ring-inset",
      )}
      // A print color picked by the person, not an app color: it can't be a theme token.
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}

export function DesignControls({ resume }: { resume: Resume }) {
  const updateResume = useStudioStore((s) => s.updateResume);
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
    updateResume(resume.id, (r) => withDesign(r, patch), { label: LOOK_LABEL });
  }

  const accent: AccentValue = design.accent ?? "format";
  const font = design.font ?? FORMAT_FONT[templateOf(resume)] ?? "sans";
  const density = design.density ?? "normal";

  const accents: Choice<AccentValue>[] = [
    {
      value: "format",
      label: (
        <>
          <Swatch color={null} />
          Format
        </>
      ),
    },
    ...DESIGN_ACCENTS.map((value) => ({
      value,
      label: (
        <>
          <Swatch color={ACCENT_COLORS[value]} />
          {ACCENT_LABELS[value]}
        </>
      ),
    })),
  ];
  const fonts: Choice<DesignFont>[] = DESIGN_FONTS.map((value) => ({
    value,
    label: (
      <span className={value === "serif" ? "font-page-serif text-base" : "font-page-sans"}>
        {FONT_LABELS[value]}
      </span>
    ),
  }));
  const densities: Choice<DesignDensity>[] = DESIGN_DENSITIES.map((value) => ({
    value,
    label: DENSITY_LABELS[value],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Look</CardTitle>
        <CardDescription>
          Saved with this resume. Hiring software reads every choice the same way.
        </CardDescription>
      </CardHeader>
      <Segmented
        legend="Accent color"
        hint="Colors the headings and lines. Everything else stays black."
        value={accent}
        choices={accents}
        onChange={(value) => set({ accent: value === "format" ? undefined : value })}
        className="grid-cols-2 sm:grid-cols-3"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Segmented
          legend="Font"
          value={font}
          choices={fonts}
          onChange={(value) => {
            if (value !== font) set({ font: value });
          }}
          className="grid-cols-2"
        />
        <Segmented
          legend="Spacing"
          value={density}
          choices={densities}
          onChange={(value) => set({ density: value === "normal" ? undefined : value })}
          className="grid-cols-2"
        />
      </div>
    </Card>
  );
}
