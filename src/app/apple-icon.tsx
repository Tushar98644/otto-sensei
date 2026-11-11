import { ImageResponse } from "next/og";
import { drawOtto } from "@/components/mascot/draw-otto";
import { OTTO_VIEWBOX } from "@/components/mascot/palette";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Mirrors the globals.css background (paper) token; satori can't read CSS variables.
const TILE = "#EEF3EF";

// iOS paints transparent pixels black and rounds corners itself, so this is an opaque tile with
// room around Otto. No text, so no font: the build never touches the network.
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
