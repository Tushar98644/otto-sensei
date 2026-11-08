import type { ReactNode } from "react";
import { OttoMark } from "@/components/site/otto-mark";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

export type OttoNoteProps = {
  // First person, 18 words at most, about facts in the user's own file (see lines.ts).
  message: ReactNode;
  // Facts only, after "Otto ·": counts, file type, pages. Leave it out when there are none.
  meta?: ReactNode;
  // Actions under the message, e.g. buttons.
  children?: ReactNode;
  // On by default: Otto's line usually reports what just happened (reading, failed, done). Turn it
  // off when the message changes while typing, or every keystroke would be read out.
  live?: boolean;
  size?: "sm" | "md";
  className?: string;
};

// Otto's message: his logo head in a round avatar, a gray meta line and his words. No bubble, border,
// tail or fill, so it reads like a note in the margin rather than a chat widget. This is how he
// speaks in the studio and in dialogs; the full-body Otto is for empty states and big moments.
export function OttoNote({
  message,
  meta,
  children,
  live = true,
  size = "md",
  className,
}: OttoNoteProps) {
  const small = size === "sm";
  return (
    <div className={cn("flex flex-col", className)}>
      {/* The avatar centres on the name and message together (the owner found it top-aligned
          looked off); actions sit below, so they never pull it down. */}
      <div className="flex items-center gap-3">
        {/* Otto's own face, as on the logo, in a round avatar like a message sender's: the thin
            sketch read as a doodle, not as him. */}
        <span
          aria-hidden
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-border",
            small ? "size-7" : "size-9",
          )}
        >
          <OttoMark className={small ? "size-5" : "size-7"} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm/5 text-subtle">
            <span className="font-medium text-ink">{BRAND.mascotName}</span>
            {meta ? <> · {meta}</> : null}
          </p>
          <p
            aria-live={live ? "polite" : undefined}
            aria-atomic={live ? true : undefined}
            className={cn("mt-1 text-pretty text-ink", small ? "text-sm/6" : "text-base/7")}
          >
            {message}
          </p>
        </div>
      </div>
      {/* Indented by the avatar plus the gap, so actions line up with the words. */}
      {children ? (
        <div className={cn("mt-3 flex flex-wrap gap-2", small ? "pl-10" : "pl-12")}>{children}</div>
      ) : null}
    </div>
  );
}
