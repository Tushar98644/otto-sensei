"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";
import { cn } from "@/lib/utils";

const WIDTHS = [480, 800, 1200, 1600] as const;
const WIDTH = 1600;
const FRAME_RATIO = 10 / 16;

const PORTFOLIO_SHOTS = { bento: 1343, dock: 2500, reel: 2500 } as const;

export type PortfolioShotId = keyof typeof PORTFOLIO_SHOTS;

function loader(id: PortfolioShotId) {
  return ({ width }: { width: number }) =>
    `/portfolio-shots/${id}-${WIDTHS.find((w) => w >= width) ?? WIDTH}.webp`;
}

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
  const height = PORTFOLIO_SHOTS[id];
  const pan = (1 - (WIDTH * FRAME_RATIO) / height) * 100;
  return (
    <div
      className={cn("scroll-pan-frame relative aspect-16/10 overflow-hidden", className)}
      style={{ backgroundColor: info.colors.background }}
    >
      <Image
        src={`/portfolio-shots/${id}-${WIDTH}.webp`}
        loader={loader(id)}
        width={WIDTH}
        height={height}
        sizes={sizes}
        alt={`A portfolio page in the ${info.name} design`}
        className="scroll-pan h-auto w-full"
        style={{ "--pan": `-${pan.toFixed(2)}%` } as CSSProperties}
      />
    </div>
  );
}
