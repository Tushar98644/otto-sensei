import type { CSSProperties } from "react";
import type { DrawOptions } from "./otto-body";
import { OTTO_COLORS as C } from "./palette";

export type EyeStyle = "open" | "reading" | "up" | "side" | "happy";
export type BrowStyle = "none" | "worried" | "curious";
export type MouthStyle = "smile" | "calm" | "hmm" | "grin" | "frown";

export type Expression = { eyes: EyeStyle; brows: BrowStyle; mouth: MouthStyle };

const EYE_X = [78, 122] as const;
const EYE_Y = 62;

const GAZE: Record<Exclude<EyeStyle, "happy">, readonly [number, number]> = {
  open: [0, 0],
  reading: [0, 5],
  up: [1.5, -2.5],
  side: [2.5, 0],
};

const PUPIL: Record<Exclude<EyeStyle, "happy">, { rx: number; ry: number }> = {
  open: { rx: 6, ry: 7 },
  reading: { rx: 5.5, ry: 5.5 },
  up: { rx: 6, ry: 7 },
  side: { rx: 6, ry: 7 },
};

const BLINK_ORIGIN: CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };

export function drawFace(expression: Expression, o: DrawOptions) {
  return (
    <g>
      {drawMouth(expression.mouth)}
      {drawEyes(expression.eyes, o)}
      {drawBrows(expression.brows)}
    </g>
  );
}

function drawEyes(style: EyeStyle, o: DrawOptions) {
  if (style === "happy") {
    return (
      <g fill="none" stroke={C.eye} strokeWidth={2.5} strokeLinecap="round">
        <path d="M 72 64 C 74 58.5 82 58.5 84 64" />
        <path d="M 116 64 C 118 58.5 126 58.5 128 64" />
      </g>
    );
  }

  const [dx, dy] = GAZE[style];
  const { rx, ry } = PUPIL[style];
  return (
    <g
      className={o.animated ? "motion-safe:animate-otto-blink" : undefined}
      style={o.animated ? BLINK_ORIGIN : undefined}
    >
      {EYE_X.map((x) => (
        <g key={x}>
          <ellipse cx={x + dx} cy={EYE_Y + dy} rx={rx} ry={ry} fill={C.eye} />
          <circle cx={x + dx + rx * 0.37} cy={EYE_Y + dy - ry * 0.39} r={ry * 0.29} fill={C.shine} />
        </g>
      ))}
    </g>
  );
}

function drawBrows(style: BrowStyle) {
  if (style === "none") return null;
  const d =
    style === "worried"
      ? "M 69 48 C 74 46.5 79 44.5 84 42 M 116 42 C 121 44.5 126 46.5 131 48"
      : "M 70 46.5 C 74 45.5 80 45.5 84 46.5 M 115 43 C 119 38.5 126 38.5 130 42";
  return <path d={d} fill="none" stroke={C.line} strokeWidth={2} strokeLinecap="round" />;
}

const PHILTRUM = "M 100 85 V 88";
const LINE_MOUTHS: Record<Exclude<MouthStyle, "grin">, string> = {
  smile: "M 92 87.5 C 94 91.5 98 91.5 100 88 C 102 91.5 106 91.5 108 87.5",
  calm: "M 95.5 89 C 97 91 99 91 100 88.5 C 101 91 103 91 104.5 89",
  hmm: "M 94 91 C 97 89 101 89 106.5 90.5",
  frown: "M 94 92.5 C 96 89 104 89 106 92.5",
};
const GRIN = "M 90 88 C 91 99 109 99 110 88 C 104 90 96 90 90 88 Z";
const TONGUE = "M 95 94.3 C 97 97.7 103 97.7 105 94.3 C 102 92.9 98 92.9 95 94.3 Z";

function drawMouth(style: MouthStyle) {
  const line = { fill: "none", stroke: C.line, strokeWidth: 2, strokeLinecap: "round" } as const;
  if (style !== "grin") return <path d={`${PHILTRUM} ${LINE_MOUTHS[style]}`} {...line} />;
  return (
    <g>
      <path d={PHILTRUM} {...line} />
      <path d={GRIN} fill={C.mouth} stroke={C.line} strokeWidth={2} strokeLinejoin="round" />
      <path d={TONGUE} fill={C.tongue} />
    </g>
  );
}
