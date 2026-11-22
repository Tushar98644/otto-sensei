// Text art drawn as SVG cells, so no font has to carry the block glyphs and nothing drifts.

const GLYPHS: Record<string, string> = {
  A: ".###.|#...#|#...#|#####|#...#|#...#|#...#",
  B: "####.|#...#|#...#|####.|#...#|#...#|####.",
  C: ".###.|#...#|#....|#....|#....|#...#|.###.",
  D: "####.|#...#|#...#|#...#|#...#|#...#|####.",
  E: "#####|#....|#....|####.|#....|#....|#####",
  F: "#####|#....|#....|####.|#....|#....|#....",
  G: ".###.|#...#|#....|#.###|#...#|#...#|.####",
  H: "#...#|#...#|#...#|#####|#...#|#...#|#...#",
  I: "###|.#.|.#.|.#.|.#.|.#.|###",
  J: "..###|...#.|...#.|...#.|...#.|#..#.|.##..",
  K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#",
  L: "#....|#....|#....|#....|#....|#....|#####",
  M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#",
  N: "#...#|#...#|##..#|#.#.#|#..##|#...#|#...#",
  O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.",
  P: "####.|#...#|#...#|####.|#....|#....|#....",
  Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#",
  R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
  S: ".####|#....|#....|.###.|....#|....#|####.",
  T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
  U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.",
  V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
  W: "#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.",
  X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
  Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..",
  Z: "#####|....#|...#.|..#..|.#...|#....|#####",
  "0": ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.",
  "1": ".#.|##.|.#.|.#.|.#.|.#.|###",
  "2": ".###.|#...#|....#|...#.|..#..|.#...|#####",
  "3": "#####|...#.|..#..|...#.|....#|#...#|.###.",
  "4": "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.",
  "5": "#####|#....|####.|....#|....#|#...#|.###.",
  "6": "..##.|.#...|#....|####.|#...#|#...#|.###.",
  "7": "#####|....#|...#.|..#..|.#...|.#...|.#...",
  "8": ".###.|#...#|#...#|.###.|#...#|#...#|.###.",
  "9": ".###.|#...#|#...#|.####|....#|...#.|.##..",
  "-": "...|...|...|###|...|...|...",
  ".": ".|.|.|.|.|.|#",
  "'": "#|#|.|.|.|.|.",
  " ": "..|..|..|..|..|..|..",
};

export const BANNER_ROWS = 7;

export type Cells = { width: number; height: number; full: string; shade: string };

// A terminal cell is 0.6 as wide as it is tall; a whole layer is one path.
export const CELL_W = 0.6;
const n = (value: number) => Number(value.toFixed(2));
const cell = (x: number, y: number, w = 1, h = 1, dx = 0, dy = 0) =>
  `M${n((x + dx) * CELL_W)} ${n(y + dy)}h${n(w * CELL_W)}v${h}h${n(-w * CELL_W)}z`;

function plain(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

export function canBanner(text: string): boolean {
  const letters = plain(text).replace(/\s+/g, " ").trim();
  return letters.length > 0 && [...letters].every((char) => char in GLYPHS);
}

// Each font pixel is two cells wide, as in a terminal; the shade falls one cell down and left.
export function banner(text: string): Cells {
  const filled = new Set<string>();
  let x = 1;
  for (const char of plain(text).replace(/\s+/g, " ").trim()) {
    const rows = (GLYPHS[char] ?? GLYPHS[" "]!).split("|");
    const wide = rows[0]!.length;
    rows.forEach((row, y) => {
      [...row].forEach((bit, i) => {
        if (bit !== "#") return;
        filled.add(`${x + i * 2},${y}`);
        filled.add(`${x + i * 2 + 1},${y}`);
      });
    });
    x += wide * 2 + 2;
  }
  let full = "";
  let shade = "";
  for (const key of filled) {
    const [cx, cy] = key.split(",").map(Number) as [number, number];
    full += cell(cx, cy);
    const sx = cx - 1;
    const sy = cy + 1;
    if (!filled.has(`${sx},${sy}`)) shade += cell(sx, sy);
  }
  return { width: Math.max(1, x - 1), height: BANNER_ROWS + 1, full, shade };
}

// The sumfetch globe is LiveTerm's own art (MIT); the screen line carries the owner's name.
const GLOBE = [
  "           ▄▓▓▓▓▓▓▓▓▓▓▓▓▓▓▄",
  "        ▄▓▓▀ ▄▓▓▀▓▓▓▀▓▓▄ ▀▀▓▓▄",
  "      ▓▓▀  ▄▓▀   ▐▓▓  ▀▓▓    ▓▓▄",
  "    ▄▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓",
  "   ▓▓     ▓▓▓    ▐▓▓    ▐▓▓     ▓▓",
  "▐▓▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▓",
  "▐▓                                 ▐▓",
  "▐▓                                 ▐▓",
  "▐▓                                 ▐▓",
  "▐▓▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▓",
  "   ▓▓      ▐▓▓    ▓▓    ▐▓▓     ▓▓",
  "    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓",
  "      ▓▓▓   ▐▓▓   ▓▓   ▓▓▓   ▓▓▀",
  "        ▀▓▓▄▄ ▀▓▓▄▓▓▄▓▓▓▄▄▓▓▀",
  "            ▀▓▓▓▓▓▓▓▓▓▓▓▀▀",
];

export const GLOBE_COLS = 37;
export const GLOBE_ROWS = GLOBE.length;
export const GLOBE_SCREEN = { row: 7, from: 2, cols: 33 };

export function globe(): { full: string; dense: string } {
  let full = "";
  let dense = "";
  GLOBE.forEach((line, y) => {
    [...line].forEach((char, x) => {
      if (char === "▓") dense += cell(x, y);
      else if (char === "▄") full += cell(x, y, 1, 0.5, 0, 0.5);
      else if (char === "▀") full += cell(x, y, 1, 0.5);
      else if (char === "▐") full += cell(x, y, 0.5, 1, 0.5);
    });
  });
  return { full, dense };
}

// "> J O R D A N", spaced like the original's "> L I V E T E R M" when it fits the screen.
export function screenLine(name: string): string {
  const word = plain(name)
    .replace(/[^A-Z0-9 ]/g, "")
    .trim();
  const spaced = `> ${[...word.replace(/\s+/g, "")].join(" ")}`;
  const line = spaced.length <= GLOBE_SCREEN.cols - 4 ? spaced : `> ${word}`;
  return line.length <= GLOBE_SCREEN.cols - 2 ? line : `${line.slice(0, GLOBE_SCREEN.cols - 3)}…`;
}
