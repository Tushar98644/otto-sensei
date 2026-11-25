"use client";

import { Ellipsis, Eye, EyeOff, Pencil, Trash } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { ICON_ACTION_CLASSES } from "./move-buttons";

export type SectionOptions = {
  rename?: {
    value: string;
    placeholder: string;
    maxLength: number;
    onSave: (title: string) => void;
  };
  hidden?: boolean;
  onToggleHidden?: () => void;
  remove?: { confirm: string | null; run: () => void; resumeId: string };
};

export type SectionMenuProps = {
  title: string;
  options: SectionOptions;
  onRename: () => void;
  onRemove: () => void;
};

export function SectionMenu({ title, options, onRename, onRemove }: SectionMenuProps) {
  const { onToggleHidden } = options;
  const hidden = options.hidden === true;
  const t = useMessages("studioEditor").menus;
  const items: MenuEntry[] = [];
  if (options.rename) items.push({ label: t.renameSection, icon: Pencil, onSelect: onRename });
  if (onToggleHidden) {
    items.push(
      hidden
        ? {
            label: t.showVersion,
            icon: Eye,
            description: t.showVersionHint,
            onSelect: onToggleHidden,
          }
        : {
            label: t.hideVersion,
            icon: EyeOff,
            description: t.hideVersionHint,
            onSelect: onToggleHidden,
          },
    );
  }
  if (options.remove) {
    if (items.length > 0) items.push("separator");
    items.push({ label: t.removeSection, icon: Trash, tone: "danger", onSelect: onRemove });
  }

  return (
    <Menu
      label={fmt(t.options, { label: title })}
      align="end"
      triggerLabel={fmt(t.more, { label: title })}
      triggerClassName={buttonClasses({
        variant: "ghost",
        size: "icon",
        className: ICON_ACTION_CLASSES,
      })}
      trigger={<Ellipsis aria-hidden />}
      items={items}
    />
  );
}
