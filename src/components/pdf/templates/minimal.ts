import { defineTheme, inch } from "../theme";

const SOFT = "#5c5c5c";

// Wide margins and air instead of lines: a regular-weight name, small spaced gray capitals for
// headings and quiet dashes for bullets.
export const minimal = defineTheme({
  contactSeparator: " · ",
  bulletGlyph: "–",
  styles: {
    page: {
      paddingTop: inch(0.8),
      paddingBottom: inch(0.7),
      paddingHorizontal: inch(0.85),
      fontSize: 9.75,
      lineHeight: 1.35,
    },
    name: { fontSize: 19, fontWeight: "normal", letterSpacing: 0.3 },
    headline: { marginTop: 3, fontSize: 10.5, color: SOFT },
    contact: { marginTop: 7, fontSize: 9, color: SOFT },
    contactNext: { marginTop: 1, fontSize: 9, color: SOFT },
    link: { color: SOFT },
    webLink: { color: SOFT },
    section: { marginTop: 16 },
    // Spaced, but under ~8% of the type size: wider gaps make text extraction split the word.
    sectionTitle: {
      marginBottom: 7,
      paddingBottom: 0,
      borderBottomWidth: 0,
      fontSize: 8.5,
      fontWeight: "normal",
      letterSpacing: 0.65,
      color: SOFT,
    },
    paragraph: { marginTop: 4 },
    entry: { marginTop: 9 },
    entryTitle: { fontSize: 10 },
    entryDetail: { color: SOFT },
    dates: { fontSize: 9, color: SOFT },
    role: { marginTop: 5 },
    bullet: { marginTop: 2 },
    bulletGlyph: { width: 11, color: SOFT },
    skillLine: { marginTop: 2 },
    skillLabel: { fontWeight: "normal", color: SOFT },
  },
});
