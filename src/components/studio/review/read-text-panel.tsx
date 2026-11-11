"use client";

import { useId } from "react";
import type { RecruiterReport } from "@/lib/checks/types";
import type { FileKind } from "@/lib/parse/types";
import { pluralize } from "@/lib/utils";

const KIND_LABELS: Record<FileKind, string> = { pdf: "PDF", docx: "Word" };

export type ReadTextPanelProps = {
  report: RecruiterReport;
  hideHeading?: boolean;
};

export function ReadTextPanel({ report, hideHeading = false }: ReadTextPanelProps) {
  const headingId = useId();
  const lines = toLines(report.readText);

  return (
    <section
      aria-labelledby={headingId}
      data-tour="studio-read-text"
      className="flex flex-col overflow-hidden rounded-2xl bg-surface"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border px-4 py-3">
        <h2
          id={headingId}
          className={hideHeading ? "sr-only" : "font-sans text-base font-semibold text-ink"}
        >
          What hiring software reads
        </h2>
        <p className="text-xs text-muted">
          {KIND_LABELS[report.kind]} · {pluralize(report.pageCount, "page")} ·{" "}
          {pluralize(report.wordCount, "word")}
        </p>
      </div>
      {lines.length > 0 ? (
        // Focusable so keyboard users can scroll it.
        <div
          tabIndex={0}
          role="region"
          aria-label="Text pulled from your file"
          className="max-h-128 overflow-auto bg-surface-muted/60 py-3 font-mono text-xs leading-relaxed text-ink"
        >
          <ol>
            {lines.map((line, index) => (
              <li key={index} className="flex gap-3 pr-4">
                <span
                  aria-hidden
                  className="w-10 shrink-0 text-right text-subtle tabular-nums select-none"
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 break-words whitespace-pre-wrap">
                  {line || " "}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="bg-surface-muted/60 px-4 py-10 text-center text-sm text-muted">
          Nothing at all. To hiring software, this file is a blank page.
        </p>
      )}
      <p className="border-t border-border px-4 py-3 text-xs text-muted">
        This is the text most hiring systems pull from your file, in the order they read it. Real
        systems differ a little.
      </p>
    </section>
  );
}

function toLines(text: string): string[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  while (lines.length > 0 && lines.at(-1)?.trim() === "") lines.pop();
  return lines;
}
