import { PDF_FONT } from "@/lib/pdf/fonts";
import { INK, defineTheme } from "../theme";

export const classic = defineTheme({
  contactLines: [["location", "email", "phone", "links"]],
  contactSeparator: " • ",
  bullet: { glyph: "•" },
  separators: { org: ", ", detail: ", ", tech: " | ", title: ", " },
  styles: {
    page: {
      paddingTop: 36,
      paddingBottom: 36,
      paddingHorizontal: 54,
      fontFamily: PDF_FONT.carlito,
      fontSize: 11,
      lineHeight: 1.2,
      color: INK,
    },
    name: { fontSize: 12, fontWeight: "bold", textAlign: "center" },
    headline: { textAlign: "center" },
    contact: { textAlign: "center" },
    contactNext: { textAlign: "center" },
    section: { marginTop: 12 },
    sectionTitle: { marginBottom: 2, fontWeight: "bold", textAlign: "center" },
    paragraph: { marginTop: 3 },
    entry: { marginTop: 9 },
    role: { marginTop: 3 },
    row1First: { fontWeight: "bold" },
    row2First: {},
    bullet: { marginTop: 0 },
    bulletGlyph: { width: 30, paddingLeft: 12 },
    skillLine: { marginTop: 1 },
    skillLabel: { fontWeight: "bold" },
  },
});
