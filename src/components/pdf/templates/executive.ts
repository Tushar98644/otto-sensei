import { INK, MUTED, RULE, defineTheme, inch } from "../theme";

// Times throughout, a centered header closed by a rule, spaced capital headings and more room
// between sections. The company follows the title in italics.
export const executive = defineTheme({
  headerRule: true,
  styles: {
    page: {
      paddingTop: inch(0.6),
      paddingBottom: inch(0.55),
      paddingHorizontal: inch(0.8),
      fontFamily: "Times-Roman",
      fontSize: 10.5,
      lineHeight: 1.32,
    },
    header: { alignItems: "center" },
    // Letter spacing stays under ~8% of the type size everywhere: past that, text extraction
    // (pdf.js, and the hiring software built like it) reads "S U M M A R Y".
    name: {
      fontSize: 22,
      fontWeight: "normal",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      textAlign: "center",
    },
    headline: { marginTop: 2, fontSize: 11.5, fontStyle: "italic", textAlign: "center" },
    contact: { marginTop: 5, fontSize: 9.75, textAlign: "center" },
    contactNext: { marginTop: 1, fontSize: 9.75, textAlign: "center" },
    headerRule: {
      alignSelf: "stretch",
      marginTop: 9,
      borderBottomWidth: 0.75,
      borderBottomColor: INK,
    },
    section: { marginTop: 14 },
    sectionTitle: {
      marginBottom: 7,
      paddingBottom: 2,
      borderBottomWidth: 0.5,
      borderBottomColor: RULE,
      fontSize: 10.5,
      letterSpacing: 0.8,
    },
    paragraph: { marginTop: 3.5 },
    entry: { marginTop: 9 },
    entryTitle: { fontSize: 11 },
    entryOrg: { fontStyle: "italic" },
    entryDetail: { color: MUTED },
    dates: { fontSize: 10 },
    role: { marginTop: 5 },
    bullet: { marginTop: 2.5 },
    bulletGlyph: { width: 12 },
    skillLine: { marginTop: 2.5 },
  },
});
