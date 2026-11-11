"use client";

import { Ellipsis, Eye, EyeOff, Pencil, Trash } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Menu, type MenuEntry } from "@/components/ui/menu";
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
  const items: MenuEntry[] = [];
  if (options.rename) items.push({ label: "Rename section", icon: Pencil, onSelect: onRename });
  if (onToggleHidden) {
    items.push(
      hidden
        ? {
            label: "Show in this version",
            icon: Eye,
            description: "Put it back in the PDF",
            onSelect: onToggleHidden,
          }
        : {
            label: "Hide in this version",
            icon: EyeOff,
            description: "It stays here, but the PDF leaves it out",
            onSelect: onToggleHidden,
          },
    );
  }
  if (options.remove) {
    if (items.length > 0) items.push("separator");
    items.push({ label: "Remove section", icon: Trash, tone: "danger", onSelect: onRemove });
  }

  return (
    <Menu
      label={`Options for ${title}`}
      align="end"
      triggerLabel={`More for ${title}`}
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
