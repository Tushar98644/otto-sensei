type Box = { top: number; bottom: number; left: number; width: number; height: number };

type Band = { top: number; bottom: number };

export type Placement = {
  top: number;
  left: number;
  ring: { top: number; left: number; width: number; height: number };
};

const GAP_PX = 12;
const EDGE_PX = 16;
// The step bar floats above the bottom edge (the phone's safe area), or rests higher at the page end.
const BOTTOM_SLACK_PX = 80;

// A sticky side column, or a bar beside the target, can't cover it.
function covers(edge: Box, target: Pick<Box, "left" | "width">, viewHeight: number): boolean {
  return (
    edge.height < viewHeight / 2 &&
    edge.left < target.left + target.width &&
    target.left < edge.left + edge.width
  );
}

// Only bars stuck to an edge count: one in the page flow can't cover what sits beside it.
export function visibleBand(
  edges: readonly Box[],
  target: Pick<Box, "left" | "width">,
  viewHeight: number,
): Band {
  const bars = edges.filter((edge) => covers(edge, target, viewHeight));
  let top = 0;
  for (const edge of [...bars].sort((a, b) => a.top - b.top)) {
    if (edge.top <= top + 1 && edge.bottom > top) top = edge.bottom;
  }
  let bottom = viewHeight;
  for (const edge of [...bars].sort((a, b) => b.bottom - a.bottom)) {
    if (edge.top > top && edge.top < bottom && edge.bottom >= bottom - BOTTOM_SLACK_PX) {
      bottom = edge.top;
    }
  }
  return { top, bottom };
}

export function fitsBand(target: Pick<Box, "top" | "bottom">, band: Band): boolean {
  return target.top >= band.top && target.bottom <= band.bottom;
}

type PlaceOptions = {
  target: Box;
  tip: Pick<Box, "width" | "height">;
  band: Band;
  viewWidth: number;
  ringPadding: number;
};

// null while the target is mostly scrolled out of the band: a tip pointing at nothing gets in the way.
export function placeTip({
  target,
  tip,
  band,
  viewWidth,
  ringPadding,
}: PlaceOptions): Placement | null {
  const shown = Math.min(target.bottom, band.bottom) - Math.max(target.top, band.top);
  if (shown <= 0 || shown < Math.min(target.height, band.bottom - band.top) / 2) return null;

  const minTop = band.top + EDGE_PX;
  const maxTop = band.bottom - EDGE_PX - tip.height;
  const below = target.bottom + GAP_PX;
  const above = target.top - GAP_PX - tip.height;
  let top: number;
  if (below >= minTop && below <= maxTop) top = below;
  else if (above >= minTop && above <= maxTop) top = above;
  else top = Math.max(minTop, maxTop);
  const left = Math.min(
    Math.max(EDGE_PX, target.left),
    Math.max(EDGE_PX, viewWidth - EDGE_PX - tip.width),
  );

  const ringTop = Math.max(band.top, target.top - ringPadding);
  const ringBottom = Math.min(band.bottom, target.bottom + ringPadding);
  return {
    top,
    left,
    ring: {
      top: ringTop,
      left: target.left - ringPadding,
      width: target.width + ringPadding * 2,
      height: Math.max(0, ringBottom - ringTop),
    },
  };
}
