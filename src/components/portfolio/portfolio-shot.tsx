import { getImageProps } from "next/image";
import type { CSSProperties } from "react";
import { PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";
import { cn } from "@/lib/utils";
import {
  SHOT_BLUR,
  SHOT_HEIGHTS,
  SHOT_WIDTH,
  shotLoader,
  shotSrc,
  type PortfolioShotId,
} from "./portfolio-shot-data";
import { PreloadWhenIdle } from "./portfolio-shot-preload";

const FRAME_RATIO = 10 / 16;

// Shared by the <img> and its preload, so both name the same file for the same slot.
function shotImage(id: PortfolioShotId, sizes: string) {
  return {
    src: shotSrc(id),
    loader: shotLoader(id),
    width: SHOT_WIDTH,
    height: SHOT_HEIGHTS[id],
    sizes,
  };
}

// next/image's markup on the server, without its client runtime: the shots never change once shown.
export function PortfolioShot({
  id,
  sizes,
  className,
}: {
  id: PortfolioShotId;
  sizes: string;
  className?: string;
}) {
  const info = PORTFOLIO_TEMPLATE_INFO[id];
  const height = SHOT_HEIGHTS[id];
  const pan = (1 - (SHOT_WIDTH * FRAME_RATIO) / height) * 100;
  const alt = `A portfolio page in the ${info.name} design`;
  const { props } = getImageProps({
    ...shotImage(id, sizes),
    placeholder: "blur",
    blurDataURL: SHOT_BLUR[id],
    alt,
    className: "scroll-pan h-auto w-full",
    style: { "--pan": `-${pan.toFixed(2)}%` } as CSSProperties,
  });
  return (
    <div
      className={cn("scroll-pan-frame relative aspect-16/10 overflow-hidden", className)}
      style={{ backgroundColor: info.colors.background }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- next/image's own props; the opaque shot covers its blur */}
      <img {...props} alt={alt} />
    </div>
  );
}

// For a shot inside a closed tab: fetched once the page has loaded, so opening the tab is instant.
export function PreloadShot({ id, sizes }: { id: PortfolioShotId; sizes: string }) {
  const { props } = getImageProps({ ...shotImage(id, sizes), alt: "" });
  return <PreloadWhenIdle href={props.src} imageSrcSet={props.srcSet} imageSizes={props.sizes} />;
}
