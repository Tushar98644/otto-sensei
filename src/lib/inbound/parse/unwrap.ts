import { normalizeText } from "./text";

export type MailInput = {
  from: string;
  subject: string;
  date: string | null;
  text: string;
  headers: Readonly<Record<string, string>>;
};

export type Unwrapped = {
  from: string;
  subject: string;
  date: string | null;
  body: string;
  // "auto": a Gmail filter sent the original as it was; "manual": someone pressed Forward.
  forwarded: "auto" | "manual" | null;
};

const SUBJECT_PREFIX = /^\s*(?:(?:fwd?|fw|tr|wg|rv|enc|re|aw|sv|antw)\s*(?:\[\d+\])?\s*:\s*)+/i;

const MARKERS = [
  /^-{2,}\s*(?:forwarded message|original message|message transféré|weitergeleitete nachricht)\s*-*\s*$/im,
  /^begin forwarded message:?\s*$/im,
  /^-{3,}\s*forwarded by .*$/im,
  /^_{10,}\s*$/m,
];

const HEADER =
  /^\*?\s*(from|de|von|date|sent|envoyé|gesendet|subject|objet|betreff|to|à|an|cc|reply-to)\s*:\*?\s*(.*)$/i;

export function stripSubjectPrefix(subject: string): string {
  return subject.replace(SUBJECT_PREFIX, "").trim();
}

type Block = { from: string; subject: string; date: string | null; body: string };

// The first forwarded block's own headers, then everything under them.
function forwardedBlock(text: string): Block | null {
  let start = -1;
  for (const marker of MARKERS) {
    const match = marker.exec(text);
    if (match && (start === -1 || match.index < start)) start = match.index + match[0].length;
  }
  if (start === -1) return null;
  const lines = text.slice(start).split("\n");
  const found: Record<string, string> = {};
  let index = 0;
  while (index < lines.length && lines[index]!.trim() === "") index++;
  let last: string | null = null;
  for (; index < lines.length; index++) {
    const line = lines[index]!;
    if (line.trim() === "") {
      if (Object.keys(found).length > 0) break;
      continue;
    }
    const header = HEADER.exec(line);
    if (header) {
      const name = header[1]!.toLowerCase();
      const key = ["de", "von"].includes(name)
        ? "from"
        : ["sent", "envoyé", "gesendet"].includes(name)
          ? "date"
          : ["objet", "betreff"].includes(name)
            ? "subject"
            : name;
      found[key] ??= header[2]!.trim();
      last = key;
      continue;
    }
    // A wrapped address list carries on the To or Cc line; anything else starts the body.
    if ((last === "to" || last === "cc") && /^[^\s:]+@\S+/.test(line)) continue;
    break;
  }
  if (!found.from && !found.subject) return null;
  return {
    from: (found.from ?? "").replace(/\*/g, ""),
    subject: (found.subject ?? "").replace(/\*/g, ""),
    date: found.date ?? null,
    body: lines.slice(index).join("\n"),
  };
}

// Quoted replies under the message would bring old dates and old news with them.
export function dropQuoted(body: string): string {
  const cut =
    /^(?:on .{6,160}(?:wrote|a écrit|schrieb):|-{2,}\s*original message\s*-{2,})\s*$/im.exec(body);
  const kept = cut ? body.slice(0, cut.index) : body;
  return kept
    .split("\n")
    .filter((line) => !line.startsWith(">"))
    .join("\n");
}

export function unwrap(mail: MailInput): Unwrapped {
  let from = mail.from;
  let subject = mail.subject;
  let date = mail.date;
  let body = normalizeText(mail.text);
  const auto = Boolean(mail.headers["x-forwarded-for"] || mail.headers["x-forwarded-to"]);
  let manual = false;
  for (let depth = 0; depth < 3; depth++) {
    const block = forwardedBlock(body);
    if (!block) break;
    manual = true;
    from = block.from || from;
    subject = block.subject || subject;
    date = block.date ?? date;
    body = block.body;
  }
  return {
    from,
    subject: stripSubjectPrefix(subject),
    date,
    body: dropQuoted(body).trim(),
    forwarded: manual ? "manual" : auto ? "auto" : null,
  };
}
