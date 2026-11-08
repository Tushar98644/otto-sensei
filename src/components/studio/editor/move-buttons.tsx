"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { MouseEvent } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Quiet icon buttons for row and card controls. aria-disabled ones look disabled but keep focus.
export const ICON_ACTION_CLASSES =
  "text-muted hover:text-ink aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent";

export type MoveButtonsProps = {
  // What moves, as read by screen readers: "Move {label} up".
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (delta: -1 | 1) => void;
  className?: string;
};

// aria-disabled rather than disabled: after a move to the top or bottom, focus has to stay on the
// button that was pressed, and a disabled button can't hold focus.
export function MoveButtons({
  label,
  canMoveUp,
  canMoveDown,
  onMove,
  className,
}: MoveButtonsProps) {
  function move(event: MouseEvent<HTMLButtonElement>, delta: -1 | 1, allowed: boolean) {
    if (!allowed) return;
    const button = event.currentTarget;
    // React reorders a list by moving DOM nodes, and a moved node drops focus. Render now, then
    // put focus back; focus() also scrolls the moved item into view.
    flushSync(() => onMove(delta));
    button.focus();
  }

  return (
    <div className={cn("flex shrink-0 items-center", className)}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Move ${label} up`}
        aria-disabled={canMoveUp ? undefined : true}
        onClick={(event) => move(event, -1, canMoveUp)}
        className={ICON_ACTION_CLASSES}
      >
        <ArrowUp />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Move ${label} down`}
        aria-disabled={canMoveDown ? undefined : true}
        onClick={(event) => move(event, 1, canMoveDown)}
        className={ICON_ACTION_CLASSES}
      >
        <ArrowDown />
      </Button>
    </div>
  );
}
