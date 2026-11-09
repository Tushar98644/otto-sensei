"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import type { PortfolioTemplateId } from "@/lib/portfolio/types";
import { cn } from "@/lib/utils";
import { EditorCard } from "./check-row";
import { PORTFOLIO_TEMPLATE_LIST } from "./templates/registry";

type TemplatePickerProps = {
  value: PortfolioTemplateId;
  onChange: (id: PortfolioTemplateId) => void;
  disabled?: boolean;
};

// Native radios, so arrow keys move between templates and the preview follows at once.
export function TemplatePicker({ value, onChange, disabled = false }: TemplatePickerProps) {
  return (
    <EditorCard title="Template">
      <fieldset disabled={disabled} className="min-w-0">
        <legend className="sr-only">Template</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {PORTFOLIO_TEMPLATE_LIST.map(({ id, name, description, thumbnail }) => {
            const selected = id === value;
            return (
              <label
                key={id}
                className={cn(
                  "relative flex cursor-pointer flex-col gap-2 rounded-xl p-2 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink",
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
                {/* The top of the approved sample; the name and line below say the same. */}
                <Image
                  src={thumbnail}
                  alt=""
                  aria-hidden
                  width={480}
                  height={300}
                  sizes="(min-width: 1280px) 140px, (min-width: 1024px) 200px, (min-width: 640px) 30vw, 45vw"
                  className="h-auto w-full rounded-lg bg-surface-muted ring-1 ring-border"
                />
                <span className="flex items-center gap-1.5 text-sm/6 font-medium text-ink">
                  {name}
                  {selected ? <Check aria-hidden className="size-4" /> : null}
                </span>
                <span className="text-sm/5 text-muted">{description}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </EditorCard>
  );
}
