import { ACCENT_COLORS } from "@/lib/pdf/design";
import { PDF_FONT } from "@/lib/pdf/fonts";
import { tint } from "../design";
import { INK, defineTheme } from "../theme";

// moderncv's "banking" style (LPPL) in Palatino (TeX Gyre Pagella); navy, not its bright blue.

const ACCENT = ACCENT_COLORS.navy;
const GRAY = "#727272";

export const executive = defineTheme({
  contactLines: [["location"], ["phone", "email", "links"]],
  contactSeparator: " • ",
  bullet: { glyph: "○", shape: "circle" },
  rows: {
    job: [
      { lead: ["org"], side: "detail" },
      { lead: ["title"], side: "dates" },
    ],
    school: [
      { lead: ["org"], side: "detail" },
      { lead: ["title"], side: "dates" },
    ],
    item: [{ lead: ["title", "org", "tech", "detail"], side: "dates" }],
  },
  companyRow: { lead: ["org"], side: "detail" },
  roleRow: { lead: ["title", "detail"], side: "dates" },
  separators: { org: ", ", detail: ", ", tech: ", ", title: ", " },
  headingRule: "below",
  headlineInline: true,
  accentSlots: ["name", "sectionTitle", ["sectionTitleRule", 0.55], "bulletGlyph", "bulletMark"],
  styles: {
    page: {
      paddingTop: 54,
      paddingBottom: 50,
      paddingHorizontal: 64,
      fontFamily: PDF_FONT.pagella,
      fontSize: 11,
      lineHeight: 1.24,
      color: INK,
    },
    name: {
      fontSize: 22,
      fontWeight: "bold",
      lineHeight: 1.15,
      color: ACCENT,
      textAlign: "center",
    },
    headlineInline: { fontWeight: "normal", color: "#878787" },
    headline: { fontSize: 13, color: "#878787", textAlign: "center" },
    contact: { marginTop: 2, color: GRAY, textAlign: "center" },
    contactNext: { color: GRAY, textAlign: "center" },
    link: { color: GRAY, textDecoration: "none" },
    webLink: { color: GRAY, textDecoration: "none" },
    section: { marginTop: 13 },
    sectionTitle: { fontSize: 14.4, fontWeight: "bold", color: ACCENT, lineHeight: 1.1 },
    sectionTitleRule: {
      borderBottomWidth: 0.4,
      borderBottomColor: tint(ACCENT, 0.55),
      marginBottom: 5,
    },
    paragraph: { marginTop: 3 },
    entry: { marginTop: 7 },
    role: { marginTop: 4 },
    row1First: { fontWeight: "bold" },
    row1Side: { fontWeight: "bold" },
    row2Text: { fontStyle: "italic" },
    row2First: {},
    row2Side: { fontStyle: "italic" },
    entryNote: { marginTop: 1, fontSize: 10 },
    bullet: { marginTop: 1.5 },
    bulletGlyph: { width: 13, fontSize: 8, lineHeight: 13.02 / 8, color: ACCENT },
    bulletMark: { width: 4, height: 4, marginTop: 5.5, marginLeft: 1, color: ACCENT },
    bulletText: { fontSize: 10.5 },
    skillLine: { marginTop: 2 },
    skillLabel: { fontWeight: "bold" },
  },
});
