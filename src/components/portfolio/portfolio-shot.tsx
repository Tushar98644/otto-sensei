"use client";

import Image from "next/image";
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

const FRAME_RATIO = 10 / 16;

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
  return (
    <div
      className={cn("scroll-pan-frame relative aspect-16/10 overflow-hidden", className)}
      style={{ backgroundColor: info.colors.background }}
    >
      <Image
        src={shotSrc(id)}
        loader={shotLoader(id)}
        width={SHOT_WIDTH}
        height={height}
        sizes={sizes}
        placeholder="blur"
        blurDataURL={SHOT_BLUR[id]}
        alt={`A portfolio page in the ${info.name} design`}
        className="scroll-pan h-auto w-full"
        style={{ "--pan": `-${pan.toFixed(2)}%` } as CSSProperties}
      />
    </div>
  );
}
