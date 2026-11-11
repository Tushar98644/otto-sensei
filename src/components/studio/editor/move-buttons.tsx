"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { MouseEvent } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ICON_ACTION_CLASSES =
  "text-muted hover:text-ink aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent";

export type MoveButtonsProps = {
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (delta: -1 | 1) => void;
  className?: string;
};

// aria-disabled, not disabled: focus must stay on the pressed button at the top or bottom.
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
    // A moved DOM node drops focus: render now, then put it back (focus() also scrolls into view).
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
