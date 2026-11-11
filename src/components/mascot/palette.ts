// Hex values as SVG attributes, so he renders in satori (OG image) and without theme tokens.
// icon.svg repeats a few (a static file can't import). Keep `fur` and `cream` equal to
// --color-otter and --color-otter-light in globals.css, which the token classes override with.
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

// Thin, with soft round ends: reads as a drawing, not a sticker.
export const OUTLINE = {
  stroke: OTTO_COLORS.line,
  strokeWidth: 2.25,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
