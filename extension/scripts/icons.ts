// bun extension/scripts/icons.ts: the extension's PNG icons and store tiles, drawn from Otto's mark (src/app/icon.svg).
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "store", "icons");
const MARK = readFileSync(path.join(ROOT, "..", "src", "app", "icon.svg"), "utf8");
const inner = MARK.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

function tile(
  width: number,
  height: number,
  markSize: number,
  x: number,
  y: number,
  extra = "",
): string {
  const scale = markSize / 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${extra}<g transform="translate(${x} ${y}) scale(${scale})">${inner}</g></svg>`;
}

// Toolbar sizes fill the square; the store icon keeps the 16 px margin the Web Store asks for.
const SIZES: [string, number, number][] = [
  ["16", 16, 16],
  ["32", 32, 32],
  ["48", 48, 46],
  ["128", 128, 96],
];
for (const [name, size, art] of SIZES) {
  const offset = (size - art) / 2;
  await sharp(Buffer.from(tile(size, size, art, offset, offset)))
    .png()
    .toFile(path.join(OUT, `${name}.png`));
}

const words = (x: number, y: number, size: number, line: string, sub: string, subSize: number) =>
  `<text x="${x}" y="${y}" font-family="EB Garamond, Georgia, serif" font-size="${size}" fill="#12241d">${line}</text>` +
  `<text x="${x}" y="${y + subSize * 1.9}" font-family="Inter, Helvetica, Arial, sans-serif" font-size="${subSize}" fill="#475850">${sub}</text>`;

const PAPER = (w: number, h: number) =>
  `<rect width="${w}" height="${h}" fill="#eef3ef"/><circle cx="${w * 0.86}" cy="${h * 0.18}" r="${h * 0.5}" fill="#ebe5ff" opacity="0.8"/>`;

await sharp(
  Buffer.from(
    tile(
      440,
      280,
      132,
      34,
      74,
      PAPER(440, 280) + words(190, 130, 40, "Otto", "Your resume, on every job post", 15),
    ),
  ),
)
  .png()
  .toFile(path.join(OUT, "promo-440x280.png"));
await sharp(
  Buffer.from(
    tile(
      1400,
      560,
      300,
      150,
      130,
      PAPER(1400, 560) +
        words(
          520,
          270,
          96,
          "Otto for Chrome",
          "See how you match a job, right where you read it",
          34,
        ),
    ),
  ),
)
  .png()
  .toFile(path.join(OUT, "promo-1400x560.png"));
console.log(`icons: ${OUT}`);
