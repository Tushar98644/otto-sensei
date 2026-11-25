"use client";

import { Music2, VolumeX } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { setFocusMusic, useFocusMusic } from "./use-focus-music";

export function FocusMusicToggle({
  size = "sm",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const t = useMessages("dashboard").focusMusic;
  const on = useFocusMusic();
  const Icon = on ? Music2 : VolumeX;
  return (
    <button
      type="button"
      data-focus-music=""
      aria-pressed={on}
      aria-label={t.label}
      title={on ? t.turnOff : t.turnOn}
      onClick={() => setFocusMusic(!on)}
      className={buttonClasses({
        variant: "ghost",
        size: size === "sm" ? "icon-sm" : "icon",
        className: cn("text-muted hover:text-ink aria-pressed:text-ink", className),
      })}
    >
      <Icon aria-hidden className={size === "sm" ? "size-4" : "size-5"} />
    </button>
  );
}
