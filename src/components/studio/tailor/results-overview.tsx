"use client";

import { FixFirst, type FixFirstEntry } from "@/components/studio/fix-first";
import { buttonClasses } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status";
import { TITLE_SECTION_ID, type FixFirstAction } from "@/lib/tailor/reasons";
import { JOB_LINES_ID } from "./job-lines";
import { APPLY_KIT_ID } from "./letter-request";
import { requirementDomId } from "./requirement-row";
import type { Screener } from "./screener";
import { REQUIREMENTS_ID } from "./screener-view";

export type ResultsOverviewProps = {
  screener: Screener;
  onJump: (bulletId: string) => void;
};

function scrollToElement(id: string): void {
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({ block: "start" });
  // Rows are focusable (tabIndex -1), so keyboard and screen reader users land on the item too.
  if (element.tabIndex >= -1 && element.matches("li")) element.focus({ preventScroll: true });
}

function actionOf(action: FixFirstAction, onJump: (bulletId: string) => void) {
  if (action.kind === "line") return { label: "Show line", onClick: () => onJump(action.bulletId) };
  if (action.kind === "row") {
    return { label: "Go to it", onClick: () => scrollToElement(requirementDomId(action.rowId)) };
  }
  return { label: "See it", onClick: () => scrollToElement(action.id) };
}

// The top of the results: what to do first for this job, then a short table of contents, so a
// long page of requirements, lines and writing tools is one tap from any part.
export function ResultsOverview({ screener, onJump }: ResultsOverviewProps) {
  const items: FixFirstEntry[] = screener.fixFirst.map((item) => ({
    key: item.key,
    title: item.title,
    reason: item.reason,
    action: actionOf(item.action, onJump),
  }));
  const sections = [
    { id: REQUIREMENTS_ID, label: "Requirements" },
    screener.lines.length > 0 ? { id: JOB_LINES_ID, label: "Your lines" } : null,
    { id: TITLE_SECTION_ID, label: "Title and summary" },
    { id: APPLY_KIT_ID, label: "Apply" },
  ].filter((section): section is { id: string; label: string } => section !== null);

  return (
    <div className="flex flex-col gap-3">
      <FixFirst
        title="Fix these first for this job"
        items={items}
        empty={
          <StatusPill status="pass">Every must-have shows in a line about what you did.</StatusPill>
        }
      />
      <nav aria-label="Tailoring results" className="flex flex-wrap items-center gap-1">
        <span className="pr-2 text-sm text-subtle">Jump to</span>
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={(event) => {
              event.preventDefault();
              scrollToElement(section.id);
            }}
            className={buttonClasses({ variant: "ghost", size: "sm" })}
          >
            {section.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
