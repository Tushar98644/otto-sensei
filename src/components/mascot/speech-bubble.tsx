import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BubbleTone = "default" | "ink";

export type SpeechBubbleProps = {
  children: ReactNode;
  // "ink" is the user's own reply in a conversation with Otto.
  tone?: BubbleTone;
  className?: string;
  // Announces changes to screen readers, for messages that update after an action.
  live?: boolean;
};

const TONES: Record<BubbleTone, string> = {
  default: "bg-surface-muted text-ink",
  ink: "bg-ink text-white",
};

// A plain rounded message: no border and no tail. Otto himself speaks through OttoNote; this is
// for the other side of the conversation.
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
