import { ImageResponse } from "next/og";
import { drawOtto } from "@/components/mascot/draw-otto";
import { OTTO_VIEWBOX } from "@/components/mascot/palette";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Mirrors the globals.css background (paper) token; satori can't read CSS variables.
const TILE = "#EEF3EF";

// Home-screen icon for iOS. iOS paints transparent pixels black and rounds the corners itself, so
// this is an opaque square tile with room around Otto. Like the OG image it renders once at build
// time, and with no text it doesn't need a font, so the build never touches the network.
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: TILE,
      }}
    >
      <svg width={152} height={152} viewBox={OTTO_VIEWBOX}>
        {drawOtto("wave", { animated: false, themed: false })}
      </svg>
    </div>,
    size,
  );
}
