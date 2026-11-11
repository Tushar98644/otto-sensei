import { Document, Page, View } from "@react-pdf/renderer";
import { BRAND } from "@/config/brand";
import { letterBlocks, letterDate } from "@/lib/pdf/letter";
import { buildPdfModel } from "@/lib/pdf/model";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import type { Resume, TemplateId } from "@/lib/resume/schema";
import { Header, Line } from "./document";
import { withFontFallbacks } from "./fonts";
import { modelText, themeText } from "./layout";
import { themeFor } from "./themes";
import type { PdfStyle } from "./theme";

export type LetterPdfProps = {
  resume: Resume;
  letter: string;
  pageSize?: PdfPageSize;
  template?: TemplateId;
  now: number;
};

const BLOCK_GAP: PdfStyle = { marginTop: 10 };
const DATE: PdfStyle = { marginTop: 18, marginBottom: 14 };

export function LetterPdf({ resume, letter, pageSize = "LETTER", template, now }: LetterPdfProps) {
  const model = buildPdfModel(resume);
  const blocks = letterBlocks(letter);
  const base = themeFor(resume, template);
  const theme = withFontFallbacks(
    base,
    [modelText(model), themeText(base), ...blocks.flat()].join("\n"),
  );
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
