import Image from "next/image";
import type { TemplateInfo } from "@/lib/pdf/templates";
import { cn } from "@/lib/utils";

// Page 1 of the sample resume in each format, made by scripts/render-format-previews.tsx, with
// WebP copies at these widths served as they are: the image optimizer's first request for a size
// took seconds.
const WIDTH = 1200;
const HEIGHT = 1553;
const WEBP_WIDTHS = [400, 800, 1200] as const;

function webpLoader(id: string) {
  return ({ width }: { width: number }) =>
    `/formats/${id}-${WEBP_WIDTHS.find((w) => w >= width) ?? WIDTH}.webp`;
}

export type FormatImageProps = {
  info: TemplateInfo;
  sizes: string;
  className?: string;
};

export function FormatImage({ info, sizes, className }: FormatImageProps) {
  return (
    <Image
      src={`/formats/${info.id}-${WIDTH}.webp`}
      loader={webpLoader(info.id)}
      width={WIDTH}
      height={HEIGHT}
      sizes={sizes}
      alt={`Page 1 of a sample resume in the ${info.name} format`}
      className={cn("h-auto w-full bg-surface", className)}
    />
  );
}
