// Parts are size-capped and we only count elements and pull text, so regexes beat a DOM. Tag
// patterns use [^<>], never [^>]: a part full of unclosed tags would otherwise make each match scan
// far ahead and back, blocking the server for seconds per MiB.

const WORDML_NAMESPACE =
  /xmlns(?::([\w.-]+))?=["'](?:http:\/\/schemas\.openxmlformats\.org\/wordprocessingml\/2006\/main|http:\/\/purl\.oclc\.org\/ooxml\/wordprocessingml\/main)["']/;

// Read whole, since their text may hold "<" and ">".
const OPAQUE_SECTIONS: ReadonlyArray<readonly [open: string, close: string]> = [
  ["<!--", "-->"],
  ["<![CDATA[", "]]>"],
  ["<?", "?>"],
];
// A name, an end tag or a declaration such as <!DOCTYPE>.
const TAG_START = /[\p{L}_:/!]/u;

// Linear. mammoth recovers from each broken tag by scanning ahead, so a part full of them would
// hold the server for minutes (quadratic).
export function hasBrokenTags(xml: string): boolean {
  let cursor = 0;
  for (;;) {
    const open = xml.indexOf("<", cursor);
    if (open === -1) return false;
    const opaque = OPAQUE_SECTIONS.find(([start]) => xml.startsWith(start, open));
    if (opaque) {
      const [start, end] = opaque;
      const close = xml.indexOf(end, open + start.length);
      if (close === -1) return true;
      cursor = close + end.length;
      continue;
    }
    if (!TAG_START.test(xml.charAt(open + 1))) return true;
    const close = xml.indexOf(">", open + 1);
    const next = xml.indexOf("<", open + 1);
    if (close === -1 || (next !== -1 && next < close)) return true;
    cursor = close + 1;
  }
}

// The prefix bound to the WordprocessingML namespace: "w:" in practice, "" if declared as default.
export function wordPrefix(xml: string): string {
  const match = WORDML_NAMESPACE.exec(xml);
  if (!match) return "w:";
  return match[1] ? `${match[1]}:` : "";
}

// Word stores every text box and floating picture twice (mc:Choice and a VML mc:Fallback); drop the
// fallback. A single indexOf pass, so unclosed fallbacks can't make this quadratic.
export function stripFallbacks(xml: string): string {
  const open = "<mc:Fallback";
  const close = "</mc:Fallback>";
  let result = "";
  let cursor = 0;
  for (let start = xml.indexOf(open); start !== -1; start = xml.indexOf(open, cursor)) {
    result += xml.slice(cursor, start);
    const tagEnd = xml.indexOf(">", start);
    if (tagEnd === -1) return result;
    if (xml[tagEnd - 1] === "/") {
      cursor = tagEnd + 1;
      continue;
    }
    const end = xml.indexOf(close, tagEnd);
    if (end === -1) return result;
    cursor = end + close.length;
  }
  return result + xml.slice(cursor);
}

export function countElements(xml: string, qualifiedName: string): number {
  return xml.match(new RegExp(`<${escapeRegex(qualifiedName)}[\\s/>]`, "g"))?.length ?? 0;
}

// One a:blip per DrawingML picture (an SVG's PNG fallback counted once), plus legacy v:imagedata.
export function countPictures(xml: string): number {
  const body = stripFallbacks(xml);
  return countElements(body, "a:blip") + countElements(body, "v:imagedata");
}

export function hasMultipleColumns(xml: string): boolean {
  const prefix = escapeRegex(wordPrefix(xml));
  const cols = new RegExp(`<${prefix}cols\\b[^<>]{0,500}?\\s${prefix}num=["'](\\d+)["']`, "g");
  for (const match of xml.matchAll(cols)) {
    if (Number(match[1]) >= 2) return true;
  }
  return false;
}

// Field codes and tracked deletions are dropped because nobody sees them.
export function partText(xml: string): string {
  const prefix = escapeRegex(wordPrefix(xml));
  // Field codes and deleted text are plain text inside their element, so [^<]* is exact and linear.
  const hidden = new RegExp(`<${prefix}(instrText|delText)\\b[^<>]{0,500}>[^<]*<\\/${prefix}\\1>`, "g");
  const breaks = new RegExp(`<${prefix}(?:tab|br|cr)\\b[^<>]{0,500}>|<\\/${prefix}(?:p|tc)>`, "g");
  const text = stripFallbacks(xml).replace(hidden, "").replace(breaks, " ").replace(/<[^<>]*>/g, "");
  return decodeXmlEntities(text).replace(/\s+/g, " ").trim();
}

// mammoth's raw text drops soft line breaks (Shift+Enter), gluing "Engineer" and "Acme" into
// "EngineerAcme". Turning each break into a newline text run keeps the words apart.
export function lineBreaksAsText(xml: string): string {
  const prefix = wordPrefix(xml);
  const pattern = escapeRegex(prefix);
  const breaks = new RegExp(
    `<${pattern}(?:br|cr)\\b[^<>]{0,500}\\/>|<${pattern}(?:br|cr)\\b[^<>]{0,500}>\\s*<\\/${pattern}(?:br|cr)>`,
    "g",
  );
  return xml.replace(breaks, `<${prefix}t xml:space="preserve">&#10;</${prefix}t>`);
}

// <Pages> from docProps/app.xml, which Word and LibreOffice update on every save.
export function declaredPageCount(appXml: string): number | null {
  const match = /<(?:[\w.-]+:)?Pages>\s*(\d+)\s*<\/(?:[\w.-]+:)?Pages>/.exec(appXml);
  const pages = match ? Number(match[1]) : 0;
  return pages > 0 ? pages : null;
}

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decodeXmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, body: string) => {
    if (body.startsWith("#")) {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
