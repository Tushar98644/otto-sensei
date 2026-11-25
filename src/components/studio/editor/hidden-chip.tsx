"use client";

import { EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { cn } from "@/lib/utils";
import { ICON_ACTION_CLASSES } from "./move-buttons";

export const DIMMED_CLASSES = "[&_:is(input,textarea)]:text-muted";

export function HiddenChip({ className }: { className?: string }) {
  const t = useMessages("studioEditor").hidden;
  return (
    <Badge variant="neutral" className={className}>
      <EyeOff className="text-subtle" />
      {t.chip}
    </Badge>
  );
}

export type HideToggleProps = {
  label: string;
  hidden: boolean;
  onToggle: () => void;
  className?: string;
};

export function HideToggle({ label, hidden, onToggle, className }: HideToggleProps) {
  const t = useMessages("studioEditor").hidden;
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={fmt(t.toggle, { label })}
      aria-pressed={hidden}
      onClick={onToggle}
      className={cn(ICON_ACTION_CLASSES, "aria-pressed:bg-ink/8 aria-pressed:text-ink", className)}
    >
      <EyeOff />
    </Button>
  );
}
