import type { CSSProperties } from "react";

// Ported from Nuu-maan/portfolio-template (MIT, see ./LICENSE.txt): its own mascots, drawn once and reused.

const INK = "#1a1a2e";
const fill = (name: string, fallback: string): CSSProperties => ({
  fill: `var(--${name}, ${fallback})`,
});

export type MascotKind =
  "mascot" | "daisy" | "globe" | "hand" | "point" | "cloud" | "star" | "sparkle" | "flower";

const BOXES: Record<MascotKind, string> = {
  mascot: "0 0 240 260",
  daisy: "0 0 200 280",
  globe: "0 0 200 280",
  hand: "0 0 220 220",
  point: "0 0 200 220",
  cloud: "0 0 200 100",
  star: "0 0 64 64",
  sparkle: "0 0 40 40",
  flower: "0 0 64 64",
};

export function MascotDefs() {
  return (
    <svg className="defs" width="0" height="0" aria-hidden focusable="false">
      <defs>
        <symbol id="pf-bubble-mascot" viewBox={BOXES.mascot}>
          <ellipse cx="120" cy="248" rx="78" ry="8" fill={INK} opacity="0.18" />
          <ellipse
            cx="86"
            cy="232"
            rx="28"
            ry="14"
            style={fill("body", "#7fd3f7")}
            stroke={INK}
            strokeWidth="4"
          />
          <ellipse
            cx="154"
            cy="232"
            rx="28"
            ry="14"
            style={fill("body", "#7fd3f7")}
            stroke={INK}
            strokeWidth="4"
          />
          <ellipse cx="86" cy="232" rx="14" ry="6" style={fill("belly", "#eaf6ff")} />
          <ellipse cx="154" cy="232" rx="14" ry="6" style={fill("belly", "#eaf6ff")} />
          <path
            d="M40 130 C 40 60, 200 60, 200 130 C 200 210, 140 232, 120 232 C 100 232, 40 210, 40 130 Z"
            style={fill("body", "#7fd3f7")}
            stroke={INK}
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <ellipse
            cx="120"
            cy="160"
            rx="58"
            ry="62"
            style={fill("belly", "#eaf6ff")}
            stroke={INK}
            strokeWidth="4"
          />
          <ellipse
            cx="40"
            cy="158"
            rx="18"
            ry="26"
            style={fill("body", "#7fd3f7")}
            stroke={INK}
            strokeWidth="4"
            transform="rotate(-18 40 158)"
          />
          <ellipse
            cx="200"
            cy="158"
            rx="18"
            ry="26"
            style={fill("body", "#7fd3f7")}
            stroke={INK}
            strokeWidth="4"
            transform="rotate(18 200 158)"
          />
          <ellipse
            cx="68"
            cy="120"
            rx="14"
            ry="8"
            style={fill("cheek", "#ff8fbf")}
            opacity="0.85"
          />
          <ellipse
            cx="172"
            cy="120"
            rx="14"
            ry="8"
            style={fill("cheek", "#ff8fbf")}
            opacity="0.85"
          />
          <ellipse cx="92" cy="110" rx="18" ry="22" fill="#fff" stroke={INK} strokeWidth="4" />
          <ellipse cx="148" cy="110" rx="18" ry="22" fill="#fff" stroke={INK} strokeWidth="4" />
          <circle cx="95" cy="115" r="8" fill={INK} />
          <circle cx="151" cy="115" r="8" fill={INK} />
          <circle cx="98" cy="111" r="3" fill="#fff" />
          <circle cx="154" cy="111" r="3" fill="#fff" />
          <path
            d="M105 140 Q120 152 135 140"
            fill="none"
            stroke={INK}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M118 64 Q120 50 124 64"
            style={fill("body", "#7fd3f7")}
            stroke={INK}
            strokeWidth="4"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="pf-bubble-daisy" viewBox={BOXES.daisy}>
          <ellipse cx="100" cy="268" rx="60" ry="10" fill={INK} opacity="0.2" />
          <ellipse
            cx="100"
            cy="260"
            rx="58"
            ry="14"
            style={fill("center", "#ffd24c")}
            stroke={INK}
            strokeWidth="4"
          />
          <ellipse cx="100" cy="256" rx="58" ry="6" fill="#fff" opacity="0.4" />
          <rect
            x="80"
            y="200"
            width="10"
            height="50"
            rx="5"
            style={fill("body", "#7fd3f7")}
            stroke={INK}
            strokeWidth="3"
          />
          <rect
            x="110"
            y="200"
            width="10"
            height="50"
            rx="5"
            style={fill("body", "#7fd3f7")}
            stroke={INK}
            strokeWidth="3"
          />
          <ellipse
            cx="60"
            cy="170"
            rx="20"
            ry="10"
            fill="#7ec96a"
            stroke={INK}
            strokeWidth="3"
            transform="rotate(-30 60 170)"
          />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((turn) => (
            <ellipse
              key={turn}
              cx="100"
              cy="60"
              rx="22"
              ry="30"
              style={fill("petal", "#fff")}
              stroke={INK}
              strokeWidth="4"
              transform={`rotate(${turn} 100 100)`}
            />
          ))}
          <circle
            cx="100"
            cy="100"
            r="36"
            style={fill("center", "#ffd24c")}
            stroke={INK}
            strokeWidth="4"
          />
          <ellipse cx="88" cy="98" rx="4" ry="6" fill={INK} />
          <ellipse cx="112" cy="98" rx="4" ry="6" fill={INK} />
          <path
            d="M88 112 Q100 122 112 112"
            fill="none"
            stroke={INK}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <ellipse cx="84" cy="108" rx="5" ry="3" fill="#ff8fbf" opacity="0.7" />
          <ellipse cx="116" cy="108" rx="5" ry="3" fill="#ff8fbf" opacity="0.7" />
        </symbol>
        <symbol id="pf-bubble-globe" viewBox={BOXES.globe}>
          <ellipse cx="100" cy="268" rx="55" ry="9" fill={INK} opacity="0.2" />
          <ellipse cx="100" cy="260" rx="55" ry="12" fill="#ffd24c" stroke={INK} strokeWidth="4" />
          <rect
            x="80"
            y="200"
            width="14"
            height="50"
            rx="7"
            style={fill("body", "#7fd3f7")}
            stroke={INK}
            strokeWidth="3"
          />
          <rect
            x="106"
            y="200"
            width="14"
            height="50"
            rx="7"
            style={fill("body", "#7fd3f7")}
            stroke={INK}
            strokeWidth="3"
          />
          <circle
            cx="100"
            cy="120"
            r="80"
            style={fill("body", "#7fd3f7")}
            stroke={INK}
            strokeWidth="5"
          />
          <path
            d="M50 100 Q60 80 80 90 Q100 75 95 110 Q70 130 50 115 Z"
            style={fill("land", "#7ec96a")}
            stroke={INK}
            strokeWidth="3"
          />
          <path
            d="M120 75 Q140 70 150 95 Q145 115 125 110 Z"
            style={fill("land", "#7ec96a")}
            stroke={INK}
            strokeWidth="3"
          />
          <path
            d="M110 140 Q140 145 150 165 Q120 170 105 155 Z"
            style={fill("land", "#7ec96a")}
            stroke={INK}
            strokeWidth="3"
          />
          <ellipse cx="78" cy="120" rx="6" ry="9" fill={INK} />
          <ellipse cx="118" cy="118" rx="6" ry="9" fill={INK} />
          <ellipse cx="80" cy="118" rx="2" ry="3" fill="#fff" />
          <ellipse cx="120" cy="116" rx="2" ry="3" fill="#fff" />
          <path
            d="M85 140 Q100 152 115 140"
            fill="none"
            stroke={INK}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <ellipse cx="68" cy="135" rx="6" ry="4" fill="#ff8fbf" opacity="0.7" />
          <ellipse cx="130" cy="133" rx="6" ry="4" fill="#ff8fbf" opacity="0.7" />
          <path d="M180 130 L 200 50" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <path
            d="M200 50 L 260 30 L 240 70 Z"
            fill="#ff6f9c"
            stroke={INK}
            strokeWidth="4"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="pf-bubble-hand" viewBox={BOXES.hand}>
          <rect
            x="70"
            y="170"
            width="80"
            height="40"
            rx="10"
            fill="#7fd3f7"
            stroke={INK}
            strokeWidth="4"
          />
          <line x1="70" y1="180" x2="150" y2="180" stroke={INK} strokeWidth="3" />
          <path
            d="M55 130 C 55 100 75 90 110 90 C 145 90 165 100 165 130 L 165 165 C 165 180 55 180 55 165 Z"
            fill="#fff"
            stroke={INK}
            strokeWidth="4"
            strokeLinejoin="round"
          />
          {[
            { x: 65, h: 70 },
            { x: 90, h: 90 },
            { x: 115, h: 95 },
            { x: 140, h: 80 },
          ].map((finger) => (
            <rect
              key={finger.x}
              x={finger.x}
              y={130 - finger.h}
              width="20"
              height={finger.h + 10}
              rx="10"
              fill="#fff"
              stroke={INK}
              strokeWidth="4"
            />
          ))}
          <ellipse
            cx="40"
            cy="135"
            rx="16"
            ry="22"
            fill="#fff"
            stroke={INK}
            strokeWidth="4"
            transform="rotate(-20 40 135)"
          />
        </symbol>
        <symbol id="pf-bubble-point" viewBox={BOXES.point}>
          <rect
            x="60"
            y="170"
            width="80"
            height="40"
            rx="10"
            fill="#7fd3f7"
            stroke={INK}
            strokeWidth="4"
          />
          <line x1="60" y1="180" x2="140" y2="180" stroke={INK} strokeWidth="3" />
          <path
            d="M55 100 C 55 80 80 70 100 78 L 100 50 C 100 35 120 35 120 50 L 120 90 C 130 90 140 100 140 115 L 140 165 C 140 180 60 180 60 165 Z"
            fill="#fff"
            stroke={INK}
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M55 130 C 40 125 35 145 50 150 L 60 145 Z"
            fill="#fff"
            stroke={INK}
            strokeWidth="4"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="pf-bubble-cloud" viewBox={BOXES.cloud}>
          <path
            d="M30 80 C 10 80 10 55 30 55 C 30 30 70 30 78 50 C 90 30 130 35 132 55 C 160 50 180 70 170 85 C 178 95 158 100 145 95 L 40 95 C 22 100 10 92 30 80 Z"
            fill="#fff"
            stroke={INK}
            strokeWidth="4"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="pf-bubble-star" viewBox={BOXES.star}>
          <path
            d="M32 4 L40 24 L62 26 L46 40 L51 62 L32 50 L13 62 L18 40 L2 26 L24 24 Z"
            style={fill("fill", "#ffd24c")}
            stroke={INK}
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="pf-bubble-sparkle" viewBox={BOXES.sparkle}>
          <path d="M20 2 L23 17 L38 20 L23 23 L20 38 L17 23 L2 20 L17 17 Z" fill="currentColor" />
        </symbol>
        <symbol id="pf-bubble-flower" viewBox={BOXES.flower}>
          {[0, 72, 144, 216, 288].map((turn) => (
            <ellipse
              key={turn}
              cx="32"
              cy="14"
              rx="9"
              ry="12"
              style={fill("petal", "#ffd24c")}
              stroke={INK}
              strokeWidth="3"
              transform={`rotate(${turn} 32 32)`}
            />
          ))}
          <circle
            cx="32"
            cy="32"
            r="8"
            style={fill("center", "#ff6f9c")}
            stroke={INK}
            strokeWidth="3"
          />
        </symbol>
      </defs>
    </svg>
  );
}

export function Mascot({
  kind,
  className = "",
  colors,
}: {
  kind: MascotKind;
  className?: string;
  colors?: Record<string, string>;
}) {
  const style = colors
    ? (Object.fromEntries(
        Object.entries(colors).map(([key, value]) => [`--${key}`, value]),
      ) as CSSProperties)
    : undefined;
  return (
    <svg
      className={`m ${className}`.trim()}
      viewBox={BOXES[kind]}
      style={style}
      aria-hidden
      focusable="false"
    >
      <use href={`#pf-bubble-${kind}`} />
    </svg>
  );
}
