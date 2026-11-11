import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { drawOtto } from "./draw-otto";
import type { OttoPose } from "./otto-poses";
import { OTTO_VIEWBOX } from "./palette";

export { OTTO_POSES, PEEK_EDGE_Y, type OttoPose } from "./otto-poses";

export type OttoProps = {
  pose?: OttoPose;
  size?: number;
  className?: string;
  title?: string;
  animated?: boolean;
  lively?: boolean;
  delay?: number;
};

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
      className={cn("shrink-0 overflow-visible", className)}
      style={delay === undefined ? undefined : ({ "--otto-delay": `${delay}s` } as CSSProperties)}
    >
      <title>{title}</title>
      {drawOtto(pose, { animated, lively, themed: true })}
    </svg>
  );
}
