import { preload } from "react-dom";
import type { TemplateInfo } from "@/lib/pdf/templates";
import type { TemplateId } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";

const WIDTH = 1200;
const HEIGHT = 1553;
const WIDTHS = [400, 800, 1200] as const;

export const CARD_SIZES = "(min-width: 1280px) 18rem, (min-width: 640px) 45vw, 100vw";
export const PREVIEW_SIZES = "(min-width: 672px) 36rem, 90vw";

function srcOf(id: TemplateId, width: number): string {
  return `/formats/${id}-${width}.webp`;
}

function srcSetOf(id: TemplateId): string {
  return WIDTHS.map((width) => `${srcOf(id, width)} ${width}w`).join(", ");
}

// Uses the dialog's srcset and sizes so the browser fetches the exact file the dialog shows.
export function preloadFormatPreview(id: TemplateId): void {
  preload(srcOf(id, WIDTH), { as: "image", imageSrcSet: srcSetOf(id), imageSizes: PREVIEW_SIZES });
}

export type FormatImageProps = {
  info: TemplateInfo;
  sizes: string;
  decoding?: "async" | "sync";
  className?: string;
};

export function FormatImage({ info, sizes, decoding = "async", className }: FormatImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP; the preload must match this srcset
    <img
      src={srcOf(info.id, WIDTH)}
      srcSet={srcSetOf(info.id)}
      sizes={sizes}
      width={WIDTH}
      height={HEIGHT}
      decoding={decoding}
      alt={`Page 1 of a sample resume in the ${info.name} format`}
      className={cn("h-auto w-full bg-surface", className)}
    />
  );
}
