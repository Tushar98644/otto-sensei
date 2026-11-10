import type { Device } from "./data";
import { wrapText } from "./data";

// What every device screen shows: a page in the design's own look (dark ground, the cyan of the
// sphere, the notched divider, the title in the heading face) drawn from the project's words.
// Pages hold no pictures, so this stands where Hamish has his screenshots. Drawn as SVG so the same
// markup is the still frame's screen and, serialized, the 3D model's texture. Its size is the
// device's screen (Hamish's 1280x800 and 375x812 textures).

export const SCREEN_SIZE: Record<Device, { width: number; height: number }> = {
  laptop: { width: 1280, height: 800 },
  phone: { width: 375, height: 812 },
};

const ACCENT = "#00eeff";
const FONT = "Montserrat, 'Helvetica Neue', Helvetica, Arial, sans-serif";

type Layout = {
  x: number;
  divider: number;
  title: { size: number; chars: number; lines: number };
  text: { size: number; chars: number; lines: number };
  gap: number;
};

const LAYOUT: Record<Device, Layout> = {
  laptop: {
    x: 112,
    divider: 300,
    title: { size: 72, chars: 24, lines: 2 },
    text: { size: 28, chars: 56, lines: 3 },
    gap: 36,
  },
  phone: {
    x: 32,
    divider: 300,
    title: { size: 38, chars: 15, lines: 3 },
    text: { size: 16, chars: 34, lines: 5 },
    gap: 24,
  },
};

export type DrawnContent = {
  name: string;
  line: string;
  host: string;
  // Short facts for a second screen: "4.2k stars", "600+ sites", or the stack.
  facts: string[];
};

function Divider({ x, y, width }: { x: number; y: number; width: number }) {
  return (
    <>
      <rect x={x} y={y} width={width} height="2" fill={ACCENT} />
      <polygon
        points={`${x},${y + 2} ${x + 64},${y + 2} ${x + 54},${y + 10} ${x + 10},${y + 10}`}
        fill={ACCENT}
      />
    </>
  );
}

/**
 * `variant` 1 is the second phone of a pair: the project's facts as a list, so the two screens
 * read as two pages of one app rather than the same picture twice.
 */
export function DrawnScreen({
  device,
  content,
  id,
  variant = 0,
}: {
  device: Device;
  content: DrawnContent;
  // Unique per page, for the gradient.
  id: string;
  variant?: number;
}) {
  const { width, height } = SCREEN_SIZE[device];
  const layout = LAYOUT[device];
  const x = layout.x;
  const glow = `${id}-glow`;
  const facts = content.facts.slice(0, 5);
  const list = variant === 1 && facts.length > 0;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="drawn-screen"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="xMidYMin slice"
      aria-hidden
      fontFamily={FONT}
    >
      <defs>
        <radialGradient id={glow} cx={list ? "0.08" : "0.92"} cy="0.05" r="0.9">
          <stop offset="0" stopColor={ACCENT} stopOpacity="0.22" />
          <stop offset="1" stopColor={ACCENT} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={width} height={height} fill="#111111" />
      <rect width={width} height={height} fill={`url(#${glow})`} />
      {list ? (
        <FactList content={content} facts={facts} x={x} />
      ) : (
        <TitlePage content={content} layout={layout} device={device} />
      )}
    </svg>
  );
}

function TitlePage({
  content,
  layout,
  device,
}: {
  content: DrawnContent;
  layout: Layout;
  device: Device;
}) {
  const x = layout.x;
  const title = wrapText(content.name, layout.title.chars, layout.title.lines);
  const text = wrapText(content.line, layout.text.chars, layout.text.lines);
  const titleTop = layout.divider + 40 + layout.title.size;
  const titleStep = layout.title.size * 1.1;
  const textTop = titleTop + (title.length - 1) * titleStep + layout.gap + layout.text.size;
  const textStep = layout.text.size * 1.6;
  const hostTop = textTop + Math.max(0, text.length - 1) * textStep + layout.gap + layout.text.size;
  return (
    <>
      <Divider x={x} y={layout.divider} width={device === "laptop" ? 180 : 120} />
      <text
        x={x}
        y={titleTop}
        fill="#ffffff"
        fontSize={layout.title.size}
        fontWeight="500"
        letterSpacing={-layout.title.size * 0.02}
      >
        {title.map((part, index) => (
          <tspan key={index} x={x} dy={index === 0 ? 0 : titleStep}>
            {part}
          </tspan>
        ))}
      </text>
      {text.length > 0 ? (
        <text x={x} y={textTop} fill="#ffffff" fillOpacity="0.7" fontSize={layout.text.size}>
          {text.map((part, index) => (
            <tspan key={index} x={x} dy={index === 0 ? 0 : textStep}>
              {part}
            </tspan>
          ))}
        </text>
      ) : null}
      {content.host ? (
        <text x={x} y={hostTop} fill={ACCENT} fontSize={layout.text.size * 0.85} fontWeight="500">
          {content.host}
        </text>
      ) : null}
    </>
  );
}

// The phone's second page: the name small at the top, then one fact per row under hairlines.
function FactList({ content, facts, x }: { content: DrawnContent; facts: string[]; x: number }) {
  const name = wrapText(content.name, 22, 1)[0] ?? "";
  const top = 150;
  const rows: { lines: string[]; y: number }[] = [];
  let y = top + 100;
  for (const fact of facts) {
    const lines = wrapText(fact, 17, 2);
    if (lines.length === 0) continue;
    rows.push({ lines, y });
    y += lines.length * 34 + 54;
  }
  return (
    <>
      <text x={x} y={top} fill="#ffffff" fillOpacity="0.7" fontSize="16" fontWeight="500">
        {name}
      </text>
      <Divider x={x} y={top + 28} width={120} />
      {rows.map((row, index) => (
        <g key={index}>
          <text
            x={x}
            y={row.y}
            fill={index === 0 ? ACCENT : "#ffffff"}
            fontSize="28"
            fontWeight="500"
            letterSpacing="-0.5"
          >
            {row.lines.map((part, line) => (
              <tspan key={line} x={x} dy={line === 0 ? 0 : 34}>
                {part}
              </tspan>
            ))}
          </text>
          <rect
            x={x}
            y={row.y + (row.lines.length - 1) * 34 + 26}
            width={SCREEN_SIZE.phone.width - x * 2}
            height="1"
            fill="#ffffff"
            fillOpacity="0.14"
          />
        </g>
      ))}
    </>
  );
}
