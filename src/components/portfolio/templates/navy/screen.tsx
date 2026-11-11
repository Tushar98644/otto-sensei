import type { ContentProject } from "@/lib/portfolio/content";
import { seeded, seedOf } from "../parts";

const W = 1600;
const H = 1000;
const BAR = 70;
const GUTTER = 96;
const LINE = 46;

const INK = ["#64ffda", "#ccd6f6", "#a8b2d1", "#8892b0", "#8892b0", "#495670"] as const;

const EXTENSIONS: Record<string, string> = {
  typescript: "ts",
  javascript: "js",
  react: "tsx",
  "react native": "tsx",
  "next.js": "tsx",
  go: "go",
  python: "py",
  rust: "rs",
  ruby: "rb",
  java: "java",
  kotlin: "kt",
  swift: "swift",
  php: "php",
  "c#": "cs",
  elixir: "ex",
};

export function fileNameOf(project: Pick<ContentProject, "name" | "tech">): string {
  const slug = project.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const extension = project.tech
    .map((tech) => EXTENSIONS[tech.toLowerCase()])
    .find((found) => found !== undefined);
  return slug && extension ? `${slug}.${extension}` : "README.md";
}

type Bar = { x: number; y: number; width: number; fill: string };

function codeBars(seed: number): Bar[] {
  const random = seeded(seed);
  const bars: Bar[] = [];
  let indent = 0;
  const rows = Math.floor((H - BAR - 60) / LINE);
  for (let row = 0; row < rows; row++) {
    const y = BAR + 44 + row * LINE;
    if (random() < 0.12) {
      indent = Math.max(0, indent - 1);
      continue;
    }
    const step = random();
    if (step < 0.25 && indent < 4) indent += 1;
    else if (step > 0.75 && indent > 0) indent -= 1;
    let x = GUTTER + 40 + indent * 56;
    const comment = random() < 0.1;
    const pieces = comment ? 1 : 1 + Math.floor(random() * 4);
    for (let piece = 0; piece < pieces && x < W - 380; piece++) {
      const width = comment ? 260 + random() * 420 : 48 + random() * 190;
      const fill = comment ? INK[5] : INK[Math.floor(random() * 5)]!;
      bars.push({ x, y, width: Math.min(width, W - 360 - x), fill });
      x += width + 18;
    }
  }
  return bars;
}

export function CodeScreen({ project }: { project: ContentProject }) {
  const seed = seedOf(project.name);
  const bars = codeBars(seed);
  const file = fileNameOf(project);
  const rows = Math.floor((H - BAR - 60) / LINE);
  return (
    <svg
      className="img code-screen"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMin slice"
      aria-hidden
    >
      <rect width={W} height={H} fill="#0b1a30" />
      <rect width={W} height={BAR} fill="#112240" />
      {["#ff5f57", "#febc2e", "#28c840"].map((fill, index) => (
        <circle key={fill} cx={44 + index * 34} cy={BAR / 2} r="10" fill={fill} />
      ))}
      <rect
        x="170"
        y="14"
        width={Math.max(220, file.length * 17 + 70)}
        height={BAR - 14}
        fill="#0b1a30"
      />
      <text x="200" y={BAR / 2 + 12} fill="#ccd6f6" fontSize="26">
        {file}
      </text>
      <rect x="0" y={BAR} width={GUTTER} height={H - BAR} fill="#0a1628" />
      {Array.from({ length: rows }, (_, row) => (
        <text
          key={row}
          x={GUTTER - 24}
          y={BAR + 52 + row * LINE}
          fill="#495670"
          fontSize="20"
          textAnchor="end"
        >
          {row + 1}
        </text>
      ))}
      {bars.map((bar, index) => (
        <rect
          key={index}
          x={bar.x}
          y={bar.y}
          width={bar.width}
          height="14"
          rx="7"
          fill={bar.fill}
          fillOpacity={bar.fill === INK[0] ? 0.9 : 0.75}
        />
      ))}
      <rect x={W - 220} y={BAR} width="220" height={H - BAR} fill="#0a1628" />
      {bars.map((bar, index) => (
        <rect
          key={`m${index}`}
          x={W - 196 + (bar.x - GUTTER - 40) * 0.12}
          y={BAR + 20 + (bar.y - BAR - 44) * 0.28}
          width={Math.max(6, bar.width * 0.12)}
          height="4"
          fill={bar.fill}
          fillOpacity="0.55"
        />
      ))}
      <rect x={W - 220} y={BAR + 16} width="220" height="150" fill="#ccd6f6" fillOpacity="0.05" />
    </svg>
  );
}
