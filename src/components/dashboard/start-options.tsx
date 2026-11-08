"use client";

import { ChevronRight, FilePlus2, FileText, FileUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StudioActions } from "./use-studio-actions";

type Option = { label: string; detail: string; icon: LucideIcon; run: () => void };

// The same three starts as the studio's upload screen, as a row list (DESIGN.md: no tiles).
export function StartOptions({ actions }: { actions: StudioActions }) {
  const options: Option[] = [
    {
      label: "Upload a resume",
      detail: "PDF or Word. See what hiring software reads.",
      icon: FileUp,
      run: actions.upload,
    },
    {
      label: "Start from scratch",
      detail: "A blank resume with the usual sections.",
      icon: FilePlus2,
      run: actions.scratch,
    },
    {
      label: "Try a sample",
      detail: "A filled-in resume to see how Otto works.",
      icon: FileText,
      run: actions.sample,
    },
  ];

  return (
    <ul className="divide-y divide-border border-y border-border">
      {options.map((option) => (
        <li key={option.label}>
          <button
            type="button"
            onClick={option.run}
            className="group flex w-full items-center gap-3 py-4 text-left"
          >
            <option.icon className="size-5 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm/6 font-medium text-ink">{option.label}</span>
              <span className="block text-sm/5 text-muted">{option.detail}</span>
            </span>
            <ChevronRight
              className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
