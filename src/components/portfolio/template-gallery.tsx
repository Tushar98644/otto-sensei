"use client";

import type { ReactNode } from "react";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { PORTFOLIO_TEMPLATE_INFO, templateOrder } from "@/lib/portfolio/templates";
import { PORTFOLIO_TEMPLATE_IDS, type PortfolioTemplateId } from "@/lib/portfolio/types";
import { cn } from "@/lib/utils";
import type { TemplateSample } from "./live-template";
import { TemplatePreview } from "./template-preview";

export function TemplateGallery({
  sample,
  onPreview,
  action,
  className,
}: {
  sample: TemplateSample | null;
  onPreview: (id: PortfolioTemplateId) => void;
  action: (id: PortfolioTemplateId, name: string) => ReactNode;
  className?: string;
}) {
  const words = useMessages("portfolio");
  return (
    <ul className={cn("grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {templateOrder(PORTFOLIO_TEMPLATE_IDS).map((id) => {
        const { name } = PORTFOLIO_TEMPLATE_INFO[id];
        return (
          <li key={id} className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => onPreview(id)}
              aria-label={fmt(words.previewFull, { name })}
              className="group relative block rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <TemplatePreview
                id={id}
                sample={sample}
                sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 90vw"
                className="transition-shadow group-hover:ring-2 group-hover:ring-ink/20"
              />
            </button>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm/6 font-medium text-ink">{name}</p>
                <p className="text-sm/5 text-muted">{words.templates[id]}</p>
              </div>
              {action(id, name)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
