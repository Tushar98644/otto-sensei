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

export function letterDate(now: number, pageSize: PdfPageSize): string {
  return new Date(now).toLocaleDateString(pageSize === "LETTER" ? "en-US" : "en-GB", {
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
