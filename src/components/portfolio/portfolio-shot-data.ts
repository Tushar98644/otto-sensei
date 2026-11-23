import type { PORTFOLIO_PICKS } from "@/lib/portfolio/templates";

export const SHOT_WIDTHS = [480, 800, 1200, 1600] as const;
export const SHOT_WIDTH = 1600;

export type PortfolioShotId = (typeof PORTFOLIO_PICKS)[number];

// Heights at 1600px wide, from the top 2000px of each page rendered at 1280px.
export const SHOT_HEIGHTS: Record<PortfolioShotId, number> = {
  paper: 2500,
  gazette: 2500,
  reel: 2500,
};

export const SHOT_BLUR: Record<PortfolioShotId, string> = {
  paper:
    "data:image/webp;base64,UklGRq4AAABXRUJQVlA4IKIAAAAwBQCdASoUAB8APu1mq06ppaQiKA1RMB2JZwC7G1j2gABiOLUqDNtnUI14DQrU3z4AAAD+79c57hN9cC5Zt4evmSV4yh7K/wdTNpR9onthXBW8BdNcL0YptiDAi7KddmJIZ5ocJHoFb+p0v402E1bCS8AliGrvebqzrd+IpRn/Q2JLhCuHpqQjJuRT8Qx6yC20DXLIiIXQxFDRaB324vITgAA=",
  gazette:
    "data:image/webp;base64,UklGRqIAAABXRUJQVlA4IJYAAACQBACdASoUAB8APu1qrlCppaQiqAqpMB2JZwC/7A3fBiJ3uwTvn2ScK1os4UAA/speiBExFN5aehO1eB0wUaGP2BIbBjaMBPDxuvKuQNwOMC554cuRY/94l5jGLF8L+MTQdYZWpjHBaOF1bGqOcCMR6am/fANnDnAm1uDZXWbogAMqu0wadjbkYG0uW9jhA3+r7AdAAAA=",
  reel: "data:image/webp;base64,UklGRoQAAABXRUJQVlA4IHgAAACQBACdASoUAB8APuVeqE2pJSQiMAwBIByJYwDMWCFc9L7YPIp8Kh6Fs2eEQVAA/vDYvYmIDM1FWtj5SKKaYm4uTU5NhlAQ74h25tgezbZSVbN122kPMChOlsi1Khhb10VoJZ1KJDOH2G2VhgF4DLRy1ULm+PLoAAA=",
};

export function shotSrc(id: PortfolioShotId): string {
  return `/portfolio-shots/${id}-${SHOT_WIDTH}.webp`;
}

export function shotLoader(id: PortfolioShotId) {
  return ({ width }: { width: number }) =>
    `/portfolio-shots/${id}-${SHOT_WIDTHS.find((w) => w >= width) ?? SHOT_WIDTH}.webp`;
}
