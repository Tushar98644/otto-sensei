import { toPdfLine } from "./text";

export type PdfLink = { text: string; href: string | null };

export type LineCleaner = (value: string) => string;

const pdfLine: LineCleaner = (value) => toPdfLine(value);

const SCHEME = /^[a-z][a-z\d+.-]*:/i;
const BARE_HOST = /^[^\s/@:]+\.[a-z]{2,}(?:[/?#]\S*)?$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
