import { intlTagOf, type ContentLang } from "@/lib/i18n/languages";
import type { PdfPageSize } from "./page-size";
import { toPdfLine } from "./text";

export function letterBlocks(text: string, lost?: Set<string>): string[][] {
  return splitLetter(text, (line) => toPdfLine(line, lost));
}

export function letterParagraphs(text: string): string[][] {
  return splitLetter(text, (line) => line.trim());
}

function splitLetter(text: string, clean: (line: string) => string): string[][] {
  return text
    .split(/\r?\n[^\S\r\n]*\r?\n\s*/u)
    .map((block) =>
      block
        .split(/\r\n|[\n\r\p{Zl}\p{Zp}]/u)
        .map(clean)
        .filter(Boolean),
    )
    .filter((block) => block.length > 0);
}

// English follows the page size's readers; other languages their own way of writing a date.
export function letterDate(now: number, pageSize: PdfPageSize, lang: ContentLang = "en"): string {
  const locale = lang !== "en" ? intlTagOf(lang) : pageSize === "LETTER" ? "en-US" : "en-GB";
  return new Date(now).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function letterFileName(name: string, company: string): string {
  const part = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/\p{M}+/gu, "")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  return [part(name), part(company), "Cover-Letter"].filter(Boolean).join("-") + ".pdf";
}
