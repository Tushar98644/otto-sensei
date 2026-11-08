import { INK, defineTheme, inch } from "../theme";

// Everything a size smaller and closer together, with a black hairline under small capital
// headings, so a long career still fits on one page.
export const compact = defineTheme({
  styles: {
    page: {
      paddingTop: inch(0.45),
      paddingBottom: inch(0.45),
      paddingHorizontal: inch(0.55),
      fontSize: 9,
      lineHeight: 1.25,
    },
    name: { fontSize: 16, lineHeight: 1.15 },
    headline: { marginTop: 1, fontSize: 9.5 },
    contact: { marginTop: 2, fontSize: 8.5 },
    contactNext: { marginTop: 0.5, fontSize: 8.5 },
    section: { marginTop: 8 },
    sectionTitle: {
      marginBottom: 3,
      paddingBottom: 1.5,
      borderBottomWidth: 0.5,
      borderBottomColor: INK,
      fontSize: 8.5,
      letterSpacing: 0.6,
    },
    paragraph: { marginTop: 2 },
    entry: { marginTop: 4.5 },
    entryTitle: { fontSize: 9.5 },
    dates: { fontSize: 8.5 },
    role: { marginTop: 2.5 },
    bullet: { marginTop: 1 },
    bulletGlyph: { width: 9 },
    skillLine: { marginTop: 1 },
  },
});
