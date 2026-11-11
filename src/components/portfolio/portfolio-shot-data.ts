import { getImageProps } from "next/image";
import { preload } from "react-dom";

const WIDTHS = [480, 800, 1200, 1600] as const;
export const SHOT_WIDTH = 1600;

// Heights at 1600px wide, from the top 2000px of each page rendered at 1280px.
export const SHOT_HEIGHTS = { bento: 1343, dock: 2500, reel: 2500 } as const;

export const SHOT_BLUR = {
  bento:
    "data:image/webp;base64,UklGRkgAAABXRUJQVlA4IDwAAAAQAwCdASoUABEAPu1urlIppiQjqAgBMB2JaWu4ABu44AAA/u++l29eFhcHVrg8qDDvKEsWlk+rslTAAAA=",
  dock: "data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAABQAwCdASoUAB8APu1sqk6ppqOiMBgIATAdiWkAAD44OZXY2AD+8Kj5Qqfz2fxSrBkI8wgJxCeUal8C9rBmbBj+Cc+gAA==",
  reel: "data:image/webp;base64,UklGRogAAABXRUJQVlA4IHwAAABwBACdASoUAB8APuFeqE2opSQiMAwBEBwJYwAAWlM/EtpsJvBg8H8On/l3AAD+8qQy2qduC98blN28V4mlqf7fTqwvvuGpHoePYOB/RraTRGN5rHUh1UxlsOBvMPqP0hMxBFPGNS2diNnoWJRaGzqaAonl2yZJ9Kn/igAA",
} as const;

export type PortfolioShotId = keyof typeof SHOT_HEIGHTS;

export function shotSrc(id: PortfolioShotId): string {
  return `/portfolio-shots/${id}-${SHOT_WIDTH}.webp`;
}

export function shotLoader(id: PortfolioShotId) {
  return ({ width }: { width: number }) =>
    `/portfolio-shots/${id}-${WIDTHS.find((w) => w >= width) ?? SHOT_WIDTH}.webp`;
}

// For a shot inside a closed tab: fetched quietly during page load so opening the tab is instant.
export function preloadShot(id: PortfolioShotId, sizes: string): void {
  const { props } = getImageProps({
    src: shotSrc(id),
    loader: shotLoader(id),
    width: SHOT_WIDTH,
    height: SHOT_HEIGHTS[id],
    sizes,
    alt: "",
  });
  preload(props.src, {
    as: "image",
    imageSrcSet: props.srcSet,
    imageSizes: props.sizes,
    fetchPriority: "low",
  });
}
