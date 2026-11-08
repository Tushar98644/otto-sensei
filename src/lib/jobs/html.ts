// Server-only. Just enough HTML reading for job posts: plain text with list items and paragraph
// breaks, the page title, meta tags and JSON-LD blocks. The pages come from anyone, so this is one
// linear scan with indexOf, never a regex that can backtrack across a 2 MB page.

import { flightJsonLd, flightPayload } from "./next-flight";

type Token =
  | { type: "text"; text: string }
  | { type: "open"; name: string; attrs: string; selfClosing: boolean }
  | { type: "close"; name: string }
  // Elements whose content is not markup: scripts, styles, the title.
  | { type: "raw"; name: string; attrs: string; content: string };

const RAW_TEXT = new Set([
  "script",
  "style",
  "title",
  "textarea",
  "noscript",
  "template",
  "iframe",
  "xmp",
  "noembed",
  "noframes",
]);
const BLOCKS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "center",
  "details",
  "div",
  "dl",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "summary",
  "table",
  "ul",
]);
const LINES = new Set(["br", "dd", "dt", "tr"]);
const CELLS = new Set(["td", "th"]);
// Site chrome around the post. Skipped on whole pages, not in descriptions from job APIs.
const PAGE_CHROME = new Set([
  "aside",
  "button",
  "dialog",
  "footer",
  "form",
  "header",
  "menu",
  "nav",
  "select",
  "svg",
]);
const FRAGMENT_CHROME = new Set(["button", "form", "select", "svg"]);

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  shy: "",
  zwj: "",
  zwnj: "",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  sbquo: "‚",
  ldquo: "“",
  rdquo: "”",
  bdquo: "„",
  laquo: "«",
  raquo: "»",
  bull: "•",
  middot: "·",
  copy: "©",
  reg: "®",
  trade: "™",
  euro: "€",
  pound: "£",
  yen: "¥",
  cent: "¢",
  deg: "°",
  times: "×",
  divide: "÷",
  plusmn: "±",
  sect: "§",
  para: "¶",
  rarr: "→",
  larr: "←",
  aacute: "á",
  agrave: "à",
  acirc: "â",
  auml: "ä",
  aring: "å",
  ccedil: "ç",
  eacute: "é",
  egrave: "è",
  ecirc: "ê",
  euml: "ë",
  iacute: "í",
  iuml: "ï",
  ntilde: "ñ",
  oacute: "ó",
  ocirc: "ô",
  ouml: "ö",
  oslash: "ø",
  uacute: "ú",
  uuml: "ü",
  szlig: "ß",
  Auml: "Ä",
  Eacute: "É",
  Ouml: "Ö",
  Uuml: "Ü",
};

/** Decodes character references (&amp;, &#8217;, &#x2019;). Unknown names stay as they are. */
export function decodeEntities(text: string): string {
  if (!text.includes("&")) return text;
  return text.replace(
    /&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});/gi,
    (whole, body: string) => {
      if (body[0] !== "#")
        return NAMED_ENTITIES[body] ?? NAMED_ENTITIES[body.toLowerCase()] ?? whole;
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return "\uFFFD";
      return String.fromCodePoint(code);
    },
  );
}

function isNameChar(code: number, first: boolean): boolean {
  const letter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
  if (first) return letter;
  return letter || (code >= 48 && code <= 57) || code === 45 || code === 58 || code === 95;
}

// The ">" that ends a tag. A quote counts only after "=", where an attribute value starts, so an
// apostrophe inside an unquoted value doesn't swallow the rest of the page.
function tagEnd(html: string, from: number): number {
  let quote = "";
  let afterEquals = false;
  for (let i = from; i < html.length; i++) {
    const char = html[i]!;
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === ">") return i;
    if ((char === '"' || char === "'") && afterEquals) {
      quote = char;
      afterEquals = false;
    } else if (char === "=") afterEquals = true;
    else if (char !== " " && char !== "\t" && char !== "\n" && char !== "\r") afterEquals = false;
  }
  return html.length;
}

function* tokenize(html: string): Generator<Token> {
  const lower = html.toLowerCase();
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      yield { type: "text", text: html.slice(i) };
      return;
    }
    if (lt > i) yield { type: "text", text: html.slice(i, lt) };

    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    const next = html[lt + 1];
    if (next === "!" || next === "?") {
      const end = html.indexOf(">", lt);
      i = end === -1 ? html.length : end + 1;
      continue;
    }
    const closing = next === "/";
    const nameStart = lt + (closing ? 2 : 1);
    let nameEnd = nameStart;
    while (nameEnd < html.length && isNameChar(html.charCodeAt(nameEnd), nameEnd === nameStart))
      nameEnd++;
    if (nameEnd === nameStart) {
      // A lone "<" in text, as in "salary < $100k".
      yield { type: "text", text: "<" };
      i = lt + 1;
      continue;
    }
    const name = lower.slice(nameStart, nameEnd);
    const end = tagEnd(html, nameEnd);
    const rawAttrs = html.slice(nameEnd, end);
    const selfClosing = /\/\s*$/.test(rawAttrs);
    const attrs = selfClosing ? rawAttrs.replace(/\/\s*$/, "") : rawAttrs;
    i = end + 1;
    if (closing) {
      yield { type: "close", name };
    } else if (RAW_TEXT.has(name)) {
      const close = lower.indexOf(`</${name}`, i);
      const content = html.slice(i, close === -1 ? html.length : close);
      const gt = close === -1 ? -1 : lower.indexOf(">", close);
      i = gt === -1 ? html.length : gt + 1;
      yield { type: "raw", name, attrs, content };
    } else {
      yield { type: "open", name, attrs, selfClosing };
    }
  }
}

/** One attribute's value from a tag's attribute text, decoded. */
export function attribute(attrs: string, name: string): string | null {
  const match = new RegExp(
    `(?:^|[\\s"'])${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
    "i",
  ).exec(attrs);
  if (!match) return null;
  return decodeEntities(match[1] ?? match[2] ?? match[3] ?? "");
}

const BULLET = /^(?:[-*]\s+)?[•·◦▪●■‣⁃]\s*/;

// Collects text with break marks; finish() turns them into lines and single blank lines.
class TextBuilder {
  private parts: string[] = [];
  // A list item with no text yet: a paragraph opening inside it ("<li><p>") must not push its
  // text off the bullet line. Closing tags still break.
  private emptyItem = false;

  text(text: string) {
    this.parts.push(text);
    if (text.trim()) this.emptyItem = false;
  }

  block(opening = false) {
    this.push("\n\n", opening);
  }

  line(opening = false) {
    this.push("\n", opening);
  }

  private push(mark: string, opening: boolean) {
    if (opening && this.emptyItem) return;
    this.emptyItem = false;
    this.parts.push(mark);
  }

  bullet() {
    this.parts.push("\n- ");
    this.emptyItem = true;
  }

  finish(): string {
    const lines: string[] = [];
    for (const raw of this.parts.join("").split("\n")) {
      const line = raw
        .replace(/[ \t]+/g, " ")
        .trim()
        .replace(BULLET, "- ");
      if (line === "-") continue;
      if (line === "" && (lines.length === 0 || lines.at(-1) === "")) continue;
      lines.push(line);
    }
    while (lines.at(-1) === "") lines.pop();
    // Items written as "<li><p>...</p></li>" would otherwise come out double spaced.
    return lines
      .filter(
        (line, i) =>
          line !== "" || !(lines[i - 1]?.startsWith("- ") && lines[i + 1]?.startsWith("- ")),
      )
      .join("\n");
  }
}

function inlineText(text: string): string {
  return decodeEntities(text).replace(/\s+/g, " ");
}

function addBreaks(builder: TextBuilder, token: Token) {
  if (token.type === "open") {
    if (token.name === "li") builder.bullet();
    else if (BLOCKS.has(token.name)) builder.block(true);
    else if (LINES.has(token.name)) builder.line(true);
    else if (CELLS.has(token.name)) builder.text(" ");
  } else if (token.type === "close") {
    if (token.name === "li" || LINES.has(token.name)) builder.line();
    else if (BLOCKS.has(token.name)) builder.block();
  }
}

// Tracks one skipped element by name until its matching close tag.
class Skipper {
  private name: string | null = null;
  private depth = 0;

  constructor(private readonly names: ReadonlySet<string>) {}

  get active(): boolean {
    return this.name !== null;
  }

  // Returns true when the token belongs to a skipped element.
  take(token: Token): boolean {
    if (token.type === "open") {
      if (this.name === null && this.names.has(token.name) && !token.selfClosing) {
        this.name = token.name;
        this.depth = 1;
        return true;
      }
      if (token.name === this.name) this.depth++;
    } else if (token.type === "close" && token.name === this.name) {
      this.depth--;
      if (this.depth === 0) this.name = null;
      return true;
    }
    return this.name !== null;
  }
}

/** Plain text from an HTML fragment such as a job description: "- " list items, paragraph breaks. */
export function htmlToText(html: string): string {
  const builder = new TextBuilder();
  const skip = new Skipper(FRAGMENT_CHROME);
  for (const token of tokenize(html)) {
    if (skip.take(token)) continue;
    if (token.type === "text") builder.text(inlineText(token.text));
    else addBreaks(builder, token);
  }
  return builder.finish();
}

export type ScannedPage = {
  title: string | null;
  h1: string | null;
  // og:title, og:site_name and the like, first value wins.
  meta: ReadonlyMap<string, string>;
  // Raw contents of each <script type="application/ld+json">.
  jsonLd: readonly string[];
  // Text of <main>, of <article>, and of the whole page, without scripts and site chrome.
  main: string;
  article: string;
  body: string;
  // Signs of a bot check page (Cloudflare, Incapsula, DataDome, PerimeterX).
  challenge: boolean;
};

const MAX_JSON_LD_BLOCKS = 20;
const CHALLENGE_MARKERS =
  /cdn-cgi\/challenge-platform|cf-chl-|cf_chl_|_incapsula_resource|captcha-delivery\.com|px-captcha|perimeterx/i;
const CHALLENGE_TITLES =
  /^(just a moment|attention required|access denied|security check|are you a robot|verify you are human)/i;

export function scanPage(html: string): ScannedPage {
  const body = new TextBuilder();
  const main = new TextBuilder();
  const article = new TextBuilder();
  const skip = new Skipper(PAGE_CHROME);
  const meta = new Map<string, string>();
  const jsonLd: string[] = [];
  const flight: string[] = [];
  let title: string | null = null;
  let h1: string | null = null;
  let h1Text: string[] | null = null;
  let mainDepth = 0;
  let articleDepth = 0;

  for (const token of tokenize(html)) {
    if (token.type === "raw") {
      if (token.name === "title" && title === null)
        title = inlineText(token.content).trim() || null;
      const type = attribute(token.attrs, "type") ?? "";
      if (token.name === "script" && /ld\+json/i.test(type) && jsonLd.length < MAX_JSON_LD_BLOCKS) {
        jsonLd.push(token.content);
      } else if (token.name === "script" && token.content.includes("__next_f")) {
        const payload = flightPayload(token.content);
        if (payload) flight.push(payload);
      }
      continue;
    }
    if (token.type === "open" && token.name === "meta") {
      const key = (
        attribute(token.attrs, "property") ?? attribute(token.attrs, "name")
      )?.toLowerCase();
      const content = attribute(token.attrs, "content")?.trim();
      if (key && content && !meta.has(key)) meta.set(key, content);
      continue;
    }
    // The first heading names the job on most pages, even inside a skipped page header.
    if (token.type === "open" && token.name === "h1" && h1 === null && h1Text === null) h1Text = [];
    else if (token.type === "close" && token.name === "h1" && h1Text !== null) {
      h1 = h1Text.join("").replace(/\s+/g, " ").trim() || null;
      h1Text = null;
    } else if (token.type === "text" && h1Text !== null) h1Text.push(inlineText(token.text));

    if (skip.take(token)) continue;
    if (token.type === "open" && token.name === "main") mainDepth++;
    if (token.type === "open" && token.name === "article") articleDepth++;

    const targets = [
      body,
      ...(mainDepth > 0 ? [main] : []),
      ...(articleDepth > 0 ? [article] : []),
    ];
    for (const target of targets) {
      if (token.type === "text") target.text(inlineText(token.text));
      else addBreaks(target, token);
    }

    if (token.type === "close" && token.name === "main") mainDepth = Math.max(0, mainDepth - 1);
    if (token.type === "close" && token.name === "article")
      articleDepth = Math.max(0, articleDepth - 1);
  }

  if (flight.length > 0) jsonLd.push(...flightJsonLd(flight, MAX_JSON_LD_BLOCKS - jsonLd.length));

  return {
    title,
    h1,
    meta,
    jsonLd,
    main: main.finish(),
    article: article.finish(),
    body: body.finish(),
    challenge: CHALLENGE_MARKERS.test(html) || CHALLENGE_TITLES.test(title ?? ""),
  };
}
