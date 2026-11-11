import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BubbleTone = "default" | "ink";

export type SpeechBubbleProps = {
  children: ReactNode;
  tone?: BubbleTone;
  className?: string;
  live?: boolean;
};

const TONES: Record<BubbleTone, string> = {
  default: "bg-surface-muted text-ink",
  ink: "bg-ink text-white",
};

export function SpeechBubble({
  children,
  tone = "default",
  className,
  live = false,
}: SpeechBubbleProps) {
  return (
    <div
      className={cn(
        "w-fit max-w-full rounded-2xl px-4 py-3 text-base/7 text-pretty",
        TONES[tone],
        className,
      )}
      aria-live={live ? "polite" : undefined}
      aria-atomic={live ? true : undefined}
    >
      {children}
    </div>
  );
}
