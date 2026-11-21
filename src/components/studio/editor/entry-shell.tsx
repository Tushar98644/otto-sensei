"use client";

import { ChevronDown, Trash } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HOLD_FOCUS } from "./focus-hold";
import { DIMMED_CLASSES, HiddenChip, HideToggle } from "./hidden-chip";
import { ICON_ACTION_CLASSES, MoveButtons } from "./move-buttons";
import { removeWithUndo } from "./remove-with-undo";
import { RowMenu } from "./row-menu";
import { useTouchLayout } from "./touch";

export type EntryDetails = {
  content: ReactNode;
  complete: boolean;
  firstFieldId: string;
};

export type EntryShellProps = {
  resumeId: string;
  headingId: string;
  removeId: string;
  title: string;
  heading?: string;
  headingLevel?: 4 | 5;
  meta?: string | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (delta: -1 | 1) => void;
  confirm: string | null;
  onRemove: () => void;
  hidden?: boolean;
  onToggleHidden?: () => void;
  rail?: "start" | "continue";
  lead?: ReactNode;
  details?: EntryDetails;
  children?: ReactNode;
};

const REVEAL_CLASSES =
  "opacity-0 transition-opacity group-hover/entry:opacity-100 focus-within:opacity-100";

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
  const [detailsOpen, setDetailsOpen] = useState(() => !details?.complete);
  const layout = useTouchLayout();
  const pointerFine = layout === "fine";
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
      data-rail={rail}
      className={cn(
        "flex scroll-mt-36 flex-col gap-4 rounded-2xl bg-surface-muted p-4 not-first:mt-3 sm:p-5 lg:scroll-mt-24 xl:scroll-mt-36",
        continues && "rounded-t-none pt-0 not-first:mt-0 sm:pt-0",
        "[&:has(+[data-rail=continue])]:rounded-b-none [&:has(+[data-rail=continue])]:pb-0 sm:[&:has(+[data-rail=continue])]:pb-0",
      )}
    >
      {lead}
      <div
        {...HOLD_FOCUS}
        className={cn(
          "group/entry flex flex-col gap-4",
          onRail && "border-l border-border-strong/40 pl-4 sm:pl-6",
          continues && "pt-6",
          hidden && DIMMED_CLASSES,
        )}
      >
        <div className="flex flex-col sm:-mr-3 sm:flex-row sm:items-start sm:gap-1">
          <div className="min-w-0 flex-1 sm:py-2.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Heading
                id={headingId}
                tabIndex={-1}
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
                className={cn(
                  "text-muted hover:text-ink max-sm:-ml-3 max-sm:h-11 sm:mt-1",
                  // With a mouse the key ends the row and the tools appear to its left, so it never floats.
                  pointerFine && "sm:order-last",
                )}
              >
                {detailsOpen ? "Hide details" : "Edit details"}
                <ChevronDown className={cn("transition-transform", detailsOpen && "rotate-180")} />
              </Button>
            ) : null}
            {layout === "fine" ? (
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
            ) : (
              <div className="ml-auto flex items-center">
                <RowMenu
                  label={title}
                  triggerId={removeId}
                  canMoveUp={canMoveUp}
                  canMoveDown={canMoveDown}
                  onMove={onMove}
                  hidden={hidden}
                  onToggleHidden={onToggleHidden}
                  removeLabel="Remove"
                  onRemove={remove}
                />
              </div>
            )}
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
