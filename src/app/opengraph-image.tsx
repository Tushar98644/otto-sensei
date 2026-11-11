import { ImageResponse } from "next/og";
import { drawOtto } from "@/components/mascot/draw-otto";
import { OTTO_VIEWBOX } from "@/components/mascot/palette";
import { BRAND } from "@/config/brand";

export const alt =
  `${BRAND.mascotName} the otter, in reading glasses, pointing to ` +
  `"${BRAND.name}: ${BRAND.tagline}"`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori can't read CSS variables, so these mirror the globals.css tokens.
const COLORS = {
  background: "#FBFCFA",
  ink: "#12241D",
  muted: "#475850",
  accent: "#6D4FE8",
  lavender: "#EBE5FF",
};

// Static: no request data, so Next renders this once at build time and serves it from the CDN.
// Uses next/og's bundled font on purpose, so the build never needs the network.
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 48,
        padding: "0 72px",
        background: COLORS.background,
      }}
    >
      <svg width={400} height={400} viewBox={OTTO_VIEWBOX}>
        {drawOtto("point", { animated: false, themed: false })}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontSize: 84, lineHeight: 1, letterSpacing: -2.5, color: COLORS.ink }}>
          {BRAND.name}
        </div>
        <div style={{ marginTop: 24, fontSize: 40, lineHeight: 1.25, color: COLORS.muted }}>
          {BRAND.tagline}
        </div>
        <div style={{ display: "flex", marginTop: 44 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "14px 30px",
              fontSize: 30,
              color: COLORS.ink,
              background: COLORS.lavender,
              borderRadius: 999,
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: 999, background: COLORS.accent }} />
            Free PDF downloads. Always.
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
