// Hex for satori. Keep fur and cream equal to --color-otter(-light) in globals.css.
export const OTTO_COLORS = {
  fur: "#7A5135",
  furShade: "#5A3A24",
  cream: "#F3E4CF",
  line: "#3E2A1E",
  eye: "#1F130D",
  nose: "#2C1A11",
  shine: "#FFFFFF",
  paper: "#FFFDF8",
  paperInk: "#CDBFAE",
  mouth: "#5A271A",
  tongue: "#E0786A",
} as const;

export const OTTO_VIEWBOX = "0 0 200 200";

export const OUTLINE = {
  stroke: OTTO_COLORS.line,
  strokeWidth: 2.25,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
