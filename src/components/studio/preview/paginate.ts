// A place the PDF may start a new page: the flow before it ends at `cut`, the next page starts at `next`.
export type PageBreak = { cut: number; next: number };

// The slice of the flow one page shows, in the flow's own pixels (1px per point).
export type PageWindow = { start: number; end: number };

const ROUNDING = 0.5;
const MAX_PAGES = 40;

// Like react-pdf: each block moves whole to the next page, and only a block taller than a page is cut.
export function pageWindows(
  breaks: readonly PageBreak[],
  total: number,
  height: number,
): PageWindow[] {
  if (height <= 0) return [{ start: 0, end: total }];
  const points = [...breaks, { cut: total, next: total }];
  const pages: PageWindow[] = [];
  let start = 0;
  let fit: PageBreak | null = null;
  let index = 0;
  while (index < points.length && pages.length < MAX_PAGES) {
    const point = points[index]!;
    if (point.cut - start <= height + ROUNDING) {
      if (point.cut > start && point.next > start) fit = point;
      index += 1;
      continue;
    }
    const end = fit ? fit.cut : start + height;
    pages.push({ start, end });
    start = fit ? fit.next : end;
    fit = null;
  }
  pages.push({ start, end: Math.max(start, total) });
  return pages;
}

export function samePages(a: readonly PageWindow[], b: readonly PageWindow[]): boolean {
  return (
    a.length === b.length &&
    a.every((page, index) => page.start === b[index]!.start && page.end === b[index]!.end)
  );
}
