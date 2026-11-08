"use client";

import { ChevronDown, Trash } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DIMMED_CLASSES, HiddenChip, HideToggle } from "./hidden-chip";
import { ICON_ACTION_CLASSES, MoveButtons } from "./move-buttons";
import { removeWithUndo } from "./remove-with-undo";

export type EntryDetails = {
  // The entry's own fields (title, company, dates...). They fold away once `complete` is true on
  // the first render, so a filled-in job shows its lines first.
  content: ReactNode;
  complete: boolean;
  // Focused when the fields are opened.
  firstFieldId: string;
};

export type EntryShellProps = {
  // The resume the entry belongs to, so a removal can be undone.
  resumeId: string;
  headingId: string;
  removeId: string;
  // The entry's name in its buttons, e.g. "Backend Engineer at Stripe".
  title: string;
  // What the heading shows, when it differs from `title`: a role under its company's heading
  // shows only the role.
  heading?: string;
  // Roles sit one level under their company's heading.
  headingLevel?: 4 | 5;
  // A gray line of facts under the title, e.g. "Jan 2021 – now · Remote".
  meta?: string | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (delta: -1 | 1) => void;
  // Set when the entry has something to lose, e.g. "Remove this job and its 4 lines?": it is
  // still removed at once, but with Undo. Null removes it quietly.
  confirm: string | null;
  onRemove: () => void;
  // "Hide in this version": the entry stays here, dimmed, and is left out of the PDF.
  hidden?: boolean;
  onToggleHidden?: () => void;
  // Roles at one company: the first ("start") carries the company's heading in `lead`, and every
  // role sits on one rule down the left, so the group reads as one block. The list stays flat,
  // so regrouping never remounts an entry (or drops focus from the field being typed in).
  rail?: "start" | "continue";
  lead?: ReactNode;
  // Fields that can fold away behind "Edit details". Without it, children are the fields.
  details?: EntryDetails;
  // What stays in view under the title, folded or not (a job's lines, a group's skills).
  children?: ReactNode;
};

// Move, hide, remove and the details toggle fade in on hover or focus (always on touch), keeping
// their space so nothing shifts.
const REVEAL_CLASSES =
  "opacity-0 transition-opacity group-hover/entry:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100";

// One job, school, project, skill group, certification or extra item: a heading, move, hide and
// remove controls, then its fields. Not a card: entries are split by a rule, so a section never
// nests boxes. Removing something with content offers Undo, so nothing is lost by a tap.
export function EntryShell({
  resumeId,
  headingId,
  removeId,
  title,
  heading = title,
  headingLevel = 4,
  meta,
  canMoveUp,
  canMoveDown,
  onMove,
  confirm,
  onRemove,
  hidden = false,
  onToggleHidden,
  rail,
  lead,
  details,
  children,
}: EntryShellProps) {
  // Only the first render decides: filling in the company while typing must not fold the fields
  // away under the cursor.
  const [detailsOpen, setDetailsOpen] = useState(() => !details?.complete);
  const detailsId = useId();
  const Heading = headingLevel === 5 ? "h5" : "h4";
  const onRail = rail !== undefined;
  const continues = rail === "continue";

  function remove() {
    if (confirm) removeWithUndo(resumeId, title, onRemove);
    else onRemove();
  }

  function toggleDetails() {
    if (detailsOpen) {
      setDetailsOpen(false);
      return;
    }
    flushSync(() => setDetailsOpen(true));
    if (details) document.getElementById(details.firstFieldId)?.focus();
  }

  return (
    <li
      className={cn(
        "flex flex-col gap-4 border-border",
        !continues && "not-first:mt-6 not-first:border-t not-first:pt-6",
      )}
    >
      {lead}
      <div
        className={cn(
          "group/entry flex flex-col gap-4",
          onRail && "border-l border-border pl-4 sm:pl-6",
          continues && "pt-6",
          hidden && DIMMED_CLASSES,
        )}
      >
        {/* Phones stack the title over its controls, so a long job title keeps the full width. */}
        <div className="flex flex-col sm:-mr-3 sm:flex-row sm:items-start sm:gap-1">
          <div className="min-w-0 flex-1 sm:py-2.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Heading
                id={headingId}
                className={cn(
                  "text-base/6 font-medium wrap-break-word",
                  hidden ? "text-muted" : "text-ink",
                )}
              >
                {heading}
              </Heading>
              {hidden ? <HiddenChip /> : null}
            </div>
            {meta ? <p className="text-sm/5 text-subtle">{meta}</p> : null}
          </div>
          <div className="-mr-2 flex items-center gap-1 max-sm:mt-1 sm:mr-0">
            {details ? (
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={detailsOpen}
                aria-controls={detailsId}
                aria-describedby={headingId}
                onClick={toggleDetails}
                className="text-muted hover:text-ink max-sm:-ml-4 max-sm:h-11 sm:mt-1"
              >
                {detailsOpen ? "Hide details" : "Edit details"}
                <ChevronDown className={cn("transition-transform", detailsOpen && "rotate-180")} />
              </Button>
            ) : null}
            <div className={cn("ml-auto flex items-center", REVEAL_CLASSES)}>
              <MoveButtons
                label={title}
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
                onMove={onMove}
              />
              {onToggleHidden ? (
                <HideToggle label={title} hidden={hidden} onToggle={onToggleHidden} />
              ) : null}
              <Button
                id={removeId}
                variant="ghost"
                size="icon"
                aria-label={`Remove ${title}`}
                onClick={remove}
                className={ICON_ACTION_CLASSES}
              >
                <Trash />
              </Button>
            </div>
          </div>
        </div>
        {details ? (
          <div id={detailsId} hidden={!detailsOpen}>
            {detailsOpen ? details.content : null}
          </div>
        ) : null}
        {children}
      </div>
    </li>
  );
}
