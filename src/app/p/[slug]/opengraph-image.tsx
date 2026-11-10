import { ImageResponse } from "next/og";
import { drawOtto } from "@/components/mascot/draw-otto";
import { OTTO_VIEWBOX } from "@/components/mascot/palette";
import { BRAND } from "@/config/brand";
import { loadPublicPortfolio } from "@/lib/portfolio/page";
import { PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";

export const alt = `A portfolio page, with ${BRAND.mascotName} the otter waving`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Same cache as the page: dropped by every write, else hourly.
export const revalidate = 3600;

// Satori can't read CSS variables, so these mirror the globals.css tokens (background, ink, muted,
// subtle), like the site's own image in src/app/opengraph-image.tsx. A published page's card takes
// its template's own colours instead.
const BRAND_COLORS = { background: "#FBFCFA", ink: "#12241D", muted: "#475850", subtle: "#5B6B63" };

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

type Props = { params: Promise<{ slug: string }> };

// The name and headline of a published page; anything else gets the plain brand card, so an
// unpublished page's name never leaves through its image.
export default async function PortfolioImage({ params }: Props) {
  const { slug } = await params;
  const result = await loadPublicPortfolio(slug);
  const view = result.status === "ok" ? result.portfolio.view : null;
  const name = clip(view?.name || BRAND.name, 40);
  const headline = clip(view ? view.headline : BRAND.tagline, 90);
  const theme =
    result.status === "ok" ? PORTFOLIO_TEMPLATE_INFO[result.portfolio.template].colors : null;
  const colors = theme ? { ...theme, subtle: theme.muted } : BRAND_COLORS;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 56,
        padding: "0 80px",
        background: colors.background,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontSize: 28, letterSpacing: 3, color: colors.subtle }}>PORTFOLIO</div>
        <div
          style={{
            marginTop: 20,
            fontSize: name.length > 24 ? 64 : 84,
            lineHeight: 1.05,
            letterSpacing: -2,
            color: colors.ink,
          }}
        >
          {name}
        </div>
        {headline ? (
          <div style={{ marginTop: 24, fontSize: 38, lineHeight: 1.3, color: colors.muted }}>
            {headline}
          </div>
        ) : null}
      </div>
      <svg width={340} height={340} viewBox={OTTO_VIEWBOX}>
        {drawOtto("wave", { animated: false, themed: false })}
      </svg>
    </div>,
    size,
  );
}
