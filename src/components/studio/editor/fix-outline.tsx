"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useStudioStore } from "@/lib/store/resume-store";
import { cn } from "@/lib/utils";
import { entryFieldId, sectionDomId } from "./focus";
import { lintOf } from "./lint-cache";
import { SETTLE_MS } from "./lint-notes";
import { fixOutline, type OutlineSection } from "./outline";
import { pickResume } from "./use-editor";
import { useSettled } from "./use-settled";

// Where a section counts as the one being read: just under the sticky bars.
const READING_LINE_PX = 160;

// A string, so the store only re-renders this when a label, an entry or a count changes.
function useOutline(resumeId: string): OutlineSection[] {
  const json = useStudioStore((state) => {
    const resume = pickResume(state, resumeId);
    return resume ? JSON.stringify(fixOutline(resume, lintOf(resume).byBullet)) : "[]";
  });
  const settled = useSettled(json, SETTLE_MS);
  return useMemo(() => JSON.parse(settled) as OutlineSection[], [settled]);
}

function entryCard(entryId: string): HTMLElement | null {
  return document.getElementById(entryFieldId(entryId, "heading"))?.closest("li") ?? null;
}

// The section (and entry) whose top has passed the reading line, as "key" or "key entryId".
function useReading(outline: readonly OutlineSection[]): string {
  const [reading, setReading] = useState("");
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      let current = "";
      for (const section of outline) {
        const element = document.getElementById(sectionDomId(section.key));
        if (!element || element.getBoundingClientRect().top > READING_LINE_PX) continue;
        current = section.key;
        for (const entry of section.entries) {
          const card = entryCard(entry.id);
          if (card && card.getBoundingClientRect().top <= READING_LINE_PX) {
            current = `${section.key} ${entry.id}`;
          }
        }
      }
      setReading(current);
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [outline]);
  return reading;
}

// A folded section opens first, so its entries exist to scroll to.
function goTo(sectionKey: string, entryId?: string) {
  const section = document.getElementById(sectionDomId(sectionKey));
  if (!section) return;
  const toggle = section.querySelector<HTMLButtonElement>("h3 button[aria-expanded]");
  if (toggle?.getAttribute("aria-expanded") === "false") flushSync(() => toggle.click());
  const card = entryId ? entryCard(entryId) : null;
  (card ?? section).scrollIntoView({ block: "start" });
  const focusTarget = card
    ? card.querySelector<HTMLElement>("h4, h5")
    : (toggle ?? section.querySelector<HTMLElement>("h3"));
  focusTarget?.focus({ preventScroll: true });
}

function Count({ value }: { value: number }) {
  if (value === 0) return null;
  return (
    <span className="ml-auto shrink-0 rounded-full bg-warn-soft px-1.5 text-xs/5 font-medium text-warn-ink tabular-nums">
      {value}
      <span className="sr-only">{value === 1 ? " line needs work" : " lines need work"}</span>
    </span>
  );
}

/**
 * Every section and entry with what still needs work. Wide screens keep it beside the editor;
 * phones get the sections as a row under the top bar. Both scroll the editor to what you pick.
 */
export function FixOutline({ resumeId }: { resumeId: string }) {
  const outline = useOutline(resumeId);
  const reading = useReading(outline);
  const [readingSection = "", readingEntry = ""] = reading.split(" ");

  return (
    <>
      <PhoneSections outline={outline} current={readingSection} />
      <nav
        aria-label="Resume sections"
        className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] self-start overflow-y-auto overscroll-contain rounded-2xl bg-surface p-2 lg:block"
      >
        <Eyebrow className="px-2.5 pt-2 pb-1">Your resume</Eyebrow>
        <ul className="flex flex-col">
          {outline.map((section) => (
            <li key={section.key}>
              <button
                type="button"
                onClick={() => goTo(section.key)}
                aria-current={readingSection === section.key && !readingEntry ? "true" : undefined}
                className={cn(
                  "flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-muted",
                  readingSection === section.key && !readingEntry && "bg-surface-muted",
                )}
              >
                <span className="min-w-0 truncate">{section.label}</span>
                <Count value={section.needWork} />
              </button>
              {section.entries.length > 0 ? (
                <ul className="mb-1 flex flex-col">
                  {section.entries.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => goTo(section.key, entry.id)}
                        aria-current={readingEntry === entry.id ? "true" : undefined}
                        className={cn(
                          "flex min-h-8 w-full items-center gap-2 rounded-lg py-1 pr-2.5 pl-5 text-left text-sm/5 text-muted transition-colors hover:bg-surface-muted hover:text-ink",
                          readingEntry === entry.id && "bg-surface-muted text-ink",
                        )}
                      >
                        <span className="line-clamp-2 min-w-0 break-words">{entry.label}</span>
                        <Count value={entry.needWork} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

function PhoneSections({
  outline,
  current,
}: {
  outline: readonly OutlineSection[];
  current: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  // Keeps the section being read in view in the row, without moving the page.
  useEffect(() => {
    const row = rowRef.current;
    const chip = current
      ? row?.querySelector<HTMLElement>(`[data-key="${CSS.escape(current)}"]`)
      : null;
    if (!row || !chip) return;
    const left = chip.offsetLeft - row.clientWidth / 2 + chip.offsetWidth / 2;
    row.scrollTo({ left: Math.max(0, left) });
  }, [current]);

  return (
    <nav
      aria-label="Jump to a section"
      className="sticky top-16 z-20 -mx-4 bg-surface-muted px-4 py-2 sm:-mx-6 sm:px-6 lg:hidden"
    >
      <div
        ref={rowRef}
        className="relative flex [scrollbar-width:none] gap-1 overflow-x-auto rounded-xl bg-surface-strong p-1"
      >
        {outline.map((section) => (
          <button
            key={section.key}
            type="button"
            data-key={section.key}
            onClick={() => goTo(section.key)}
            aria-current={current === section.key ? "true" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap text-muted transition-colors pointer-coarse:h-11",
              current === section.key && "bg-surface text-ink shadow-control ring-1 ring-ink/5",
            )}
          >
            {section.label}
            <Count value={section.needWork} />
          </button>
        ))}
      </div>
    </nav>
  );
}
