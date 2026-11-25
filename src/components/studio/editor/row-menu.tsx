"use client";

import { ArrowDown, ArrowUp, Ellipsis, Eye, EyeOff, Trash } from "lucide-react";
import { flushSync } from "react-dom";
import { buttonClasses } from "@/components/ui/button";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { ICON_ACTION_CLASSES } from "./move-buttons";

export type RowMenuProps = {
  label: string;
  triggerId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (delta: -1 | 1) => void;
  hidden?: boolean;
  onToggleHidden?: () => void;
  removeLabel: string;
  onRemove: () => void;
};

export function RowMenu({
  label,
  triggerId,
  canMoveUp,
  canMoveDown,
  onMove,
  hidden = false,
  onToggleHidden,
  removeLabel,
  onRemove,
}: RowMenuProps) {
  // A moved node drops focus: render now, then hand it back to this trigger.
  function move(delta: -1 | 1) {
    flushSync(() => onMove(delta));
    document.getElementById(triggerId)?.focus();
  }

  const t = useMessages("studioEditor").menus;
  const items: MenuEntry[] = [
    { label: t.moveUp, icon: ArrowUp, disabled: !canMoveUp, onSelect: () => move(-1) },
    { label: t.moveDown, icon: ArrowDown, disabled: !canMoveDown, onSelect: () => move(1) },
  ];
  if (onToggleHidden) {
    items.push(
      hidden
        ? { label: t.showPdf, icon: Eye, onSelect: onToggleHidden }
        : { label: t.hidePdf, icon: EyeOff, onSelect: onToggleHidden },
    );
  }
  items.push("separator", { label: removeLabel, icon: Trash, tone: "danger", onSelect: onRemove });

  return (
    <Menu
      label={fmt(t.options, { label })}
      align="end"
      triggerId={triggerId}
      triggerLabel={fmt(t.more, { label })}
      triggerClassName={buttonClasses({
        variant: "ghost",
        size: "icon-sm",
        className: ICON_ACTION_CLASSES,
      })}
      trigger={<Ellipsis aria-hidden />}
      items={items}
    />
  );
}
