import { describe, expect, it } from "vitest";
import { seeded } from "../parts";
import { flickerGrid, flickerStill, type FlickerContext } from "./flicker";

const OPTIONS = { squareSize: 2, gridGap: 2, flickerChance: 0.3, maxOpacity: 0.3 };

type Rect = [x: number, y: number, width: number, height: number];

const inside = ([x, y, w, h]: Rect, [cx, cy, cw, ch]: Rect) =>
  x >= cx && y >= cy && x + w <= cx + cw && y + h <= cy + ch;
const overlaps = ([x, y, w, h]: Rect, [cx, cy, cw, ch]: Rect) =>
  x < cx + cw && cx < x + w && y < cy + ch && cy < y + h;

// Keeps what is on the canvas: each square's last fill, until a clear covers it.
function fakeCanvas() {
  const painted = new Map<string, { rect: Rect; alpha: number; style: unknown }>();
  const clears: Rect[] = [];
  const counts = { fillStyle: 0, fillRect: 0, clearRect: 0 };
  let style: FlickerContext["fillStyle"] = "#000000";
  const ctx: FlickerContext = {
    globalAlpha: 1,
    get fillStyle() {
      return style;
    },
    set fillStyle(value) {
      counts.fillStyle += 1;
      style = value;
    },
    fillRect(x, y, width, height) {
      counts.fillRect += 1;
      const rect: Rect = [x, y, width, height];
      painted.set(rect.join(), { rect, alpha: ctx.globalAlpha, style });
    },
    clearRect(x, y, width, height) {
      counts.clearRect += 1;
      const area: Rect = [x, y, width, height];
      clears.push(area);
      for (const [key, square] of painted) {
        if (inside(square.rect, area)) painted.delete(key);
        else if (overlaps(square.rect, area)) throw new Error(`clear ${area} cuts ${square.rect}`);
      }
    },
  };
  const reset = () => Object.assign(counts, { fillStyle: 0, fillRect: 0, clearRect: 0 });
  const snapshot = () =>
    [...painted.values()]
      .map((square) => ({ ...square }))
      .sort((a, b) => a.rect[0] - b.rect[0] || a.rect[1] - b.rect[1]);
  return { ctx, counts, clears, reset, snapshot };
}

describe("flickerGrid", () => {
  it("paints every square once, with one fill colour and each square's own opacity", () => {
    const canvas = fakeCanvas();
    const grid = flickerGrid(canvas.ctx, OPTIONS, seeded(7));
    grid.resize(40, 20, 2);
    grid.paint("rgb(36, 36, 36)");
    expect(canvas.counts.fillStyle).toBe(1);
    expect(canvas.counts.fillRect).toBe(10 * 5);
    const squares = canvas.snapshot();
    expect(squares).toHaveLength(50);
    expect(squares.every((square) => square.style === "rgb(36, 36, 36)")).toBe(true);
    expect(squares.every((square) => square.alpha >= 0 && square.alpha < 0.3)).toBe(true);
    expect(squares[1]!.rect).toEqual([0, 8, 4, 4]);
  });

  it("redraws only the squares that flickered, without touching the fill colour", () => {
    const canvas = fakeCanvas();
    const grid = flickerGrid(canvas.ctx, OPTIONS, seeded(7));
    grid.resize(1440, 100, 1);
    grid.paint("rgb(36, 36, 36)");
    grid.tick(1000, "rgb(36, 36, 36)");
    let flipped = 0;
    for (let frame = 1; frame <= 60; frame += 1) {
      canvas.reset();
      grid.tick(1000 + frame * 16, "rgb(36, 36, 36)");
      expect(canvas.counts.fillStyle).toBe(0);
      expect(canvas.counts.clearRect).toBe(canvas.counts.fillRect);
      flipped += canvas.counts.fillRect;
    }
    // 9,000 squares at 0.3 flips a second come to about 43 a frame, not 9,000.
    expect(flipped / 60).toBeGreaterThan(20);
    expect(flipped / 60).toBeLessThan(80);
  });

  it("leaves the canvas as a full repaint would, even at a fractional pixel ratio", () => {
    const canvas = fakeCanvas();
    const grid = flickerGrid(canvas.ctx, OPTIONS, seeded(11));
    grid.resize(200, 40, 1.25);
    grid.paint("rgb(250, 250, 250)");
    canvas.clears.length = 0;
    for (let frame = 0; frame <= 200; frame += 1) grid.tick(frame * 16, "rgb(250, 250, 250)");
    expect(canvas.clears.length).toBeGreaterThan(100);
    expect(canvas.clears.flat().every(Number.isInteger)).toBe(true);
    const incremental = canvas.snapshot();
    grid.paint("rgb(250, 250, 250)");
    expect(incremental).toEqual(canvas.snapshot());
  });

  it("repaints everything when the colour changes, as on a theme toggle", () => {
    const canvas = fakeCanvas();
    const grid = flickerGrid(canvas.ctx, OPTIONS, seeded(7));
    grid.resize(40, 20, 2);
    grid.paint("rgb(36, 36, 36)");
    grid.tick(0, "rgb(36, 36, 36)");
    canvas.reset();
    grid.tick(16, "rgb(250, 250, 250)");
    expect(canvas.counts.fillStyle).toBe(1);
    expect(canvas.counts.fillRect).toBe(50);
    expect(canvas.snapshot().every((square) => square.style === "rgb(250, 250, 250)")).toBe(true);
  });

  it("repaints a still grid only when the colour it was painted in has gone stale", () => {
    const canvas = fakeCanvas();
    const grid = flickerGrid(canvas.ctx, OPTIONS, seeded(7));
    grid.resize(40, 20, 2);
    grid.recolor("rgb(10, 10, 10)");
    expect(canvas.counts.fillRect).toBe(50);
    canvas.reset();
    grid.recolor("rgb(10, 10, 10)");
    expect(canvas.counts.fillRect).toBe(0);
    grid.recolor("rgb(250, 250, 250)");
    expect(canvas.counts.fillStyle).toBe(1);
    expect(canvas.counts.fillRect).toBe(50);
    expect(canvas.snapshot().every((square) => square.style === "rgb(250, 250, 250)")).toBe(true);
    canvas.reset();
    grid.resize(40, 20, 1);
    grid.recolor("rgb(250, 250, 250)");
    expect(canvas.counts.fillRect).toBe(50);
  });

  it("repaints everything when squares are closer than a device pixel", () => {
    const canvas = fakeCanvas();
    const grid = flickerGrid(canvas.ctx, OPTIONS, () => 0);
    grid.resize(40, 20, 0.25);
    grid.paint("rgb(36, 36, 36)");
    grid.tick(0, "rgb(36, 36, 36)");
    canvas.reset();
    grid.tick(16, "rgb(36, 36, 36)");
    expect(canvas.counts.clearRect).toBe(1);
    expect(canvas.counts.fillRect).toBe(50);
  });

  it("starts each run of frames from rest, so a long pause doesn't flip half the grid", () => {
    const canvas = fakeCanvas();
    const grid = flickerGrid(canvas.ctx, OPTIONS, seeded(7));
    grid.resize(1440, 100, 1);
    grid.paint("rgb(36, 36, 36)");
    grid.tick(1000, "rgb(36, 36, 36)");
    grid.pause();
    canvas.reset();
    grid.tick(60_000, "rgb(36, 36, 36)");
    expect(canvas.counts.fillRect).toBe(0);
    grid.tick(60_016, "rgb(36, 36, 36)");
    expect(canvas.counts.fillRect).toBeLessThan(100);
  });
});

describe("flickerStill", () => {
  const box = (match: string | null) =>
    ({
      closest: (selector: string) => (match && selector.includes(match) ? {} : null),
    }) as unknown as Element;

  it("holds still for reduced motion, picture cards and the editor's inert preview", () => {
    expect(flickerStill(box(null), true)).toBe(true);
    expect(flickerStill(box("[data-pf-still]"), false)).toBe(true);
    expect(flickerStill(box("[inert]"), false)).toBe(true);
    expect(flickerStill(box(null), false)).toBe(false);
  });
});
