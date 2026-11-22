// Pixel letters drawn flat (the header mark and footer logotype) and in isometric (the cover), after ncdai/chanhdai.com (MIT, see ./LICENSE.txt).

const GLYPHS: Record<string, string> = {
  A: ".##.|#..#|####|#..#|#..#",
  B: "###.|#..#|###.|#..#|###.",
  C: ".###|#...|#...|#...|.###",
  D: "###.|#..#|#..#|#..#|###.",
  E: "####|#...|###.|#...|####",
  F: "####|#...|###.|#...|#...",
  G: ".###|#...|#.##|#..#|.###",
  H: "#..#|#..#|####|#..#|#..#",
  I: "###|.#.|.#.|.#.|###",
  J: "..##|...#|...#|#..#|.##.",
  K: "#..#|#.#.|##..|#.#.|#..#",
  L: "#...|#...|#...|#...|####",
  M: "#...#|##.##|#.#.#|#...#|#...#",
  N: "#..#|##.#|#.##|#..#|#..#",
  O: ".##.|#..#|#..#|#..#|.##.",
  P: "###.|#..#|###.|#...|#...",
  Q: ".##.|#..#|#..#|#.##|.###",
  R: "###.|#..#|###.|#.#.|#..#",
  S: ".###|#...|.##.|...#|###.",
  T: "#####|..#..|..#..|..#..|..#..",
  U: "#..#|#..#|#..#|#..#|.##.",
  V: "#...#|#...#|#...#|.#.#.|..#..",
  W: "#...#|#...#|#.#.#|##.##|#...#",
  X: "#...#|.#.#.|..#..|.#.#.|#...#",
  Y: "#...#|.#.#.|..#..|..#..|..#..",
  Z: "####|...#|.##.|#...|####",
  "0": ".##.|#..#|#..#|#..#|.##.",
  "1": ".#.|##.|.#.|.#.|###",
  "2": "###.|...#|.##.|#...|####",
  "3": "###.|...#|.##.|...#|###.",
  "4": "#..#|#..#|####|...#|...#",
  "5": "####|#...|###.|...#|###.",
  "6": ".##.|#...|###.|#..#|.##.",
  "7": "####|...#|..#.|.#..|.#..",
  "8": ".##.|#..#|.##.|#..#|.##.",
  "9": ".##.|#..#|.###|...#|.##.",
};
const UNKNOWN = "####|#..#|#..#|#..#|####";
export const ROWS = 5;

export type Cell = { x: number; y: number };
export type PixelText = { cells: Cell[]; columns: number };

export function pixelText(text: string, gap = 1): PixelText {
  const letters = [
    ...text.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase().replace(/\s+/g, " ").trim(),
  ];
  const cells: Cell[] = [];
  let at = 0;
  for (const letter of letters) {
    if (letter === " ") {
      at += 2;
      continue;
    }
    const rows = (GLYPHS[letter] ?? UNKNOWN).split("|");
    rows.forEach((row, y) => {
      [...row].forEach((mark, x) => {
        if (mark === "#") cells.push({ x: at + x, y });
      });
    });
    at += (rows[0]?.length ?? 0) + gap;
  }
  return { cells, columns: Math.max(0, at - gap) };
}

const keyOf = (x: number, y: number) => `${x},${y}`;

const round = (n: number) => Math.round(n * 100) / 100;

// Flat: one path for the filled cells and one for the outline of their union.
export function flatPaths({ cells }: PixelText, size: number): { fill: string; outline: string } {
  const filled = new Set(cells.map((cell) => keyOf(cell.x, cell.y)));
  const has = (x: number, y: number) => filled.has(keyOf(x, y));
  let fill = "";
  let outline = "";
  for (const { x, y } of cells) {
    const left = x * size;
    const top = y * size;
    fill += `M${left} ${top}h${size}v${size}h${-size}Z`;
    if (!has(x, y - 1)) outline += `M${left} ${top}h${size}`;
    if (!has(x, y + 1)) outline += `M${left} ${top + size}h${size}`;
    if (!has(x - 1, y)) outline += `M${left} ${top}v${size}`;
    if (!has(x + 1, y)) outline += `M${left + size} ${top}v${size}`;
  }
  return { fill, outline };
}

const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;

export type IsoPart = { faces: { d: string; top: boolean }[]; edges: string };

export type Iso = {
  width: number;
  height: number;
  // Painted back to front, each cell's lines with it, so nearer cells hide what's behind them.
  parts: IsoPart[];
  vertex: { x: number; y: number };
  guides: string;
};

// Letters lie on the floor, read up and to the right, and stand `depth` tall.
export function isoPaths({ cells }: PixelText, size: number, depth: number): Iso {
  const filled = new Set(cells.map((cell) => keyOf(cell.x, cell.y)));
  const has = (x: number, y: number) => filled.has(keyOf(x, y));
  const raw = (x: number, y: number, h: number) => ({
    sx: (x + y) * size * COS,
    sy: (y - x) * size * SIN - h,
  });
  let minX = 0;
  let minY = 0;
  let maxX = 1;
  let maxY = 1;
  cells.forEach(({ x, y }, index) => {
    const points = [raw(x, y + 1, 0), raw(x + 1, y + 1, 0), raw(x + 1, y, depth), raw(x, y, depth)];
    if (index === 0) {
      minX = minY = Infinity;
      maxX = maxY = -Infinity;
    }
    for (const p of points) {
      minX = Math.min(minX, p.sx);
      maxX = Math.max(maxX, p.sx);
      minY = Math.min(minY, p.sy);
      maxY = Math.max(maxY, p.sy);
    }
  });
  const pad = 1;
  const shift = (p: { sx: number; sy: number }) => ({
    x: round(p.sx - minX + pad),
    y: round(p.sy - minY + pad),
  });
  const at = (x: number, y: number, h: number) => {
    const p = shift(raw(x, y, h));
    return `${p.x} ${p.y}`;
  };
  const poly = (points: string[]) => `M${points.join("L")}Z`;
  const line = (a: string, b: string) => `M${a}L${b}`;

  const order = [...cells].sort((a, b) => a.y - a.x - (b.y - b.x) || b.x - a.x);
  const parts: IsoPart[] = order.map(({ x, y }) => {
    // Faces toward +y (lower right) and -x (lower left) are the ones the viewer sees.
    const front = !has(x, y + 1);
    const side = !has(x - 1, y);
    const faces: IsoPart["faces"] = [];
    let edges = "";
    if (front)
      faces.push({
        d: poly([
          at(x, y + 1, 0),
          at(x + 1, y + 1, 0),
          at(x + 1, y + 1, depth),
          at(x, y + 1, depth),
        ]),
        top: false,
      });
    if (side)
      faces.push({
        d: poly([at(x, y, 0), at(x, y + 1, 0), at(x, y + 1, depth), at(x, y, depth)]),
        top: false,
      });
    faces.push({
      d: poly([at(x, y, depth), at(x + 1, y, depth), at(x + 1, y + 1, depth), at(x, y + 1, depth)]),
      top: true,
    });
    if (!has(x, y - 1)) edges += line(at(x, y, depth), at(x + 1, y, depth));
    if (!has(x + 1, y)) edges += line(at(x + 1, y, depth), at(x + 1, y + 1, depth));
    if (front) {
      edges += line(at(x, y + 1, depth), at(x + 1, y + 1, depth));
      edges += line(at(x, y + 1, 0), at(x + 1, y + 1, 0));
      if (side) edges += line(at(x, y + 1, 0), at(x, y + 1, depth));
      if (!has(x + 1, y) || has(x + 1, y + 1))
        edges += line(at(x + 1, y + 1, 0), at(x + 1, y + 1, depth));
    }
    if (side) {
      edges += line(at(x, y, depth), at(x, y + 1, depth));
      edges += line(at(x, y, 0), at(x, y + 1, 0));
      if (!has(x, y - 1) || has(x - 1, y - 1)) edges += line(at(x, y, 0), at(x, y, depth));
    }
    return { faces, edges };
  });

  // The highest corner, where the cover measures its 30° angle; the rightmost if several tie.
  const top = order[0];
  const vertex = shift(top ? raw(top.x + 1, top.y, depth) : { sx: minX, sy: minY });
  const far = (maxX - minX + maxY - minY) * 2;
  const guide = (p: { x: number; y: number }, dx: number, dy: number) =>
    `M${round(p.x - dx * far)} ${round(p.y - dy * far)}L${round(p.x + dx * far)} ${round(p.y + dy * far)}`;
  const left = cells.reduce<Cell | null>(
    (best, cell) => (!best || cell.x + cell.y < best.x + best.y ? cell : best),
    null,
  );
  const low = left ? shift(raw(left.x, left.y + 1, 0)) : vertex;
  return {
    width: round(maxX - minX + pad * 2),
    height: round(maxY - minY + pad * 2),
    parts,
    vertex,
    guides: guide(vertex, COS, SIN) + guide(low, COS, -SIN) + guide(low, COS, SIN),
  };
}
