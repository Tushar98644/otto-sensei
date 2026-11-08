import { Document, Page, View } from "@react-pdf/renderer";
import { BRAND } from "@/config/brand";
import { letterBlocks, letterDate } from "@/lib/pdf/letter";
import { buildPdfModel } from "@/lib/pdf/model";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import type { Resume, TemplateId } from "@/lib/resume/schema";
import { Header, Line } from "./document";
import { themeFor } from "./themes";
import type { PdfStyle } from "./theme";

// The cover letter in the resume's own format: the same name block, fonts, sizes and margins, so
// the two pages read as one application. Real text only, like the resume.

export type LetterPdfProps = {
  // Supplies the name block and, unless `template` is given, the format.
  resume: Resume;
  letter: string;
  pageSize?: PdfPageSize;
  template?: TemplateId;
  // Epoch ms for the date line.
  now: number;
};

// A letter reads in paragraphs, so they sit further apart than resume lines do.
const BLOCK_GAP: PdfStyle = { marginTop: 10 };
const DATE: PdfStyle = { marginTop: 18, marginBottom: 14 };

export function LetterPdf({ resume, letter, pageSize = "LETTER", template, now }: LetterPdfProps) {
  const theme = themeFor(resume, template);
  const model = buildPdfModel(resume);
  const blocks = letterBlocks(letter);
  const title = model.name ? `${model.name} - Cover letter` : "Cover letter";
  return (
    <Document
      title={title}
      author={model.meta.author || undefined}
      creator={BRAND.name}
      language="en"
    >
      <Page size={pageSize} style={theme.styles.page}>
        <Header model={model} theme={theme} />
        <Line style={DATE}>{letterDate(now, pageSize)}</Line>
        {blocks.map((lines, index) => (
          // A paragraph never splits across pages, so the sign-off stays with the name under it.
          <View key={index} wrap={false} style={index > 0 ? BLOCK_GAP : undefined}>
            {lines.map((line, lineIndex) => (
              <Line key={lineIndex}>{line}</Line>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
