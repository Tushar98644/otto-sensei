import { PDF_FONT } from "@/lib/pdf/fonts";
import { INK, defineTheme } from "../theme";

// The tech resume engineers pass around as a LaTeX template (Jake Gutierrez's, MIT; credited in
// THIRD_PARTY_NOTICES.md): Computer Modern (CMU Serif), a big bold name, small-capital headings
// over a full rule, and indented entries of a bold line with an italic line under it, dates and
// places on the right. Skills stay first by default (the format's section hint).

// Jake's entries sit 0.15in in from the margin and end 3% short of it.
const INDENT = 10.8;
const INSET = 5.4;

export const developer = defineTheme({
  contactLines: [["location", "phone", "email", "links"]],
  contactSeparator: " | ",
  bullet: { glyph: "•" },
  rows: {
    job: [
      { lead: ["title"], side: "dates" },
      { lead: ["org"], side: "detail" },
    ],
    school: [
      { lead: ["org"], side: "detail" },
      { lead: ["title"], side: "dates" },
    ],
    item: [{ lead: ["title", "tech", "org", "detail"], side: "dates" }],
  },
  // Like Jake's: a later role at the same company is one italic line, title and dates.
  companyRow: undefined,
  roleRow: { lead: ["title", "detail"], side: "dates" },
  separators: { tech: " | ", org: ", ", detail: " | ", title: ", " },
  headingRule: "below",
  bulletOffset: 2.4,
  styles: {
    page: {
      paddingTop: 36,
      paddingBottom: 36,
      paddingHorizontal: 36,
      fontFamily: PDF_FONT.cmu,
      fontSize: 11,
      lineHeight: 1.2,
      color: INK,
    },
    name: { fontSize: 24.88, fontWeight: "bold", lineHeight: 1.15, textAlign: "center" },
    headline: { fontSize: 11, textAlign: "center" },
    contact: { marginTop: 1, fontSize: 10, textAlign: "center" },
    contactNext: { fontSize: 10, textAlign: "center" },
    link: { color: INK, textDecoration: "underline" },
    webLink: { color: INK, textDecoration: "underline" },
    section: { marginTop: 9 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "normal",
      fontFeatureSettings: ["smcp"],
      lineHeight: 1.1,
      marginBottom: 0,
    },
    sectionTitleRule: {
      borderBottomWidth: 0.4,
      borderBottomColor: INK,
      marginTop: 1,
      marginBottom: 4,
    },
    paragraph: { marginTop: 2, paddingLeft: INDENT, paddingRight: INSET, fontSize: 10 },
    entry: { marginTop: 5 },
    role: { marginTop: 2 },
    row1: { paddingLeft: INDENT, paddingRight: INSET },
    row1Text: { fontSize: 11 },
    row1First: { fontWeight: "bold" },
    row1Rest: { fontSize: 10, fontStyle: "italic" },
    row1Side: { fontSize: 11 },
    row2: { paddingLeft: INDENT, paddingRight: INSET },
    row2Text: { fontSize: 10, fontStyle: "italic" },
    row2First: {},
    row2Rest: {},
    row2Side: { fontSize: 10, fontStyle: "italic" },
    entryNote: { marginTop: 1, paddingLeft: INDENT, fontSize: 10 },
    // A small bullet at about 0.45in, its line at about 0.5in, like LaTeX's second-level list.
    bullet: { marginTop: 1.2, paddingLeft: INDENT + 14, paddingRight: INSET },
    bulletGlyph: { width: 11, fontSize: 7, lineHeight: 12 / 7, textAlign: "center" },
    bulletMark: { width: 2.6, height: 2.6, marginTop: 4.6, color: INK },
    bulletText: { fontSize: 10, lineHeight: 1.2 },
    skillLine: { marginTop: 0.5, paddingLeft: INDENT, paddingRight: INSET, fontSize: 10 },
    skillLabel: { fontWeight: "bold" },
  },
});
