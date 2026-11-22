// Just enough MIME to turn a job email into text: headers, multipart, base64, quoted-printable, charsets.

export type ParsedMail = {
  from: string;
  subject: string;
  date: string | null;
  messageId: string | null;
  headers: Record<string, string>;
  text: string;
};

// The only headers Otto needs: Gmail's forwarding marks and the list headers that flag a newsletter.
export const KEPT_HEADERS = [
  "x-forwarded-for",
  "x-forwarded-to",
  "list-id",
  "list-unsubscribe",
  "auto-submitted",
  "precedence",
] as const;

const MAX_PARTS = 60;
const MAX_DEPTH = 6;

type Headers = Map<string, string>;
type Collected = {
  plain: string | null;
  html: string | null;
  calendar: string | null;
  attached: string[];
};

export function binary(bytes: Uint8Array): string {
  let out = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    out += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return out;
}

function bytesOf(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index++) out[index] = text.charCodeAt(index) & 0xff;
  return out;
}

function decodeBytes(text: string, charset: string): string {
  const bytes = bytesOf(text);
  try {
    return new TextDecoder(charset || "utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function base64(text: string): string {
  const clean = text.replace(/[^A-Za-z0-9+/]/g, "");
  try {
    return atob(clean + "=".repeat((4 - (clean.length % 4)) % 4));
  } catch {
    return "";
  }
}

function quotedPrintable(text: string, header = false): string {
  const spaced = header ? text.replace(/_/g, " ") : text;
  return spaced
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, code: string) => String.fromCharCode(parseInt(code, 16)));
}

// RFC 2047 words such as =?UTF-8?B?...?= in a subject or sender name.
export function decodeHeader(value: string): string {
  const raw = /[\u0080-ÿ]/.test(value) ? decodeBytes(value, "utf-8") : value;
  return raw
    .replace(/(=\?[^?\s]+\?[bBqQ]\?[^?\s]*\?=)\s+(?==\?)/g, "$1")
    .replace(
      /=\?([^?\s]+)\?([bBqQ])\?([^?\s]*)\?=/g,
      (_, charset: string, kind: string, text: string) =>
        decodeBytes(
          kind.toUpperCase() === "B" ? base64(text) : quotedPrintable(text, true),
          charset.split("*")[0]!,
        ),
    )
    .replace(/\s+/g, " ")
    .trim();
}

function split(entity: string): { headers: Headers; body: string } {
  const match = /\r?\n\r?\n/.exec(entity);
  const head = match ? entity.slice(0, match.index) : entity;
  const body = match ? entity.slice(match.index + match[0].length) : "";
  const headers: Headers = new Map();
  for (const line of head.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon < 1) continue;
    const name = line.slice(0, colon).trim().toLowerCase();
    if (!headers.has(name)) headers.set(name, line.slice(colon + 1).trim());
  }
  return { headers, body };
}

function valueAndParams(header: string | undefined): {
  value: string;
  params: Map<string, string>;
} {
  const parts = (header ?? "").match(/(?:[^;"]+|"(?:[^"\\]|\\.)*")+/g) ?? [];
  const params = new Map<string, string>();
  for (const part of parts.slice(1)) {
    const equals = part.indexOf("=");
    if (equals < 0) continue;
    const name = part.slice(0, equals).trim().toLowerCase();
    const value = part
      .slice(equals + 1)
      .trim()
      .replace(/^"(.*)"$/, "$1");
    params.set(name, value);
  }
  return { value: (parts[0] ?? "").trim().toLowerCase(), params };
}

function transfer(body: string, headers: Headers): string {
  const encoding = (headers.get("content-transfer-encoding") ?? "").trim().toLowerCase();
  if (encoding === "base64") return base64(body);
  return encoding === "quoted-printable" ? quotedPrintable(body) : body;
}

function decodeBody(body: string, headers: Headers): string {
  const charset = valueAndParams(headers.get("content-type")).params.get("charset") ?? "utf-8";
  return decodeBytes(transfer(body, headers), charset);
}

function partsOf(body: string, boundary: string): string[] {
  const open = `--${boundary}`;
  const parts: string[] = [];
  let current: string[] | null = null;
  for (const line of body.split("\n")) {
    const bare = line.replace(/\r$/, "").trimEnd();
    if (bare === open || bare === `${open}--`) {
      if (current) parts.push(current.join("\n"));
      current = bare === open ? [] : null;
      continue;
    }
    current?.push(line.replace(/\r$/, ""));
  }
  if (current) parts.push(current.join("\n"));
  return parts;
}

const ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  middot: "·",
  bull: "•",
  copy: "©",
  reg: "®",
  trade: "™",
  zwnj: "",
  zwj: "",
  shy: "",
};

function entities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === "#") {
      const code =
        name[1] === "x" || name[1] === "X"
          ? parseInt(name.slice(2), 16)
          : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

// Links keep their address beside the words, so job links and Gmail's confirm link survive.
export function htmlToText(html: string): string {
  const text = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(head|style|script|title)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(
      /<a\b[^>]*?\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi,
      (_, _quote, href: string, label: string) => {
        const words = entities(label.replace(/<[^>]+>/g, ""))
          .replace(/\s+/g, " ")
          .trim();
        const url = entities(href.trim());
        if (!/^https?:\/\//i.test(url)) return words;
        if (!words) return ` ${url} `;
        // Marked, not bracketed, until the tags are gone: "<https://...>" would read as a tag.
        return words.includes(url) ? words : `${words} \u{e000}${url}\u{e001}`;
      },
    )
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(
      /<\/?(?:p|div|tr|li|ul|ol|h[1-6]|table|blockquote|section|article|header|footer|center)\b[^>]*>/gi,
      "\n",
    )
    .replace(/<\/t[dh]\s*>/gi, " ")
    .replace(/<[^>]+>/g, "");
  return entities(text)
    .replace(/\u{e000}/gu, "<")
    .replace(/\u{e001}/gu, ">")
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function walk(entity: string, depth: number, out: Collected, seen: { parts: number }): void {
  if (depth > MAX_DEPTH || seen.parts++ > MAX_PARTS) return;
  const { headers, body } = split(entity);
  const type = valueAndParams(headers.get("content-type") ?? "text/plain");
  const attachment = /^\s*attachment/i.test(headers.get("content-disposition") ?? "");
  if (type.value.startsWith("multipart/")) {
    const boundary = type.params.get("boundary");
    if (boundary) for (const part of partsOf(body, boundary)) walk(part, depth + 1, out, seen);
    return;
  }
  if (type.value === "message/rfc822") {
    // A message forwarded as an attachment reads like an inline forward.
    const inner = parseInner(transfer(body, headers), depth + 1, seen);
    out.attached.push(
      [
        "---------- Forwarded message ---------",
        `From: ${inner.from}`,
        `Date: ${inner.date ?? ""}`,
        `Subject: ${inner.subject}`,
        "",
        inner.text,
      ].join("\n"),
    );
    return;
  }
  if (type.value === "text/calendar") {
    out.calendar ??= decodeBody(body, headers);
    return;
  }
  if (attachment) return;
  if (type.value === "text/plain") out.plain ??= decodeBody(body, headers);
  else if (type.value === "text/html") out.html ??= decodeBody(body, headers);
}

function calendarLines(calendar: string): string {
  return calendar
    .replace(/\r?\n[ \t]/g, "")
    .split(/\r?\n/)
    .filter((line) => /^(?:SUMMARY|DTSTART|DTEND|LOCATION)[;:]/.test(line))
    .slice(0, 8)
    .join("\n");
}

function parseInner(entity: string, depth: number, seen: { parts: number }): ParsedMail {
  const { headers } = split(entity);
  const out: Collected = { plain: null, html: null, calendar: null, attached: [] };
  walk(entity, depth, out, seen);
  const plain = out.plain?.trim() ?? "";
  // Some senders put only "view this in a browser" in the plain part.
  const main = plain.length >= 40 || !out.html ? plain : htmlToText(out.html);
  const calendar = out.calendar ? calendarLines(out.calendar) : "";
  const text = [main, calendar ? `Calendar event:\n${calendar}` : "", ...out.attached]
    .filter(Boolean)
    .join("\n\n");
  const kept: Record<string, string> = {};
  for (const name of KEPT_HEADERS) {
    const value = headers.get(name);
    if (value) kept[name] = decodeHeader(value).slice(0, 1_000);
  }
  return {
    from: decodeHeader(headers.get("from") ?? ""),
    subject: decodeHeader(headers.get("subject") ?? ""),
    date: headers.get("date")?.trim() || null,
    messageId: headers.get("message-id")?.trim() || null,
    headers: kept,
    text: text.replace(/\r\n?/g, "\n"),
  };
}

export function parseMail(raw: Uint8Array, maxText = 40_000): ParsedMail {
  const mail = parseInner(binary(raw), 0, { parts: 0 });
  return { ...mail, text: mail.text.slice(0, maxText) };
}
