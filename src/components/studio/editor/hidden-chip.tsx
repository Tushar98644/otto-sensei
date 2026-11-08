"use client";

import { EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ICON_ACTION_CLASSES } from "./move-buttons";

export const HIDDEN_LABEL = "Hidden in PDF";

// Hidden content stays editable, so it dims by color rather than opacity: muted text keeps 4.5:1
// on white, and the chip says in words why it looks different.
export const DIMMED_CLASSES = "[&_:is(input,textarea)]:text-muted";

export function HiddenChip({ className }: { className?: string }) {
  return (
    <Badge variant="neutral" className={className}>
      <EyeOff className="text-subtle" />
      {HIDDEN_LABEL}
    </Badge>
  );
}

export type HideToggleProps = {
  // What it hides, as read by screen readers: "Hide {label} in this version".
  label: string;
  hidden: boolean;
  onToggle: () => void;
  className?: string;
};

// A toggle with one name: pressed means hidden. The name never flips, so a screen reader hears
// "Hide line 2 in this version, pressed" rather than a button that changes what it says.
export function HideToggle({ label, hidden, onToggle, className }: HideToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Hide ${label} in this version`}
      aria-pressed={hidden}
      onClick={onToggle}
      className={cn(ICON_ACTION_CLASSES, "aria-pressed:bg-ink/8 aria-pressed:text-ink", className)}
    >
      <EyeOff />
    </Button>
  );
}
