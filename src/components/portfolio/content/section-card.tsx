"use client";

import { ChevronDown, EyeOff } from "lucide-react";
import type { ReactNode } from "react";
import type { ContentSection, PortfolioContent } from "@/lib/portfolio/content";
import { CheckRow } from "../check-row";
import { editContent } from "./content-store";

export function SectionCard({
  title,
  meta,
  hidden,
  children,
  defaultOpen = false,
}: {
  title: string;
  meta?: string;
  hidden?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-border">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-lg py-4 -outline-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base/6 font-semibold text-ink">{title}</span>
          {meta ? <span className="truncate text-sm/5 text-subtle">{meta}</span> : null}
          {hidden ? <HiddenNote>{hidden}</HiddenNote> : null}
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted group-open:rotate-180 motion-safe:transition-transform"
          aria-hidden
        />
      </summary>
      <div className="flex flex-col gap-5 pt-1 pb-8">{children}</div>
    </details>
  );
}

export function HiddenNote({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-sm/5 text-warn-ink">
      <EyeOff className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0">{children}</span>
    </span>
  );
}

export function ShowRow({
  content,
  section,
  label,
}: {
  content: PortfolioContent;
  section: ContentSection;
  label: string;
}) {
  const hidden = content.hidden.includes(section);
  return (
    <div className="border-y border-border">
      <CheckRow
        checked={!hidden}
        label={label}
        hint={hidden ? "Hidden. What's here is kept." : undefined}
        onChange={(show) =>
          editContent((current) => ({
            ...current,
            hidden: show
              ? current.hidden.filter((key) => key !== section)
              : [...current.hidden, section],
          }))
        }
      />
    </div>
  );
}
