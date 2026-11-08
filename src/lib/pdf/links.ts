import { toPdfLine } from "./text";

// Text shown on the page, plus a click target when the address is safe to link.
export type PdfLink = { text: string; href: string | null };

// Cleans one line for the target file: toPdfLine for a PDF, toUnicodeLine for Word.
export type LineCleaner = (value: string) => string;

const pdfLine: LineCleaner = (value) => toPdfLine(value);

const SCHEME = /^[a-z][a-z\d+.-]*:/i;
// "janedoe.dev", "github.com/janedoe": a bare host with a dot and a real top-level domain.
const BARE_HOST = /^[^\s/@:]+\.[a-z]{2,}(?:[/?#]\S*)?$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Only web links become clickable. Anything else (javascript:, file:) stays plain text.
function webHref(value: string): string | null {
  const candidate = SCHEME.test(value) ? value : BARE_HOST.test(value) ? `https://${value}` : null;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

// "https://www.linkedin.com/in/jane/" reads as "linkedin.com/in/jane": shorter, and it's what a
// recruiter would type. The click target keeps the full address.
function shortUrl(value: string): string {
  return value
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
}

export function webLink(raw: string, clean: LineCleaner = pdfLine): PdfLink | null {
  const value = raw.trim();
  const text = clean(shortUrl(value));
  if (!text) return null;
  return { text, href: webHref(value) };
}

export function emailLink(raw: string, clean: LineCleaner = pdfLine): PdfLink | null {
  const text = clean(raw);
  if (!text) return null;
  return { text, href: EMAIL.test(text) ? `mailto:${text}` : null };
}

export function plainText(raw: string, clean: LineCleaner = pdfLine): PdfLink | null {
  const text = clean(raw);
  return text ? { text, href: null } : null;
}
