import type { CSSProperties, ReactNode } from "react";
import { type DrawOptions, drawLimb, drawPaw } from "./otto-body";
import type { Expression } from "./otto-face";
import { OTTO_COLORS as C, OUTLINE } from "./palette";

export const OTTO_POSES = ["wave", "read", "think", "point", "cheer", "worried", "peek"] as const;
export type OttoPose = (typeof OTTO_POSES)[number];

// Class names are written in full so Tailwind finds them.
export type PartMotion = { idle: string; lively: string; origin: CSSProperties };

const PAGE_MOTION: PartMotion = {
  idle: "motion-safe:animate-otto-page",
  lively:
    "motion-safe:group-hover/otto:animate-otto-page-lively motion-safe:group-focus-within/otto:animate-otto-page-lively",
  origin: { transformBox: "view-box", transformOrigin: "100px 141px" },
};

const POINT_MOTION: PartMotion = {
  idle: "motion-safe:animate-otto-point",
  lively:
    "motion-safe:group-hover/otto:animate-otto-point-lively motion-safe:group-focus-within/otto:animate-otto-point-lively",
  origin: { transformBox: "view-box", transformOrigin: "122px 100px" },
};

const CHIN_MOTION: PartMotion = {
  idle: "motion-safe:animate-otto-chin",
  lively:
    "motion-safe:group-hover/otto:animate-otto-chin-lively motion-safe:group-focus-within/otto:animate-otto-chin-lively",
  origin: { transformBox: "view-box", transformOrigin: "142px 137px" },
};

const NOD_MOTION: PartMotion = {
  idle: "motion-safe:animate-otto-nod",
  lively: "",
  origin: { transformBox: "view-box", transformOrigin: "100px 104px" },
};

const TILT_MOTION: PartMotion = {
  idle: "motion-safe:animate-otto-tilt",
  lively:
    "motion-safe:group-hover/otto:animate-otto-tilt-lively motion-safe:group-focus-within/otto:animate-otto-tilt-lively",
  origin: { transformBox: "view-box", transformOrigin: "100px 100px" },
};

// Under the same variant as an animate-* class, so it wins over the count in that class's shorthand.
export const PLAY_TWICE = "motion-safe:[animation-iteration-count:2]";

export function moving(o: DrawOptions, motion: PartMotion | undefined, part: ReactNode): ReactNode {
  if (!o.lively || !motion) return part;
  return (
    <g className={o.settle ? `${motion.idle} ${PLAY_TWICE}` : motion.idle} style={motion.origin}>
      <g className={motion.lively || undefined} style={motion.origin}>
        {part}
      </g>
    </g>
  );
}

type PoseArt = {
  expression: Expression;
  head?: PartMotion;
  headOnly?: boolean;
  behind: (o: DrawOptions) => ReactNode;
  front?: (o: DrawOptions) => ReactNode;
};

const SHOULDER_LEFT = "M 78 100";
const SHOULDER_RIGHT = "M 122 100";

const WAVE_PIVOT: CSSProperties = { transformBox: "view-box", transformOrigin: "124px 102px" };

const RESUME_LINES = "M 80 137 H 120 M 80 144 H 116 M 80 151 H 120 M 80 158 H 108";

function restingArm(o: DrawOptions) {
  return (
    <g>
      {drawLimb(`${SHOULDER_LEFT} C 70 114 70 130 82 138`, o, 14, true)}
      {drawPaw(84, 139, o)}
    </g>
  );
}

const wave: PoseArt = {
  expression: { eyes: "open", brows: "none", mouth: "smile" },
  behind: (o) => (
    <g>
      {restingArm(o)}
      <g
        className={o.animated ? "motion-safe:animate-otto-wave" : undefined}
        style={o.animated ? WAVE_PIVOT : undefined}
      >
        {drawLimb(`${SHOULDER_RIGHT} C 140 104 154 96 160 76`, o)}
        {drawPaw(162, 70, o, 9.5, true)}
      </g>
    </g>
  ),
};

const read: PoseArt = {
  expression: { eyes: "reading", brows: "none", mouth: "calm" },
  head: NOD_MOTION,
  behind: (o) => (
    <g>
      {drawLimb(`${SHOULDER_LEFT} C 68 112 66 124 72 132`, o, 14, true)}
      {drawLimb(`${SHOULDER_RIGHT} C 132 112 134 124 128 132`, o, 14, true)}
    </g>
  ),
  front: (o) =>
    moving(
      o,
      PAGE_MOTION,
      <g>
        <g transform="rotate(-5 100 141)" strokeLinecap="round">
          <rect x={72} y={118} width={56} height={46} rx={3} fill={C.paper} {...OUTLINE} />
          <path d="M 80 128 H 104" stroke={C.fur} strokeWidth={3} />
          <path d={RESUME_LINES} stroke={C.paperInk} strokeWidth={2.2} />
        </g>
        {drawPaw(73, 134, o)}
        {drawPaw(127, 131, o)}
      </g>,
    ),
};

const think: PoseArt = {
  expression: { eyes: "up", brows: "curious", mouth: "hmm" },
  head: TILT_MOTION,
  behind: (o) => (
    <g>
      {restingArm(o)}
      {moving(o, CHIN_MOTION, drawLimb("M 142 137 C 137 127 124 119 115 110", o))}
    </g>
  ),
  front: (o) => moving(o, CHIN_MOTION, drawPaw(114, 103, o)),
};

const point: PoseArt = {
  expression: { eyes: "side", brows: "none", mouth: "smile" },
  behind: (o) => (
    <g>
      {restingArm(o)}
      {moving(
        o,
        POINT_MOTION,
        <g>
          {drawLimb(`${SHOULDER_RIGHT} C 138 112 152 114 164 110`, o)}
          {drawLimb("M 172 107.5 L 180 105.5", o, 5.5)}
          {drawPaw(166, 109, o)}
        </g>,
      )}
    </g>
  ),
};

const cheer: PoseArt = {
  expression: { eyes: "happy", brows: "none", mouth: "grin" },
  behind: (o) => (
    <g>
      {drawLimb(`${SHOULDER_LEFT} C 60 100 44 88 38 70`, o)}
      {drawLimb(`${SHOULDER_RIGHT} C 140 100 156 88 162 70`, o)}
      {drawPaw(36, 63, o, 9.5, true)}
      {drawPaw(164, 63, o, 9.5, true)}
    </g>
  ),
  front: () => (
    <path
      d="M 22 50 L 16 44 M 178 50 L 184 44 M 182 63 L 190 62"
      fill="none"
      stroke={C.line}
      strokeWidth={2}
      strokeLinecap="round"
    />
  ),
};

export const PEEK_EDGE_Y = 112;

const peek: PoseArt = {
  expression: { eyes: "reading", brows: "none", mouth: "calm" },
  headOnly: true,
  behind: () => null,
  front: (o) => (
    <g>
      {drawPaw(72, PEEK_EDGE_Y, o, 10, true)}
      {drawPaw(128, PEEK_EDGE_Y, o, 10, true)}
    </g>
  ),
};

const worried: PoseArt = {
  expression: { eyes: "open", brows: "worried", mouth: "frown" },
  behind: (o) => (
    <g>
      {drawLimb(`${SHOULDER_LEFT} C 72 112 80 122 93 124`, o, 14, true)}
      {drawLimb(`${SHOULDER_RIGHT} C 128 112 120 122 107 124`, o, 14, true)}
      {drawPaw(94, 123, o)}
      {drawPaw(106, 123, o)}
    </g>
  ),
};

export const POSE_ART: Record<OttoPose, PoseArt> = {
  wave,
  read,
  think,
  point,
  cheer,
  worried,
  peek,
};
