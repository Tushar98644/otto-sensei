import { PDF_FONT } from "@/lib/pdf/fonts";
import { INK, defineTheme } from "../theme";

const RULE_GRAY = "#808080";

export const compact = defineTheme({
  contactLines: [["location", "phone", "email"], ["links"]],
  contactSeparator: " ■ ",
  bullet: { glyph: "■", shape: "square" },
  rows: {
    job: [{ lead: ["org", "detail"], side: "dates" }, { lead: ["title"] }],
    school: [{ lead: ["org", "detail"], side: "dates" }, { lead: ["title"] }],
    item: [{ lead: ["title", "org", "tech", "detail"], side: "dates" }],
  },
  companyRow: { lead: ["org", "detail"], side: "dates" },
  roleRow: { lead: ["title", "detail"], side: "dates" },
  separators: { org: ", ", detail: ", ", tech: ", ", title: ", " },
  headingRule: "above",
  dates: "years",
  skills: "bullets",
  bulletOffset: 2.4,
  accentSlots: ["sectionTitle", ["sectionTitleRule", 0.35]],
  styles: {
    page: {
      paddingTop: 36,
      paddingBottom: 36,
      paddingHorizontal: 36,
      fontFamily: PDF_FONT.tinos,
      fontSize: 10,
      lineHeight: 1.15,
      color: INK,
    },
    name: { fontSize: 12, fontWeight: "bold", textTransform: "uppercase", textAlign: "center" },
    headline: { textAlign: "center" },
    contact: { textAlign: "center" },
    contactNext: { textAlign: "center" },
    section: { marginTop: 7 },
    sectionTitleRule: { borderTopWidth: 0.75, borderTopColor: RULE_GRAY, marginBottom: 3 },
    sectionTitle: { marginBottom: 4, fontWeight: "bold", textTransform: "uppercase" },
    paragraph: { marginTop: 2 },
    entry: { marginTop: 6 },
    role: { marginTop: 3 },
    row1First: { fontWeight: "bold" },
    row2First: { fontWeight: "bold" },
    bullet: { marginTop: 0 },
    bulletGlyph: { width: 14, paddingLeft: 1, fontSize: 6, lineHeight: 11.5 / 6 },
    bulletMark: { width: 3.6, height: 3.6, marginTop: 3.9, marginLeft: 1, color: INK },
    skillLine: { marginTop: 0 },
    skillLabel: { fontWeight: "normal" },
  },
});
