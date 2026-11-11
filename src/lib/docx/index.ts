import JSZip from "jszip";
import { themeFor } from "@/components/pdf/themes";
import { BRAND } from "@/config/brand";
import { letterDate, letterParagraphs } from "@/lib/pdf/letter";
import { buildPdfModel } from "@/lib/pdf/model";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import type { Resume, TemplateId } from "@/lib/resume/schema";
import { bodyXml, header, sectionPropsXml } from "./body";
import { docxLook, type DocxLook } from "./look";
import { fontTableXml, numberingXml, stylesXml } from "./styles";
import { R_NS, W_NS, XML_HEAD, escapeXml, paragraph, run } from "./xml";

// Built in the browser with jszip: named styles, Heading 1 sections, a real bulleted list. Many
// application forms still ask for Word, and this is the shape their parsers read best.

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type DocxOptions = {
  pageSize?: PdfPageSize;
  template?: TemplateId;
  // Epoch ms for the file's created date.
  now?: number;
};

const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships";

const CONTENT_TYPES = [
  XML_HEAD,
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
  '<Default Extension="xml" ContentType="application/xml"/>',
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>',
  '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>',
  '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>',
  '<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>',
  '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
  '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
  "</Types>",
].join("");

const ROOT_RELS = [
  XML_HEAD,
  `<Relationships xmlns="${PKG_REL}">`,
  `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/>`,
  `<Relationship Id="rId2" Type="${PKG_REL}/metadata/core-properties" Target="docProps/core.xml"/>`,
  `<Relationship Id="rId3" Type="${REL}/extended-properties" Target="docProps/app.xml"/>`,
  "</Relationships>",
].join("");

const SETTINGS = [
  XML_HEAD,
  `<w:settings xmlns:w="${W_NS}">`,
  '<w:zoom w:percent="100"/><w:defaultTabStop w:val="720"/>',
  '<w:characterSpacingControl w:val="doNotCompress"/>',
  '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>',
  "</w:settings>",
].join("");

const APP = [
  XML_HEAD,
  '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">',
  `<Application>${escapeXml(BRAND.name)}</Application>`,
  "</Properties>",
].join("");

function coreXml(title: string, author: string, subject: string, now: number): string {
  // W3CDTF without milliseconds, the form Word writes.
  const stamp = new Date(now).toISOString().replace(/\.\d{3}Z$/, "Z");
  return [
    XML_HEAD,
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
    `<dc:title>${escapeXml(title)}</dc:title>`,
    subject ? `<dc:subject>${escapeXml(subject)}</dc:subject>` : "",
    author ? `<dc:creator>${escapeXml(author)}</dc:creator>` : "",
    `<dcterms:created xsi:type="dcterms:W3CDTF">${stamp}</dcterms:created>`,
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${stamp}</dcterms:modified>`,
    "</cp:coreProperties>",
  ].join("");
}

type Links = { add: (href: string) => string; rels: () => string[] };

// Hyperlinks get relationship ids after the fixed parts (styles, numbering, settings, fonts).
function hyperlinks(): Links {
  const ids = new Map<string, string>();
  return {
    add(href: string) {
      let id = ids.get(href);
      if (!id) {
        id = `rId${ids.size + 10}`;
        ids.set(href, id);
      }
      return id;
    },
    rels: () =>
      [...ids].map(
        ([href, id]) =>
          `<Relationship Id="${id}" Type="${REL}/hyperlink" Target="${escapeXml(href)}" TargetMode="External"/>`,
      ),
  };
}

type Package = {
  body: string;
  look: DocxLook;
  links: Links;
  meta: { title: string; author: string; subject: string };
  now: number;
};

async function pack({ body, look, links, meta, now }: Package): Promise<Uint8Array> {
  const document = [
    XML_HEAD,
    `<w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:body>`,
    body,
    sectionPropsXml(look),
    "</w:body></w:document>",
  ].join("");
  const documentRels = [
    XML_HEAD,
    `<Relationships xmlns="${PKG_REL}">`,
    `<Relationship Id="rId1" Type="${REL}/styles" Target="styles.xml"/>`,
    `<Relationship Id="rId2" Type="${REL}/numbering" Target="numbering.xml"/>`,
    `<Relationship Id="rId3" Type="${REL}/settings" Target="settings.xml"/>`,
    `<Relationship Id="rId4" Type="${REL}/fontTable" Target="fontTable.xml"/>`,
    ...links.rels(),
    "</Relationships>",
  ].join("");

  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", ROOT_RELS);
  zip.file("docProps/core.xml", coreXml(meta.title, meta.author, meta.subject, now));
  zip.file("docProps/app.xml", APP);
  zip.file("word/document.xml", document);
  zip.file("word/_rels/document.xml.rels", documentRels);
  zip.file("word/styles.xml", stylesXml(look));
  zip.file("word/numbering.xml", numberingXml(look));
  zip.file("word/settings.xml", SETTINGS);
  zip.file("word/fontTable.xml", fontTableXml(look));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE", mimeType: DOCX_MIME });
}

const toBlob = (bytes: Uint8Array) => new Blob([bytes.slice().buffer], { type: DOCX_MIME });

export async function buildResumeDocx(
  resume: Resume,
  options: DocxOptions = {},
): Promise<Uint8Array> {
  const { pageSize = "LETTER", template, now = Date.now() } = options;
  const model = buildPdfModel(resume, { charset: "unicode" });
  const look = docxLook(themeFor(resume, template), pageSize);
  const links = hyperlinks();
  return pack({ body: bodyXml(model, look, links), look, links, meta: model.meta, now });
}

// Paragraphs further apart than resume lines, the date set off, like the letter PDF.
const LETTER_DATE = { before: 18, after: 14 };
const LETTER_GAP = 10;

// A single line break stays inside its paragraph, so "Best regards," keeps the name under it.
export async function buildLetterDocx(
  resume: Resume,
  letter: string,
  options: DocxOptions = {},
): Promise<Uint8Array> {
  const { pageSize = "LETTER", template, now = Date.now() } = options;
  const model = buildPdfModel(resume, { charset: "unicode" });
  const look = docxLook(themeFor(resume, template), pageSize);
  const links = hyperlinks();
  const paragraphs = letterParagraphs(letter).map((lines, index) =>
    paragraph(lines.map((line, at) => (at > 0 ? "<w:r><w:br/></w:r>" : "") + run(line)).join(""), {
      keepLines: true,
      before: index > 0 ? LETTER_GAP : undefined,
    }),
  );
  const body = [
    ...header(model, look, links),
    paragraph(run(letterDate(now, pageSize)), LETTER_DATE),
    ...paragraphs,
  ].join("");
  const title = model.name ? `${model.name} - Cover letter` : "Cover letter";
  return pack({ body, look, links, meta: { ...model.meta, title }, now });
}

export async function buildLetterDocxBlob(
  resume: Resume,
  letter: string,
  options: DocxOptions = {},
): Promise<Blob> {
  return toBlob(await buildLetterDocx(resume, letter, options));
}

export async function buildResumeDocxBlob(
  resume: Resume,
  options: DocxOptions = {},
): Promise<Blob> {
  return toBlob(await buildResumeDocx(resume, options));
}

/** "Maya-Lindqvist-Resume.pdf" -> "Maya-Lindqvist-Resume.docx". */
export function docxFileName(pdfFileName: string): string {
  return pdfFileName.replace(/\.pdf$/i, "") + ".docx";
}
