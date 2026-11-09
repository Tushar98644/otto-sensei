"use client";

import { ChevronDown, EyeOff } from "lucide-react";
import type { ReactNode } from "react";
import type { ContentSection, PortfolioContent } from "@/lib/portfolio/content";
import { CheckRow } from "../check-row";
import { editContent } from "./content-store";

// A white editor card that folds away, so the settings column stays short: title, a muted facts
// line ("3 of 5 with screenshots") and the fields inside. `hidden` names what the page leaves out
// ("Projects are hidden on your page"); the fields stay, so the owner can still edit them.
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
    <details open={defaultOpen} className="group rounded-2xl bg-surface">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-base/6 font-semibold text-ink">{title}</span>
          {meta ? <span className="truncate text-sm/5 text-subtle">{meta}</span> : null}
          {hidden ? <HiddenNote>{hidden}</HiddenNote> : null}
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="flex flex-col gap-5 px-4 pb-5 sm:px-6 sm:pb-6">{children}</div>
    </details>
  );
}

/** "Hidden on your page" beside content the page leaves out, with where to turn it back on. */
export function HiddenNote({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-sm/5 text-warn-ink">
      <EyeOff className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0">{children}</span>
    </span>
  );
}

/** "Show on my page" for a content section, kept without deleting what's in it. */
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
