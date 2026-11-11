import { ACCENT_COLORS } from "@/lib/pdf/design";
import { PDF_FONT } from "@/lib/pdf/fonts";
import { defineTheme } from "../theme";

// Awesome-CV (posquit0, LPPL) in Roboto and Source Sans. No header icons, a 10pt body (the
// original's is 9pt) and a dark accent instead of its bright red.

const ACCENT = ACCENT_COLORS.burgundy;
const DARK = "#333333";
const DARKER = "#414141";
const GRAY = "#5d5d5d";
const LIGHT = "#999999";

export const modern = defineTheme({
  contactLines: [["location"], ["phone", "email", "links"]],
  contactSeparator: "  |  ",
  bullet: { glyph: "•" },
  rows: {
    job: [
      { lead: ["org"], side: "detail" },
      { lead: ["title"], side: "dates" },
    ],
    school: [
      { lead: ["org"], side: "detail" },
      { lead: ["title"], side: "dates" },
    ],
    item: [
      { lead: ["title", "org"], side: "detail" },
      { lead: ["tech"], side: "dates" },
    ],
  },
  companyRow: { lead: ["org"], side: "detail" },
  roleRow: { lead: ["title", "detail"], side: "dates" },
  separators: { org: ", ", detail: ", ", tech: ", ", title: ", " },
  headingRule: "after",
  headingAccent: 3,
  nameSplit: true,
  accentSlots: ["sectionTitleAccent", "headline", "row1Side"],
  styles: {
    page: {
      paddingTop: 30,
      paddingBottom: 40,
      paddingHorizontal: 40,
      fontFamily: PDF_FONT.sourceSans,
      fontWeight: 300,
      fontSize: 10,
      lineHeight: 1.25,
      color: DARK,
    },
    name: {
      fontFamily: PDF_FONT.roboto,
      fontSize: 32,
      fontWeight: 300,
      lineHeight: 1.1,
      color: GRAY,
      textAlign: "center",
    },
    nameLast: { fontWeight: "bold", color: DARK },
    headline: {
      marginTop: 3,
      fontSize: 9,
      fontWeight: "normal",
      fontFeatureSettings: ["smcp"],
      color: ACCENT,
      textAlign: "center",
    },
    contact: {
      marginTop: 3,
      fontFamily: PDF_FONT.roboto,
      fontSize: 8.5,
      fontWeight: "normal",
      fontStyle: "italic",
      color: LIGHT,
      textAlign: "center",
    },
    contactNext: {
      marginTop: 2,
      fontFamily: PDF_FONT.roboto,
      fontSize: 8,
      fontWeight: "normal",
      color: DARK,
      textAlign: "center",
    },
    link: { color: DARK, textDecoration: "none" },
    webLink: { color: DARK, textDecoration: "none" },
    header: { alignItems: "center", marginBottom: 6 },
    section: { marginTop: 11 },
    sectionTitleRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 6 },
    sectionTitle: { fontSize: 16, fontWeight: "bold", color: DARK, lineHeight: 1.15 },
    sectionTitleAccent: { color: ACCENT },
    sectionTitleRule: {
      flex: 1,
      marginLeft: 4,
      marginBottom: 4.6,
      borderBottomWidth: 0.9,
      borderBottomColor: GRAY,
    },
    paragraph: { marginTop: 3 },
    entry: { marginTop: 7 },
    role: { marginTop: 4 },
    row1First: { fontSize: 11, fontWeight: "bold", color: DARKER },
    row1Rest: { fontSize: 10, color: GRAY },
    row1Side: { fontSize: 10, fontStyle: "italic", color: ACCENT },
    row2: { marginTop: 0.5 },
    row2Text: { fontSize: 9, color: GRAY },
    row2First: { fontWeight: "normal", fontFeatureSettings: ["smcp"] },
    row2Rest: { fontStyle: "italic" },
    row2Side: { fontSize: 9, fontStyle: "italic", color: GRAY },
    entryNote: { marginTop: 1 },
    bullet: { marginTop: 0.5 },
    bulletGlyph: { width: 10, paddingLeft: 1 },
    bulletMark: { width: 3, height: 3, marginTop: 5, color: DARK },
    skillLine: { marginTop: 2 },
    skillLabel: { fontWeight: "bold", color: DARKER },
  },
});
