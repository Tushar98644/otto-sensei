import { PDF_FONT } from "@/lib/pdf/fonts";
import { INK, defineTheme } from "../theme";

// RenderCV's "engineeringresumes" theme (MIT): Charter (Charis) 10pt, black only.

export const minimal = defineTheme({
  contactLines: [["location", "email", "phone", "links"]],
  contactSeparator: "  |  ",
  bullet: { glyph: "•" },
  rows: {
    job: [{ lead: ["title", "org", "detail"], side: "dates" }],
    school: [{ lead: ["org", "title", "detail"], side: "dates" }],
    item: [{ lead: ["title", "org", "tech", "detail"], side: "dates" }],
  },
  companyRow: { lead: ["org", "detail"] },
  roleRow: { lead: ["title", "detail"], side: "dates" },
  separators: { org: ", ", title: ", ", detail: " – ", tech: " – " },
  headingRule: "below",
  bulletOffset: -2.2,
  accentSlots: ["sectionTitle", "sectionTitleRule"],
  styles: {
    page: {
      paddingTop: 50.4,
      paddingBottom: 50.4,
      paddingHorizontal: 50.4,
      fontFamily: PDF_FONT.charis,
      fontSize: 10,
      lineHeight: 1.3,
      color: INK,
    },
    name: { fontSize: 25, fontWeight: "normal", lineHeight: 1.2, textAlign: "center" },
    headline: { marginTop: 2, fontSize: 11, textAlign: "center" },
    contact: { marginTop: 10, textAlign: "center" },
    contactNext: { textAlign: "center" },
    section: { marginTop: 13 },
    sectionTitle: { fontSize: 12, fontWeight: "bold", lineHeight: 1.2 },
    sectionTitleRule: {
      borderBottomWidth: 0.5,
      borderBottomColor: INK,
      marginTop: 1,
      marginBottom: 7,
    },
    paragraph: { marginTop: 2.3 },
    entry: { marginTop: 11 },
    role: { marginTop: 5 },
    row1First: { fontWeight: "bold" },
    row2First: { fontWeight: "bold" },
    entryNote: { marginTop: 2 },
    bullet: { marginTop: 2.3 },
    // RenderCV's large bullet: a 13pt dot on the 10pt line.
    bulletGlyph: { width: 11, fontSize: 13, lineHeight: 1 },
    bulletMark: { width: 3.5, height: 3.5, marginTop: 4.8, color: INK },
    skillLine: { marginTop: 2.3 },
    skillLabel: { fontWeight: "bold" },
  },
});
