export type PreviewWidth = "desktop" | "phone";

export const PREVIEW_PAGE_WIDTH: Record<PreviewWidth, number> = { desktop: 1280, phone: 390 };

export function previewFit(width: PreviewWidth, box: number): { page: number; zoom: number } {
  const base = PREVIEW_PAGE_WIDTH[width];
  if (!(box > 0)) return { page: base, zoom: 0 };
  const page = width === "desktop" ? Math.max(base, Math.floor(box)) : base;
  return { page, zoom: Math.min(1, box / page) };
}
