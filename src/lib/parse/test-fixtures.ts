import JSZip from "jszip";
import {
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFString,
  StandardFonts,
  beginText,
  concatTransformationMatrix,
  drawObject,
  endText,
  moveText,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setFontAndSize,
  showText,
  type PDFFont,
  type PDFPage,
  type PDFRef,
} from "pdf-lib";

const LETTER: [number, number] = [612, 792];

type Fonts = { regular: PDFFont; bold: PDFFont };

async function newPdf(): Promise<{ doc: PDFDocument; page: PDFPage; fonts: Fonts }> {
  const doc = await PDFDocument.create();
  const page = doc.addPage(LETTER);
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  return { doc, page, fonts };
}

function rightAligned(
  page: PDFPage,
  text: string,
  right: number,
  y: number,
  size: number,
  font: PDFFont,
) {
  page.drawText(text, { x: right - font.widthOfTextAtSize(text, size), y, size, font });
}

export async function cleanResumePdf(): Promise<Uint8Array> {
  const { doc, page, fonts } = await newPdf();
  const { regular, bold } = fonts;
  let y = 740;
  const line = (
    text: string,
    options: { x?: number; size?: number; font?: PDFFont; gap?: number } = {},
  ) => {
    page.drawText(text, {
      x: options.x ?? 50,
      y,
      size: options.size ?? 10,
      font: options.font ?? regular,
    });
    y -= options.gap ?? 13;
  };
  const job = (title: string, dates: string) => {
    page.drawText(title, { x: 50, y, size: 10, font: bold });
    rightAligned(page, dates, 562, y, 10, regular);
    y -= 14;
  };

  line("Jane Doe", { size: 20, font: bold, gap: 20 });
  line("Senior Software Engineer", { size: 12, gap: 16 });
  line("jane.doe@example.com | +1 555 123 4567 | Berlin, Germany", { gap: 26 });
  line("SUMMARY", { size: 12, font: bold, gap: 15 });
  line("Backend engineer with eight years of experience building payment and data systems for");
  line(
    "fast-growing companies. I like clear code, calm on-call rotations and teams that ship small",
  );
  line("changes often.", { gap: 24 });
  line("EXPERIENCE", { size: 12, font: bold, gap: 16 });
  job("Senior Software Engineer, Acme Corp", "Jan 2021 - Present");
  line("• Built a payment API in Go that handles two million requests a day with 99.99% uptime.");
  line(
    "• Led a team of five engineers through a move to Kubernetes, cutting release time from two",
  );
  line("days to two hours.", { x: 59 });
  line("• Mentored three junior developers, and all three were promoted within a year.", {
    gap: 20,
  });
  job("Software Engineer, Beta Labs", "Mar 2018 - Dec 2020");
  line("• Rebuilt the reporting pipeline in Python, which cut nightly run time by 70 percent.");
  line("• Added end-to-end tests that caught over 40 bugs before they reached customers.");
  line("• Wrote the on-call guide that the whole engineering team still uses today.", { gap: 24 });
  line("EDUCATION", { size: 12, font: bold, gap: 16 });
  job("BSc Computer Science, University of Somewhere", "Sep 2014 - Jun 2018");
  y -= 10;
  line("SKILLS", { size: 12, font: bold, gap: 16 });
  line("Python, TypeScript, Go, PostgreSQL, AWS, Docker, Kubernetes");
  line("Languages: English, German");
  return doc.save();
}

export async function twoColumnPdf(): Promise<Uint8Array> {
  const { doc, page, fonts } = await newPdf();
  const { regular, bold } = fonts;
  page.drawText("Alex Morgan", { x: 40, y: 750, size: 22, font: bold });
  const photo = await doc.embedPng(TINY_PNG);
  page.drawImage(photo, { x: 512, y: 730, width: 50, height: 50 });

  const sidebar = [
    "CONTACT",
    "alex.morgan@example.com",
    "+44 20 7946 0958",
    "London, UK",
    "",
    "SKILLS",
    "Python",
    "TypeScript",
    "React",
    "Node.js",
    "PostgreSQL",
    "Docker",
    "",
    "EDUCATION",
    "BSc Computer Science",
    "University of Leeds",
    "2013 - 2016",
  ];
  const main = [
    "EXPERIENCE",
    "Senior Product Engineer, Northwind\tJan 2020 - Present",
    "• Shipped a new checkout flow that lifted conversion by twelve percent on web",
    "and mobile for two million monthly shoppers.",
    "• Built a design system now used by forty engineers across six product teams.",
    "• Cut page load time in half by moving image work to a background queue.",
    "",
    "Software Engineer, Fabrikam\tJun 2016 - Dec 2019",
    "• Wrote the first version of the partner API that now serves three hundred",
    "companies every day.",
    "• Moved the main database to PostgreSQL with zero downtime over one weekend.",
    "• Ran weekly code reviews for the team of eight and wrote the style guide.",
    "",
    "Junior Developer, Contoso\tSep 2015 - May 2016",
    "• Fixed customer bugs and built small internal tools for the support team.",
    "• Automated the release notes so nobody had to write them by hand again.",
    "• Learned to ship small changes often, with tests, and to ask good questions.",
  ];
  const top = 700;
  const spacing = 14;
  sidebar.forEach((text, i) => {
    if (!text) return;
    const heading = text === text.toUpperCase() && /^[A-Z ]+$/.test(text);
    page.drawText(text, { x: 40, y: top - i * spacing, size: 9, font: heading ? bold : regular });
  });
  main.forEach((text, i) => {
    if (!text) return;
    const [left = "", right] = text.split("\t");
    const heading = left === left.toUpperCase() && /^[A-Z ]+$/.test(left);
    page.drawText(left, {
      x: 230,
      y: top - i * spacing,
      size: 10,
      font: heading || right ? bold : regular,
    });
    if (right) rightAligned(page, right, 572, top - i * spacing, 10, regular);
  });
  return doc.save();
}

export async function linkedContactPdf(): Promise<Uint8Array> {
  const { doc, page, fonts } = await newPdf();
  page.drawText("Jane Doe", { x: 50, y: 740, size: 20, font: fonts.bold });
  const parts: [string, string][] = [
    ["github.com/jane", "https://github.com/jane-doe-42"],
    ["LinkedIn", "https://www.linkedin.com/in/jane-doe/"],
    ["bit.ly/jane-site", "https://janedoe.dev/"],
  ];
  const annots = [];
  let x = 50;
  for (const [text, url] of parts) {
    page.drawText(text, { x, y: 712, size: 10, font: fonts.regular });
    const width = fonts.regular.widthOfTextAtSize(text, 10);
    const annot = doc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x, 709, x + width, 722],
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
    });
    annots.push(doc.context.register(annot));
    x += width + 30;
  }
  page.node.set(PDFName.of("Annots"), doc.context.obj(annots));
  page.drawText("EXPERIENCE", { x: 50, y: 680, size: 12, font: fonts.bold });
  return doc.save();
}

export async function noTextPdf(): Promise<Uint8Array> {
  const { doc, page } = await newPdf();
  page.drawRectangle({ x: 50, y: 600, width: 500, height: 120, color: rgb(0.9, 0.9, 0.9) });
  page.drawLine({ start: { x: 50, y: 560 }, end: { x: 560, y: 560 }, thickness: 2 });
  page.drawCircle({ x: 300, y: 300, size: 60, borderWidth: 3 });
  return doc.save();
}

type RawImage = {
  width: number;
  height: number;
  stencil?: boolean;
  glyph?: boolean;
  onPages?: readonly number[];
};

// Like a printed emoji: a Type3 font whose one glyph paints the picture.
function drawGlyphImage(doc: PDFDocument, page: PDFPage, image: PDFRef, i: number) {
  const { context } = doc;
  const proc = context.register(
    context.stream("1000 0 0 0 1000 1000 d1 q 1000 0 0 1000 0 0 cm /Xg Do Q"),
  );
  const font = context.register(
    context.obj({
      Type: "Font",
      Subtype: "Type3",
      FontBBox: [0, 0, 1000, 1000],
      FontMatrix: [0.001, 0, 0, 0.001, 0, 0],
      CharProcs: { g1: proc },
      Encoding: { Type: "Encoding", Differences: [1, "g1"] },
      FirstChar: 1,
      LastChar: 1,
      Widths: [1000],
      Resources: { XObject: { Xg: image } },
    }),
  );
  page.node.setFontDictionary(PDFName.of(`T${i}`), font);
  page.pushOperators(
    beginText(),
    setFontAndSize(`T${i}`, 12),
    moveText(50 + i * 50, 700),
    showText(PDFHexString.of("01")),
    endText(),
  );
}

// Image streams with a declared size but almost no data: fine to count, never to decode.
export async function imagesPdf(
  images: readonly RawImage[],
  { pages = 1, objectStreams = true }: { pages?: number; objectStreams?: boolean } = {},
): Promise<{ bytes: Uint8Array; ids: number[] }> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const sheets = Array.from({ length: pages }, () => doc.addPage(LETTER));
  sheets[0]?.drawText("Jane Doe, Senior Software Engineer", { x: 50, y: 740, size: 12, font });
  const ids = images.map(({ width, height, stencil = false, glyph = false, ...image }, i) => {
    const dict = stencil
      ? { ImageMask: true, BitsPerComponent: 1 }
      : { ColorSpace: "DeviceRGB", BitsPerComponent: 8 };
    const ref = doc.context.register(
      doc.context.stream(new Uint8Array(16), {
        Type: "XObject",
        Subtype: "Image",
        Width: width,
        Height: height,
        ...dict,
      }),
    );
    if (glyph && sheets[0]) drawGlyphImage(doc, sheets[0], ref, i);
    for (const index of image.onPages ?? (glyph ? [] : [0])) {
      const sheet = sheets[index];
      if (!sheet) continue;
      sheet.node.setXObject(PDFName.of(`Im${i}`), ref);
      sheet.pushOperators(
        pushGraphicsState(),
        concatTransformationMatrix(40, 0, 0, 40, 50 + i * 50, 600),
        drawObject(`Im${i}`),
        popGraphicsState(),
      );
    }
    return ref.objectNumber;
  });
  return { bytes: await doc.save({ useObjectStreams: objectStreams }), ids };
}

export async function blankPdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage(LETTER);
  return doc.save();
}

export async function encryptedPdf(): Promise<Uint8Array> {
  const { doc, page, fonts } = await newPdf();
  page.drawText("Secret resume", { x: 50, y: 700, size: 12, font: fonts.regular });
  const context = doc.context;
  const encrypt = context.obj({
    Filter: "Standard",
    V: 1,
    R: 2,
    O: PDFHexString.of("11".repeat(32)),
    U: PDFHexString.of("22".repeat(32)),
    P: -4,
  });
  context.trailerInfo.Encrypt = context.register(encrypt);
  context.trailerInfo.ID = context.obj([
    PDFHexString.of("ab".repeat(16)),
    PDFHexString.of("ab".repeat(16)),
  ]);
  return doc.save({ useObjectStreams: false });
}

const TINY_PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP4z8DwHwyBNAMDAwMAZ/kH+Uq9KvMAAAAASUVORK5CYII=",
  ),
  (char) => char.charCodeAt(0),
);

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const NAMESPACES = [
  W,
  R,
  'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"',
  'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"',
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"',
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"',
  'xmlns:v="urn:schemas-microsoft-com:vml"',
  'mc:Ignorable="wps"',
].join(" ");

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const paragraph = (...runs: string[]) =>
  `<w:p>${runs.map((run) => (run === "\n" ? "<w:r><w:br/></w:r>" : `<w:r><w:t xml:space="preserve">${escapeXml(run)}</w:t></w:r>`)).join("")}</w:p>`;

const table = (...rows: string[][]) =>
  `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>${rows
    .map(
      (cells) => `<w:tr>${cells.map((cell) => `<w:tc>${paragraph(cell)}</w:tc>`).join("")}</w:tr>`,
    )
    .join("")}</w:tbl>`;

const textBox = (text: string) =>
  `<w:p><w:r><mc:AlternateContent>` +
  `<mc:Choice Requires="wps"><w:drawing><wp:anchor><a:graphic><a:graphicData><wps:wsp><wps:txbx>` +
  `<w:txbxContent>${paragraph(text)}</w:txbxContent></wps:txbx></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice>` +
  `<mc:Fallback><w:pict><v:shape><v:textbox><w:txbxContent>${paragraph(text)}</w:txbxContent></v:textbox></v:shape></w:pict></mc:Fallback>` +
  `</mc:AlternateContent></w:r></w:p>`;

type DocxOptions = {
  body: string;
  header?: string;
  columns?: number;
  pages?: number;
};

export async function buildDocx({
  body,
  header,
  columns,
  pages,
}: DocxOptions): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
</Relationships>`,
  );
  const headerRef = header === undefined ? "" : '<w:headerReference w:type="default" r:id="rId2"/>';
  const cols = columns ? `<w:cols w:space="720" w:num="${columns}"/>` : "";
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${NAMESPACES}><w:body>${body}<w:sectPr>${headerRef}<w:pgSz w:w="12240" w:h="15840"/>${cols}</w:sectPr></w:body></w:document>`,
  );
  if (header !== undefined) {
    zip.file(
      "word/header1.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${W} ${R}>${paragraph(header)}</w:hdr>`,
    );
  }
  if (pages !== undefined) {
    zip.file(
      "docProps/app.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Pages>${pages}</Pages></Properties>`,
    );
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export function templateDocx(): Promise<Uint8Array> {
  return buildDocx({
    header: "sam.rivera@example.com",
    columns: 2,
    body: [
      paragraph("Sam Rivera"),
      paragraph("San Francisco, CA | +1 (415) 555-0134"),
      paragraph("Experience"),
      table(["Lead Developer, Contoso Ltd", "Feb 2019 - Present"]),
      paragraph(
        "Built a hiring dashboard used by 300 recruiters.",
        "\n",
        "Cut report time from hours to minutes.",
      ),
      textBox("Skills: Python, SQL, Tableau"),
      paragraph("Education"),
      paragraph("BA Economics, University of Somewhere, 2018"),
    ].join(""),
  });
}
