"use client";

import { Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HideToggle } from "./hidden-chip";
import { ICON_ACTION_CLASSES, MoveButtons } from "./move-buttons";
import { RowMenu } from "./row-menu";

export type LineToolsProps = {
  position: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  hidden: boolean;
  deleteId: string;
  onMove: (delta: -1 | 1) => void;
  onToggleHidden: () => void;
  onRemove: () => void;
  className?: string;
};

export function LineTools({
  position,
  canMoveUp,
  canMoveDown,
  hidden,
  deleteId,
  onMove,
  onToggleHidden,
  onRemove,
  className,
}: LineToolsProps) {
  const label = `line ${position}`;
  return (
    <div className={cn("flex flex-1 justify-end", className)}>
      <div className="-mr-2 flex items-center">
        <MoveButtons
          label={label}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onMove={onMove}
        />
        <HideToggle label={label} hidden={hidden} onToggle={onToggleHidden} />
        <Button
          id={deleteId}
          variant="ghost"
          size="icon"
          aria-label={`Delete ${label}`}
          onClick={onRemove}
          className={ICON_ACTION_CLASSES}
        >
          <Trash />
        </Button>
      </div>
    </div>
  );
}

// Touch screens get one menu per line; its trigger takes the delete key's id so focus hand-offs still land.
export function LineMenu({
  position,
  canMoveUp,
  canMoveDown,
  hidden,
  deleteId,
  onMove,
  onToggleHidden,
  onRemove,
  className,
}: LineToolsProps) {
  return (
    <div className={cn("flex", className)}>
      <RowMenu
        label={`line ${position}`}
        triggerId={deleteId}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onMove={onMove}
        hidden={hidden}
        onToggleHidden={onToggleHidden}
        removeLabel="Delete line"
        onRemove={onRemove}
      />
    </div>
  );
}
