import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { drawOtto } from "./draw-otto";
import type { OttoPose } from "./otto-poses";
import { OTTO_VIEWBOX } from "./palette";

export { OTTO_POSES, PEEK_EDGE_Y, type OttoPose } from "./otto-poses";

export type OttoProps = {
  pose?: OttoPose;
  // Width and height in px. Every pose shares one square viewBox, so the box never changes.
  size?: number;
  className?: string;
  title?: string;
  // A blink every few seconds, and the wave pose waves twice. Always off for users who prefer
  // reduced motion. Turn it off in work screens, where he should sit still.
  animated?: boolean;
  // Otto at work, for the dashboard home's action cards only: his pose's idle loop, and a livelier
  // take while the nearest ancestor with the `group/otto` class is hovered or focused.
  lively?: boolean;
  // Seconds into his loops he starts (negative starts mid-loop), so Ottos side by side don't move
  // in step.
  delay?: number;
};

// Pure inline SVG with no hooks, so it renders in server and client components alike.
export function Otto({
  pose = "wave",
  size = 160,
  className,
  title = "Otto the otter",
  animated = true,
  lively = false,
  delay,
}: OttoProps) {
  return (
    <svg
      viewBox={OTTO_VIEWBOX}
      width={size}
      height={size}
      role="img"
      aria-label={title}
      // The waving paw swings a little past the box; clipping it would cut his paw off mid-wave.
      className={cn("shrink-0 overflow-visible", className)}
      style={delay === undefined ? undefined : ({ "--otto-delay": `${delay}s` } as CSSProperties)}
    >
      <title>{title}</title>
      {drawOtto(pose, { animated, lively, themed: true })}
    </svg>
  );
}
