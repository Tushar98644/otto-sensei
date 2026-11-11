import JSZip from "jszip";
import mammoth from "mammoth";
import { log } from "@/lib/log";
import {
  countElements,
  countPictures,
  declaredPageCount,
  hasBrokenTags,
  hasMultipleColumns,
  lineBreaksAsText,
  partText,
  stripFallbacks,
  wordPrefix,
} from "./docx-xml";
import { countIconGlyphs, countWords, hasReadableText, toLines } from "./text";
import { ParseError, type Extraction } from "./types";

// A 4 MB zip can inflate to gigabytes, so every part goes through a byte counter.
const MAX_ENTRIES = 1_000;
const MAX_PART_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_XML_BYTES = 5 * 1024 * 1024;
const WORDS_PER_PAGE = 450;

const DOCUMENT_PART = "word/document.xml";
const HEADER_FOOTER_PART = /^word\/(?:header|footer)\d*\.xml$/i;
const XML_PART = /\.(?:xml|rels)$/i;

const unreadable = () =>
  new ParseError("corrupt", "We couldn't read that Word file. Try saving it again, or upload a PDF instead.");

export async function extractDocx(data: Uint8Array): Promise<Extraction> {
  const parts = await readXmlParts(data);
  const documentXml = parts.get(DOCUMENT_PART);
  if (documentXml === undefined) throw unreadable();

  const lines = toLines(await readBodyText(parts));
  const text = lines.join("\n");
  const headerFooterXml = [...parts.keys()]
    .filter((name) => HEADER_FOOTER_PART.test(name))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
    .map((name) => parts.get(name) ?? "");
  const headerFooterText = [...new Set(headerFooterXml.map(partText).filter(Boolean))].join("\n");

  const wordCount = countWords(text);
  const pageCount =
    declaredPageCount(parts.get("docProps/app.xml") ?? "") ?? Math.max(1, Math.ceil(wordCount / WORDS_PER_PAGE));
  const body = stripFallbacks(documentXml);
  const prefix = wordPrefix(documentXml);

  return {
    kind: "docx",
    text,
    lines,
    pageCount,
    wordCount,
    pages: [],
    signals: {
      hasTextLayer: hasReadableText(text, pageCount) || hasReadableText(headerFooterText, 1),
      columnLayout: hasMultipleColumns(documentXml),
      imageCount: [documentXml, ...headerFooterXml].reduce((sum, xml) => sum + countPictures(xml), 0),
      tableCount: countElements(body, `${prefix}tbl`),
      textBoxCount: countElements(body, `${prefix}txbxContent`),
      headerFooterText,
      iconGlyphCount: countIconGlyphs(lines),
    },
  };
}

async function readXmlParts(data: Uint8Array): Promise<Map<string, string>> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw unreadable();
  }
  const files = Object.values(zip.files);
  if (files.length > MAX_ENTRIES) throw unreadable();

  const budget = { left: MAX_TOTAL_XML_BYTES };
  const parts = new Map<string, string>();
  let broken = 0;
  for (const file of files) {
    if (file.dir || !XML_PART.test(file.name)) continue;
    const xml = decodeXml(await inflateBounded(file, budget));
    if (hasBrokenTags(xml)) {
      broken += 1;
      if (file.name === DOCUMENT_PART) {
        log.warn("parse.docx_broken_part", { part: "document", broken });
        throw unreadable();
      }
      continue;
    }
    parts.set(file.name, xml);
  }
  if (broken > 0) log.warn("parse.docx_broken_part", { part: "other", broken });
  return parts;
}

function inflateBounded(file: JSZip.JSZipObject, budget: { left: number }): Promise<Uint8Array> {
  let stream: NodeJS.ReadableStream;
  try {
    // jszip's stream is readable-stream v2: events work, async iteration doesn't.
    stream = file.nodeStream("nodebuffer");
  } catch (error) {
    log.warn("parse.docx_unreadable", {}, error);
    return Promise.reject(unreadable());
  }
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let size = 0;
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      stream.pause();
      stream.removeAllListeners("data");
      if (!(error instanceof ParseError)) log.warn("parse.docx_unreadable", {}, error);
      reject(error instanceof ParseError ? error : unreadable());
    };
    stream.on("data", (chunk: Uint8Array | string) => {
      if (settled) return;
      const bytes = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      size += bytes.length;
      budget.left -= bytes.length;
      if (size > MAX_PART_BYTES || budget.left < 0) {
        log.warn("parse.docx_too_big", { part: file.name.slice(0, 100) });
        fail(unreadable());
        return;
      }
      chunks.push(bytes);
    });
    stream.on("error", fail);
    stream.on("end", () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks, size));
    });
  });
}

function decodeXml(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes);
}

// Only size-checked parts are repackaged, so mammoth can't inflate anything unmeasured.
async function readBodyText(parts: ReadonlyMap<string, string>): Promise<string> {
  try {
    const clean = new JSZip();
    for (const [name, xml] of parts) clean.file(name, name === DOCUMENT_PART ? lineBreaksAsText(xml) : xml);
    const buffer = await clean.generateAsync({ type: "nodebuffer", compression: "STORE" });
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    log.warn("parse.docx_unreadable", {}, error);
    throw unreadable();
  }
}
