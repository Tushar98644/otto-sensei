import { OTTO_COLORS as C, OUTLINE } from "./palette";

// Plain functions, not components: Satori (the OG image) only takes intrinsic SVG elements.

export type DrawOptions = {
  animated: boolean;
  lively?: boolean;
  themed: boolean;
};

export function fur(o: DrawOptions) {
  return { fill: C.fur, className: o.themed ? "fill-otter" : undefined };
}

export function cream(o: DrawOptions) {
  return { fill: C.cream, className: o.themed ? "fill-otter-light" : undefined };
}

const BODY =
  "M 100 98 C 123 98 137 113 141 134 C 145 155 146 172 137 180 C 128 186 114 187 100 187 " +
  "C 86 187 72 186 63 180 C 54 172 55 155 59 134 C 63 113 77 98 100 98 Z";
const BELLY =
  "M 100 118 C 115 118 125 133 126 150 C 127 167 116 178 100 178 C 84 178 73 167 74 150 " +
  "C 75 133 85 118 100 118 Z";
const TAIL = "M 134 164 C 156 168 177 166 188 146 C 189 166 168 187 134 184 Z";
const HEAD =
  "M 100 33 C 131 33 151 47 153.5 70 C 156 92 132 104 100 104 C 68 104 44 92 46.5 70 " +
  "C 49 47 69 33 100 33 Z";
const HEAD_LINE =
  "M 106.5 33.3 C 133 35 151.2 48.5 153.5 70 C 156 92 132 104 100 104 " +
  "C 68 104 44 92 46.5 70 C 48.8 48.5 67 35 93.5 33.3";
const TUFT = "M 94 36.5 C 93 30.5 96 26.5 101 27 M 101 35.5 C 102 30.5 106 28.5 111 30";
const EARS = [
  { cx: 48.5, cy: 50, inner: 47.5, line: "M 54.9 51.1 A 6.5 6.5 0 1 0 47.4 56.4" },
  { cx: 151.5, cy: 50, inner: 152.5, line: "M 145.1 51.1 A 6.5 6.5 0 1 1 152.6 56.4" },
] as const;
const MUZZLE =
  "M 100 75.5 C 108 69.5 127.5 70 131 84 C 134.5 98 118 103.5 107 100 C 104 99 102 98 100 98 " +
  "C 98 98 96 99 93 100 C 82 103.5 65.5 98 69 84 C 72.5 70 92 69.5 100 75.5 Z";
const WHISKERS = [
  "M 70.5 87 C 63 85 55 85 44 87.5",
  "M 71.5 91.5 C 64.5 92.5 57.5 94.5 50 99",
  "M 129.5 87 C 137 85 145 85 156 87.5",
  "M 128.5 91.5 C 135.5 92.5 142.5 94.5 150 99",
] as const;
const NOSE =
  "M 91 77.5 C 91 72.8 109 72.8 109 77.5 C 109 82 103 85 100 85 " +
  "C 97 85 91 82 91 77.5 Z";
const LENS = { r: 12, stroke: C.line, strokeWidth: 2 };
const BRIDGE = "M 90 61.5 C 93 58.5 107 58.5 110 61.5";
const TEMPLES = "M 66.2 60 L 52 56 M 133.8 60 L 148 56";

export function drawTail(o: DrawOptions) {
  return <path d={TAIL} {...fur(o)} {...OUTLINE} />;
}

export function drawBody(o: DrawOptions) {
  return (
    <g>
      <path d={BODY} {...fur(o)} {...OUTLINE} />
      <path d={BELLY} {...cream(o)} />
      <ellipse cx={82} cy={184} rx={13} ry={7} fill={C.furShade} />
      <ellipse cx={118} cy={184} rx={13} ry={7} fill={C.furShade} />
    </g>
  );
}

export function drawHead(o: DrawOptions) {
  return (
    <g>
      {EARS.map((ear) => (
        <g key={ear.cx}>
          <circle cx={ear.cx} cy={ear.cy} r={6.5} {...fur(o)} />
          <circle cx={ear.inner} cy={ear.cy - 0.5} r={3} fill={C.furShade} />
          <path d={ear.line} fill="none" {...OUTLINE} />
        </g>
      ))}
      <path d={HEAD} {...fur(o)} />
      <path d={HEAD_LINE} fill="none" {...OUTLINE} />
      <path d={TUFT} fill="none" {...OUTLINE} strokeWidth={2} />
    </g>
  );
}

export function drawMuzzle(o: DrawOptions) {
  return (
    <g>
      <path d={MUZZLE} {...cream(o)} />
      <g fill="none" stroke={C.line} strokeWidth={1.25} strokeLinecap="round" opacity={0.5}>
        {WHISKERS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </g>
  );
}

export function drawNose() {
  return <path d={NOSE} fill={C.nose} />;
}

export function drawGlasses() {
  return (
    <g fill="none" strokeLinecap="round">
      <circle cx={78} cy={63} {...LENS} />
      <circle cx={122} cy={63} {...LENS} />
      <path d={BRIDGE} stroke={C.line} strokeWidth={2} />
      <path d={TEMPLES} stroke={C.line} strokeWidth={2} />
    </g>
  );
}

const BODY_JOIN_LENGTH = 22;
const BODY_JOIN_SHIFT = 2.6;

export function drawLimb(d: string, o: DrawOptions, width = 14, fromBody = false) {
  const startX = Number(/^M\s*(-?[\d.]+)/.exec(d)?.[1] ?? 100);
  const towardMiddle = startX < 100 ? BODY_JOIN_SHIFT : -BODY_JOIN_SHIFT;
  const furStroke = { stroke: C.fur, className: o.themed ? "stroke-otter" : undefined };
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={C.line} strokeWidth={width + 4.5} />
      <path d={d} strokeWidth={width} {...furStroke} />
      {fromBody ? (
        <path
          d={d}
          transform={`translate(${towardMiddle} 0)`}
          strokeWidth={width + 2}
          strokeLinecap="butt"
          strokeDasharray={`${BODY_JOIN_LENGTH} 1000`}
          {...furStroke}
        />
      ) : null}
    </g>
  );
}

export function drawPaw(cx: number, cy: number, o: DrawOptions, r = 8.5, toes = false) {
  const toeTop = cy - r + 1;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} {...fur(o)} {...OUTLINE} />
      {toes ? (
        <path
          d={`M ${cx - 3} ${toeTop} v 3.5 M ${cx + 3} ${toeTop} v 3.5`}
          stroke={C.line}
          strokeWidth={1.75}
          strokeLinecap="round"
        />
      ) : null}
    </g>
  );
}
