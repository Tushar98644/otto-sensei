import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Loose ink sketches in the margins of the marketing pages. Drawn by hand as plain paths, never
// generated. Budget: 3 in the hero (the squiggle plus 2), 1 in any other marketing section, none
// in the studio, dialogs, account or legal pages, and never on top of text or controls. All of
// them are decoration, so they stay hidden from screen readers.

type DoodleProps = { className?: string };

type SketchProps = {
  viewBox: string;
  width?: number;
  className?: string;
  // Stretch to the box instead of keeping the drawing's shape (the squiggle under a word).
  stretch?: boolean;
  children: ReactNode;
};

// Every path sets vectorEffect="non-scaling-stroke" (it doesn't inherit): it keeps the line weight
// in screen pixels, so a doodle drawn bigger or stretched still looks like the same pen.
function Sketch({ viewBox, width = 1.75, className, stretch = false, children }: SketchProps) {
  return (
    <svg
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio={stretch ? "none" : undefined}
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("pointer-events-none shrink-0 overflow-visible", className)}
    >
      {children}
    </svg>
  );
}

// Under one word of a headline. Violet: it is one of the two accent marks on its screen. Drawn
// like a quick pencil scribble rather than a wave: humps of uneven height that lean right and get
// narrower as the hand speeds up, ending in a stroke that overshoots and hooks back. It keeps its
// shape (never stretched), so give it a width and let the height follow.
export function Squiggle({ className }: DoodleProps) {
  return (
    <Sketch viewBox="0 0 218 14" width={2.5} className={cn("text-accent", className)}>
      <path
        vectorEffect="non-scaling-stroke"
        d="M2 10C5.6 5.2 10.1 3.6 18.5 3.6C25.1 3.6 28.4 8.5 32 11.2C35.2 7.5 39.3 6.2 46.9 6.2C52.8 6.2 55.8 8.9 59 10.4C62.1 4.7 66 2.8 73.3 2.8C79 2.8 81.9 8.7 85 11.8C87.8 7.9 91.2 6.6 97.7 6.6C102.7 6.6 105.2 9.2 108 10.6C110.6 5.2 113.9 3.4 120.1 3.4C124.9 3.4 127.4 8.6 130 11.4C132.4 7.2 135.4 5.8 141 5.8C145.4 5.8 147.6 8.7 150 10.2C152.2 4.8 154.9 3 159.9 3C163.9 3 165.8 8.2 168 11C169.9 6.9 172.3 5.6 176.8 5.6C180.3 5.6 182.1 8.8 184 10.6C185.7 5.7 187.8 4 191.7 4C194.8 4 196.3 8.4 198 10.8C201 6.3 207 2.6 212 2.8C216 3 214.5 6.8 209 7.6"
      />
    </Sketch>
  );
}

// A loose hand-drawn arrow from one thing to the next, curving down and to the right.
export function Arrow({ className }: DoodleProps) {
  return (
    <Sketch viewBox="0 0 96 64" className={className}>
      <path
        vectorEffect="non-scaling-stroke"
        d="M8 12C34 6 62 18 78 46M65 41C70 43 74 45 78 47C79 42 80 37 81 33"
      />
    </Sketch>
  );
}

const BUBBLE_MARKS = {
  question: "M33 21C33 15 43 15 43 21C43 26 38 26 38 31M38 36.5V37",
  bang: "M38 16V29M38 35.5V36",
  lines: "M26 19H48M26 26H46M26 33H39",
} as const;

export type BubbleProps = DoodleProps & {
  mark?: keyof typeof BUBBLE_MARKS;
  // Fill with the surface the bubble sits on, so lines behind it don't show through.
  fillClassName?: string;
};

export function Bubble({
  mark = "question",
  fillClassName = "fill-background",
  className,
}: BubbleProps) {
  return (
    <Sketch viewBox="0 0 72 56" className={className}>
      <path
        vectorEffect="non-scaling-stroke"
        className={fillClassName}
        d="M18 40C7 34 6 18 19 10C31 3 51 4 61 13C70 22 66 35 54 41C45 46 33 46 25 43C21 47 16 50 10 52C13 48 15 45 18 40Z"
      />
      <path vectorEffect="non-scaling-stroke" d={BUBBLE_MARKS[mark]} />
    </Sketch>
  );
}

// Three short strokes of "something happened here", beside a moment worth noticing.
export function Dashes({ className }: DoodleProps) {
  return (
    <Sketch viewBox="0 0 32 32" className={className}>
      <path vectorEffect="non-scaling-stroke" d="M6 22L2 26M14 14L12 4M22 20L30 16" />
    </Sketch>
  );
}

// A quick pencil circle around one number. Violet: one of the two accent marks on its screen.
// Its ends overlap on purpose, the way a circle drawn in one go does.
export function LooseCircle({ className }: DoodleProps) {
  return (
    <Sketch viewBox="0 0 120 48" width={2} stretch className={cn("text-accent", className)}>
      <path
        vectorEffect="non-scaling-stroke"
        d="M62 6C30 4 6 12 6 25C6 38 34 44 64 43C94 42 115 33 113 21C111 10 86 4 58 7C50 8 44 10 40 12"
      />
    </Sketch>
  );
}
