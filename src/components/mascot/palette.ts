// Otto's own palette, the only place his colors live (icon.svg repeats a few, as a static file
// can't import). Every shape paints with these hex values as SVG attributes, so he renders right in
// satori (OG image) and even if a theme token is missing. The `fill-otter` / `fill-otter-light`
// token classes override fur and cream, so keep `fur` and `cream` equal to `--color-otter` and
// `--color-otter-light` in globals.css, or the shades below stop matching.
export const OTTO_COLORS = {
  fur: "#7A5135",
  furShade: "#5A3A24",
  cream: "#F3E4CF",
  // Sepia ink, never pure black: the pencil he's drawn with. Glasses share it.
  line: "#3E2A1E",
  eye: "#1F130D",
  nose: "#2C1A11",
  shine: "#FFFFFF",
  paper: "#FFFDF8",
  paperInk: "#CDBFAE",
  mouth: "#5A271A",
  tongue: "#E0786A",
} as const;

// Shared by every pose so swapping poses never shifts layout.
export const OTTO_VIEWBOX = "0 0 200 200";

// The hand-drawn outline: a thin sepia line with soft round ends. Thin enough to read as a
// drawing, not a sticker.
export const OUTLINE = {
  stroke: OTTO_COLORS.line,
  strokeWidth: 2.25,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
