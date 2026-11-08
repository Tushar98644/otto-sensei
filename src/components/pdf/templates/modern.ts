import { defineTheme, inch } from "../theme";

const SOFT = "#6b6b6b";
const HAIRLINE = "#c9c9c9";

// A large tight name, headings in sentence case with a hairline running to the margin, and the
// company on its own gray line under each title.
export const modern = defineTheme({
  contactSeparator: " · ",
  entryLayout: "stacked",
  headingRule: "after",
  styles: {
    page: {
      paddingTop: inch(0.55),
      paddingBottom: inch(0.5),
      paddingHorizontal: inch(0.7),
      lineHeight: 1.32,
    },
    name: { fontSize: 24, letterSpacing: -0.4, lineHeight: 1.1 },
    headline: { marginTop: 3, fontSize: 11.5, color: SOFT },
    contact: { marginTop: 6, fontSize: 9.5, color: SOFT },
    contactNext: { marginTop: 1, fontSize: 9.5, color: SOFT },
    link: { color: SOFT },
    webLink: { color: SOFT },
    section: { marginTop: 12 },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
    sectionTitle: {
      marginBottom: 0,
      paddingBottom: 0,
      borderBottomWidth: 0,
      fontSize: 11,
      letterSpacing: 0,
      textTransform: "none",
    },
    sectionTitleRule: {
      flex: 1,
      marginLeft: 10,
      borderBottomWidth: 0.5,
      borderBottomColor: HAIRLINE,
    },
    entry: { marginTop: 8 },
    entrySub: { fontSize: 9.5, color: SOFT },
    entryDetail: { color: SOFT },
    dates: { fontSize: 9.5, color: SOFT },
    bulletGlyph: { width: 10, color: SOFT },
  },
});
