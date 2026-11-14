// Streams can't sit inside object streams, so every image dictionary is readable in the raw bytes.
const TOKENS = /(?<!\d)(\d{1,10})\s+\d{1,5}\s+obj\b|>>\s*stream\b|\bendobj\b/g;
const IMAGE = /\/Subtype\s*\/Image\b/;
// Soft masks, stencil masks and thumbnails belong to another picture.
const PART_OF = /\/(?:SMask|Mask|Thumb)\s+(\d{1,10})\s+\d{1,5}\s+R\b/g;
// pdf.js draws a 1x1 stencil mask as a plain fill, not a picture.
const STENCIL = /\/ImageMask\s+true\b/;
const ONE_WIDE = /\/Width\s+1\b/;
const ONE_HIGH = /\/Height\s+1\b/;
const REF = /(?<!\d)(\d{1,10})\s+\d{1,5}\s+R\b/g;
const TYPE3_FONT = /\/Subtype\s*\/Type3\b/;
const PAGE = /\/Type\s*\/Page\b/;
// Font, resources, XObject dictionary, image: deep enough for inline or separate dictionaries.
const GLYPH_DEPTH = 3;

type PdfObject = { picture: boolean; refs: number[]; type3: boolean; page: boolean };

function isPicture(dict: string): boolean {
  if (!IMAGE.test(dict)) return false;
  return !(STENCIL.test(dict) && ONE_WIDE.test(dict) && ONE_HIGH.test(dict));
}

function readObject(dict: string, stream: boolean): PdfObject {
  if (stream) return { picture: isPicture(dict), refs: [], type3: false, page: false };
  return {
    picture: false,
    refs: Array.from(dict.matchAll(REF), (ref) => Number(ref[1])),
    type3: TYPE3_FONT.test(dict),
    page: PAGE.test(dict),
  };
}

// A Type3 font's glyph pictures (such as printed emoji) are text, not images on the page.
function glyphPictures(objects: ReadonlyMap<number, PdfObject>): Set<number> {
  const fromPages = new Set<number>();
  for (const object of objects.values()) {
    if (object.page) for (const ref of object.refs) fromPages.add(ref);
  }
  const onPage = new Set(fromPages);
  for (const ref of fromPages) {
    const child = objects.get(ref);
    if (child && !child.type3) for (const inner of child.refs) onPage.add(inner);
  }
  const reached = new Set<number>();
  let level = [...objects].filter(([, object]) => object.type3).map(([id]) => id);
  for (let depth = 0; depth < GLYPH_DEPTH && level.length > 0; depth++) {
    const next: number[] = [];
    for (const id of level) {
      for (const ref of objects.get(id)?.refs ?? []) {
        if (reached.has(ref) || onPage.has(ref)) continue;
        reached.add(ref);
        next.push(ref);
      }
    }
    level = next;
  }
  return reached;
}

// Counts distinct images without decoding any. An object saved again later replaces its old copy.
export function countPdfImages(data: Uint8Array): number {
  const text = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("latin1");
  const objects = new Map<number, PdfObject>();
  const parts = new Set<number>();
  const tokens = new RegExp(TOKENS);
  let open: { id: number; from: number } | null = null;
  for (let token = tokens.exec(text); token; token = tokens.exec(text)) {
    const [found, id] = token;
    if (id !== undefined) {
      open = { id: Number(id), from: tokens.lastIndex };
      continue;
    }
    const stream = found.startsWith(">>");
    if (open) {
      const dict = text.slice(open.from, stream ? token.index + 2 : token.index);
      for (const ref of dict.matchAll(PART_OF)) parts.add(Number(ref[1]));
      objects.set(open.id, readObject(dict, stream));
      open = null;
    }
    if (stream) {
      const end = text.indexOf("endstream", tokens.lastIndex);
      if (end === -1) break;
      tokens.lastIndex = end;
    }
  }
  const glyphs = glyphPictures(objects);
  let count = 0;
  for (const [id, object] of objects) {
    if (object.picture && !parts.has(id) && !glyphs.has(id)) count++;
  }
  return count;
}
