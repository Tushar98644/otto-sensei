import JSZip from "jszip";
import { themeFor } from "@/components/pdf/themes";
import { BRAND } from "@/config/brand";
import { buildPdfModel } from "@/lib/pdf/model";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import type { Resume, TemplateId } from "@/lib/resume/schema";
import { bodyXml, sectionPropsXml } from "./body";
import { docxLook } from "./look";
import { numberingXml, stylesXml } from "./styles";
import { R_NS, W_NS, XML_HEAD, escapeXml } from "./xml";

// The resume as a real Word file (.docx), built in the browser with jszip: named styles, Heading 1
// sections, a bulleted list, dates on a tab stop, the chosen page size, font and accent. Many
// application forms still ask for Word, and this is the shape their parsers read best.

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type DocxOptions = {
  pageSize?: PdfPageSize;
  // Defaults to the format saved on the resume.
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

/** The .docx file's bytes. */
export async function buildResumeDocx(
  resume: Resume,
  options: DocxOptions = {},
): Promise<Uint8Array> {
  const { pageSize = "LETTER", template, now = Date.now() } = options;
  const model = buildPdfModel(resume, { charset: "unicode" });
  const look = docxLook(themeFor(resume, template), pageSize);
  const hyperlinks = new Map<string, string>();
  const links = {
    add(href: string) {
      let id = hyperlinks.get(href);
      if (!id) {
        // rId1-3 are the styles, numbering and settings parts below.
        id = `rId${hyperlinks.size + 10}`;
        hyperlinks.set(href, id);
      }
      return id;
    },
  };
  const body = bodyXml(model, look, links);
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
    ...[...hyperlinks].map(
      ([href, id]) =>
        `<Relationship Id="${id}" Type="${REL}/hyperlink" Target="${escapeXml(href)}" TargetMode="External"/>`,
    ),
    "</Relationships>",
  ].join("");

  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", ROOT_RELS);
  zip.file(
    "docProps/core.xml",
    coreXml(model.meta.title, model.meta.author, model.meta.subject, now),
  );
  zip.file("docProps/app.xml", APP);
  zip.file("word/document.xml", document);
  zip.file("word/_rels/document.xml.rels", documentRels);
  zip.file("word/styles.xml", stylesXml(look));
  zip.file("word/numbering.xml", numberingXml(look));
  zip.file("word/settings.xml", SETTINGS);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE", mimeType: DOCX_MIME });
}

export async function buildResumeDocxBlob(
  resume: Resume,
  options: DocxOptions = {},
): Promise<Blob> {
  const bytes = await buildResumeDocx(resume, options);
  return new Blob([bytes.slice().buffer], { type: DOCX_MIME });
}

/** "Maya-Lindqvist-Resume.pdf" -> "Maya-Lindqvist-Resume.docx". */
export function docxFileName(pdfFileName: string): string {
  return pdfFileName.replace(/\.pdf$/i, "") + ".docx";
}
