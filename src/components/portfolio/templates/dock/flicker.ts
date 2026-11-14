// Ported from dillionverma/portfolio (MIT, see ./LICENSE.txt).

export type FlickerContext = Pick<
  CanvasRenderingContext2D,
  "clearRect" | "fillRect" | "fillStyle" | "globalAlpha"
>;

export type FlickerOptions = {
  squareSize: number;
  gridGap: number;
  flickerChance: number;
  maxOpacity: number;
};

// Reduced motion, the picture cards and the editor's inert preview get one still frame.
export const flickerStill = (container: Element, reduceMotion: boolean) =>
  reduceMotion || container.closest("[inert], [data-pf-still]") !== null;

export function flickerGrid(
  ctx: FlickerContext,
  { squareSize, gridGap, flickerChance, maxOpacity }: FlickerOptions,
  random: () => number = Math.random,
) {
  const pitch = squareSize + gridGap;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let rows = 0;
  let squares = new Float32Array(0);
  let fill = "";
  let last = -1;

  const square = (index: number, clear: boolean) => {
    const x = Math.floor(index / rows) * pitch * dpr;
    const y = (index % rows) * pitch * dpr;
    const size = squareSize * dpr;
    if (clear) {
      // Whole device pixels, so no anti-aliased edge of the old square stays behind.
      const left = Math.floor(x);
      const top = Math.floor(y);
      ctx.clearRect(left, top, Math.ceil(x + size) - left, Math.ceil(y + size) - top);
    }
    ctx.globalAlpha = squares[index]!;
    ctx.fillRect(x, y, size, size);
  };

  const paint = (color: string) => {
    fill = color;
    ctx.fillStyle = color;
    ctx.clearRect(0, 0, width * dpr, height * dpr);
    for (let index = 0; index < squares.length; index += 1) square(index, false);
  };

  return {
    resize(nextWidth: number, nextHeight: number, nextDpr: number) {
      width = nextWidth;
      height = nextHeight;
      dpr = nextDpr;
      rows = Math.floor(height / pitch);
      const cols = Math.floor(width / pitch);
      squares = new Float32Array(cols * rows).map(() => random() * maxOpacity);
      fill = "";
    },
    paint,
    recolor(color: string) {
      if (color !== fill) paint(color);
    },
    tick(time: number, color: string) {
      const delta = last < 0 ? 0 : (time - last) / 1000;
      last = time;
      const chance = flickerChance * delta;
      // Squares less than a device pixel apart share pixels, so only a full repaint is exact.
      const whole = color !== fill || gridGap * dpr < 1;
      for (let index = 0; index < squares.length; index += 1) {
        if (random() >= chance) continue;
        squares[index] = random() * maxOpacity;
        if (!whole) square(index, true);
      }
      if (whole) paint(color);
    },
    pause() {
      last = -1;
    },
  };
}
