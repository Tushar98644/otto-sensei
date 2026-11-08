import Image from "next/image";
import type { TemplateInfo } from "@/lib/pdf/templates";
import { cn } from "@/lib/utils";

// Page 1 of the sample resume in each format, made by scripts/render-format-previews.tsx. The
// 1200px picture is the source so phones with dense screens stay sharp; next/image serves smaller
// copies everywhere else.
const WIDTH = 1200;
const HEIGHT = 1553;

export type FormatImageProps = {
  info: TemplateInfo;
  sizes: string;
  className?: string;
};

export function FormatImage({ info, sizes, className }: FormatImageProps) {
  return (
    <Image
      src={`/formats/${info.id}@2x.png`}
      width={WIDTH}
      height={HEIGHT}
      sizes={sizes}
      alt={`Page 1 of a sample resume in the ${info.name} format`}
      className={cn("h-auto w-full bg-surface", className)}
    />
  );
}
