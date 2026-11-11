"use client";

import { Check } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PORTFOLIO_TEMPLATE_INFO, templateGroups } from "@/lib/portfolio/templates";
import { PORTFOLIO_TEMPLATE_IDS, type PortfolioTemplateId } from "@/lib/portfolio/types";
import { cn } from "@/lib/utils";
import { EditorSection } from "./check-row";
import type { TemplateSample } from "./live-template";
import { PreviewSourceBar, usePreviewSource } from "./preview-source";
import { TemplatePreview } from "./template-preview";

type TemplatePickerProps = {
  value: PortfolioTemplateId;
  onChange: (id: PortfolioTemplateId) => void;
  own: TemplateSample;
  disabled?: boolean;
};

// Native radios in one group, so arrow keys move between designs (across both lists) and the
// preview follows at once.
export function TemplatePicker({ value, onChange, own, disabled = false }: TemplatePickerProps) {
  const choice = usePreviewSource(own);
  return (
    <EditorSection
      title="Design"
      description="Every design uses the same content. Switch any time; nothing is lost."
    >
      <PreviewSourceBar choice={choice} />
      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-6">
        <legend className="sr-only">Design</legend>
        {templateGroups(PORTFOLIO_TEMPLATE_IDS).map((group) => (
          <div key={group.label} className="flex flex-col gap-3">
            <Eyebrow>{group.label}</Eyebrow>
            <div className="grid grid-cols-2 gap-3 @xl:grid-cols-3">
              {group.ids.map((id) => {
                const { name, description } = PORTFOLIO_TEMPLATE_INFO[id];
                const selected = id === value;
                return (
                  <label
                    key={id}
                    className={cn(
                      "relative flex cursor-pointer flex-col gap-2 rounded-xl p-2 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink motion-safe:transition-colors",
                      selected ? "bg-surface-muted ring-1 ring-ink" : "hover:bg-surface-hover",
                    )}
                  >
                    <input
                      type="radio"
                      name="portfolio-template"
                      value={id}
                      checked={selected}
                      onChange={() => onChange(id)}
                      className="sr-only"
                    />
                    <TemplatePreview
                      id={id}
                      sample={choice.sample}
                      sizes="(min-width: 1024px) 200px, 45vw"
                      className="rounded-lg"
                    />
                    <span className="flex items-center justify-between gap-2 px-0.5">
                      <span className="text-sm/5 font-medium text-ink">{name}</span>
                      {selected ? (
                        <span className="flex items-center gap-1 text-xs/4 text-muted">
                          <Check aria-hidden className="size-3.5 text-ink" />
                          In use
                        </span>
                      ) : null}
                    </span>
                    <span className="line-clamp-2 px-0.5 text-xs/5 text-muted">{description}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>
    </EditorSection>
  );
}
