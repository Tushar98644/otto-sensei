import { STATUS_NAMES } from "@/lib/applications/status";
import { recapSummary } from "@/lib/recap/summary";
import type { Recap } from "@/lib/recap/types";
import { weekLabel } from "@/lib/recap/week";

// Draws the week's summary card as a 1080 by 1920 PNG in the browser; nothing goes to a server.

export const IMAGE_SIZE = { width: 1080, height: 1920 } as const;

const INK = "#12241d";
const MUTED = "#475850";
const SUBTLE = "#5b6b63";
const MIST = "#eef3ef";
const LINE = "#dbe4de";
const HIGHLIGHT = "#e6dcff";
const LEFT = 160;
const WIDTH = 760;

export type ImageStat = { value: number; label: string };

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function imageStats(recap: Recap): ImageStat[] {
  const { effort, momentum, jobs, attention } = recap;
  const days = recap.activeDays.length;
  const stats: ImageStat[] = [
    {
      value: effort.applications,
      label: plural(effort.applications, "application sent", "applications sent"),
    },
    {
      value: effort.tailored,
      label: plural(effort.tailored, "tailored version", "tailored versions"),
    },
    { value: effort.letters, label: plural(effort.letters, "cover letter", "cover letters") },
    { value: momentum.interviews, label: plural(momentum.interviews, "interview", "interviews") },
    { value: momentum.offers, label: plural(momentum.offers, "offer", "offers") },
    { value: days, label: plural(days, "day with Otto", "days with Otto") },
    { value: jobs?.matches ?? 0, label: plural(jobs?.matches ?? 0, "new match", "new matches") },
    {
      value: attention.share?.views ?? 0,
      label: plural(attention.share?.views ?? 0, "resume open", "resume opens"),
    },
    {
      value: attention.portfolio?.views ?? 0,
      label: plural(attention.portfolio?.views ?? 0, "portfolio view", "portfolio views"),
    },
  ];
  return stats.filter((stat) => stat.value > 0).slice(0, 6);
}

// Company and job names appear only when the person ticks "Include names".
export function imageNames(recap: Recap): string[] {
  const lines = recap.momentum.moves.map(
    (move) => `${move.company}: ${move.path.map((status) => STATUS_NAMES[status]).join(" to ")}`,
  );
  if (recap.jobs?.best) {
    lines.push(`Best match: ${recap.jobs.best.title}, ${recap.jobs.best.company}`);
  }
  return lines.slice(0, 3);
}

export type ImageInput = {
  recap: Recap;
  names: boolean;
  otto: SVGSVGElement | null;
  // The first family name of each page font, as the page's own @font-face rules call it.
  display: string;
  sans: string;
};

const escape = (text: string) => text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);

function toBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

// An SVG drawn as an image can't reach the page's fonts, so the Latin file goes inside it.
async function embeddedFont(family: string): Promise<string | null> {
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const name = rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
      const range = rule.style.getPropertyValue("unicode-range");
      if (name !== family || (range && !/U\+0+-0*FF\b/i.test(range))) continue;
      const src = /url\(["']?([^"')]+)["']?\)/.exec(rule.style.getPropertyValue("src"))?.[1];
      if (!src) continue;
      // The rule's address is relative to its stylesheet, not to the page.
      const response = await fetch(new URL(src, sheet.href ?? window.location.href));
      if (!response.ok) return null;
      const data = toBase64(await response.arrayBuffer());
      return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${data}) format("woff2");}`;
    }
  }
  return null;
}

function measurer(font: string): (text: string) => number {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return (text) => text.length * 20;
  ctx.font = font;
  return (text) => ctx.measureText(text).width;
}

function wrap(text: string, width: number, measure: (text: string) => number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fit(text: string, width: number, measure: (text: string) => number): string {
  if (measure(text) <= width) return text;
  let cut = text;
  while (cut.length > 1 && measure(`${cut}…`) > width) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

function ottoMarkup(svg: SVGSVGElement | null): string {
  if (!svg) return "";
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.removeAttribute("class");
  copy.setAttribute("x", "740");
  copy.setAttribute("y", "1490");
  copy.setAttribute("width", "250");
  copy.setAttribute("height", "250");
  return new XMLSerializer().serializeToString(copy);
}

export function recapSvg({ recap, names, otto, display, sans }: ImageInput, fonts: string): string {
  const serif = `"${display}", Georgia, serif`;
  const plain = `"${sans}", system-ui, sans-serif`;
  const label = weekLabel(recap.week);
  const labelWidth = measurer(`132px ${serif}`)(label);
  const summary = wrap(recapSummary(recap), WIDTH, measurer(`38px ${plain}`)).slice(0, 2);
  const stats = imageStats(recap);
  const rows = Math.max(1, Math.ceil(stats.length / 2));
  const listed = names ? imageNames(recap) : [];
  const listTop = 760 + (rows - 1) * 230 + 120;
  const measureList = measurer(`32px ${plain}`);
  const parts = [
    `<rect width="1080" height="1920" fill="${MIST}"/>`,
    `<g transform="translate(540 1000)"><rect x="-430" y="-740" width="860" height="1500" rx="56" fill="#fff" fill-opacity="0.6" transform="rotate(2.6)"/><rect x="-450" y="-750" width="900" height="1510" rx="56" fill="#fff" fill-opacity="0.8" transform="rotate(-1.7)"/></g>`,
    `<path d="M80 290V206a36 36 0 0 1 36-36h488a36 36 0 0 1 36 36v44H944a56 56 0 0 1 56 56v1388a56 56 0 0 1-56 56H136a56 56 0 0 1-56-56Z" fill="#fff"/>`,
    `<text x="124" y="226" class="s" font-size="30" font-weight="500" letter-spacing="4" fill="${SUBTLE}">YOUR WEEK WITH OTTO</text>`,
    `<rect x="${LEFT - 8}" y="352" width="${labelWidth + 16}" height="96" rx="6" fill="${HIGHLIGHT}"/>`,
    `<text x="${LEFT}" y="432" class="d" font-size="132" fill="${INK}">${escape(label)}</text>`,
    ...summary.map(
      (line, index) =>
        `<text x="${LEFT}" y="${530 + index * 54}" class="s" font-size="38" fill="${MUTED}">${escape(line)}</text>`,
    ),
    ...stats.map((stat, index) => {
      const x = LEFT + (index % 2) * 400;
      const y = 760 + Math.floor(index / 2) * 230;
      return `<text x="${x}" y="${y}" class="d" font-size="150" fill="${INK}">${stat.value}</text><text x="${x}" y="${y + 54}" class="s" font-size="34" font-weight="500" fill="${MUTED}">${escape(stat.label)}</text>`;
    }),
    listed.length > 0
      ? `<rect x="${LEFT}" y="${listTop}" width="${WIDTH}" height="2" fill="${LINE}"/>`
      : "",
    ...listed.map(
      (line, index) =>
        `<text x="${LEFT}" y="${listTop + 60 + index * 50}" class="s" font-size="32" fill="${INK}">${escape(fit(line, WIDTH, measureList))}</text>`,
    ),
    `<text x="${LEFT}" y="1690" class="s" font-size="30" font-weight="500" fill="${SUBTLE}">Made with Otto Sensei</text>`,
    ottoMarkup(otto),
  ];
  const style = `${fonts}.d{font-family:${serif};font-variant-numeric:lining-nums tabular-nums}.s{font-family:${plain}}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><style>${style}</style>${parts.join("")}</svg>`;
}

export async function drawRecapImage(input: ImageInput): Promise<Blob> {
  const fonts = await Promise.all([embeddedFont(input.display), embeddedFont(input.sans)]).catch(
    () => [null, null],
  );
  const svg = recapSvg(input, fonts.filter(Boolean).join(""));
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = IMAGE_SIZE.width;
    canvas.height = IMAGE_SIZE.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas here.");
    ctx.drawImage(image, 0, 0);
    return await new Promise((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No image."))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
