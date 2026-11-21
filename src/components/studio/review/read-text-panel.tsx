"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { RecruiterReport } from "@/lib/checks/types";
import type { FileKind } from "@/lib/parse/types";
import { cn, pluralize } from "@/lib/utils";

const KIND_LABELS: Record<FileKind, string> = { pdf: "PDF", docx: "Word" };

// Below lg the panel sits above the fixes, so it opens on the first lines instead of a box that scrolls.
const PREVIEW_LINES = 6;

export type ReadTextPanelProps = {
  report: RecruiterReport;
  className?: string;
};

export function ReadTextPanel({ report, className }: ReadTextPanelProps) {
  const headingId = useId();
  const textId = useId();
  const lines = toLines(report.readText);
  const [expanded, setExpanded] = useState(false);
  const folds = lines.length > PREVIEW_LINES + 2;
  const clipped = folds && !expanded;

  return (
    <section
      aria-labelledby={headingId}
      data-tour="studio-read-text"
      className={cn("flex flex-col overflow-hidden rounded-2xl bg-surface", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border px-5 py-3 sm:px-6">
        <h2 id={headingId} className="font-sans text-base/6 font-semibold text-ink">
          What hiring software reads
        </h2>
        <p className="text-xs/5 text-subtle tabular-nums">
          {KIND_LABELS[report.kind]} · {pluralize(report.pageCount, "page")} ·{" "}
          {pluralize(report.wordCount, "word")}
        </p>
      </div>
      {lines.length > 0 ? (
        <div
          id={textId}
          tabIndex={0}
          role="region"
          aria-label="Text pulled from your file"
          className="bg-surface-muted/60 py-3 font-mono text-xs/5 text-ink sm:text-sm/6 lg:min-h-0 lg:flex-1 lg:overflow-auto lg:text-xs/5"
        >
          <ol>
            {lines.map((line, index) => (
              <li
                key={index}
                className={cn(
                  "flex gap-3 pr-5 sm:pr-6",
                  clipped && index >= PREVIEW_LINES && "max-lg:hidden",
                )}
              >
                <span
                  aria-hidden
                  className="w-10 shrink-0 text-right text-subtle tabular-nums select-none"
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 break-words whitespace-pre-wrap">
                  {line || " "}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="bg-surface-muted/60 px-5 py-10 text-center text-sm text-muted sm:px-6">
          Nothing at all. To hiring software, this file is a blank page.
        </p>
      )}
      {folds ? (
        <div className="border-t border-border px-2 py-1 lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={expanded}
            aria-controls={textId}
            onClick={() => setExpanded((open) => !open)}
            className="w-full justify-between px-3 text-muted hover:text-ink aria-expanded:bg-transparent"
          >
            {expanded ? "Show fewer lines" : `Show all ${lines.length} lines`}
            <ChevronDown
              aria-hidden
              className={cn(
                "transition-transform duration-150 ease-out motion-reduce:transition-none",
                expanded && "rotate-180",
              )}
            />
          </Button>
        </div>
      ) : null}
      <p className="border-t border-border px-5 py-3 text-xs/5 text-pretty text-muted sm:px-6">
        The text most hiring systems pull from your file, in the order they read it. Real systems
        differ a little.
      </p>
    </section>
  );
}

function toLines(text: string): string[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  while (lines.length > 0 && lines.at(-1)?.trim() === "") lines.pop();
  return lines;
}
