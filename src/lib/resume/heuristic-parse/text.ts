import { newId, type Bullet } from "../schema";
import { bulletText, findDateRanges, findDates } from "../sections";
import { LIMITS } from "./limits";

export function setApartDate(line: string): string | null {
  if (!isTitleLike(line)) return null;
  const date = findDates(line).at(-1);
  if (!date) return null;
  const before = line.slice(0, date.index).replace(/ +$/, "");
  const after = line.slice(date.index + date.text.length).trim();
  const apart = before === "" || /[\t|,(–—-]$/.test(before);
  return apart && /^[)\]]?$/.test(after) ? date.text : null;
}

const JOINER =
  /(?:[,;:&/–-]|\b(?:and|or|to|of|the|with|for|in|a|an|by|on|at|from|into|across|over|via|using|including|between|within|per|as|than|that|which|while))$/i;

export function continues(previous: string, line: string): boolean {
  return /^\p{Ll}/u.test(line) || JOINER.test(previous.trim());
}

export function toBullets(lines: readonly string[], max: number): Bullet[] {
  const usesMarkers = lines.some((line) => bulletText(line) !== null);
  const texts: string[] = [];
  for (const line of lines) {
    const bullet = bulletText(line);
    const last = texts.at(-1);
    if (bullet !== null) texts.push(bullet);
    else if (last !== undefined && (usesMarkers || continues(last, line)))
      texts[texts.length - 1] = `${last} ${line}`;
    else texts.push(line);
  }
  return finishBullets(texts, max);
}

export function finishBullets(texts: readonly string[], max: number): Bullet[] {
  return texts
    .map((text) => clip(text.replace(/\t+/g, " "), LIMITS.bullet))
    .filter(Boolean)
    .slice(0, max)
    .map((text) => ({ id: newId(), text }));
}

export function paragraph(lines: readonly string[]): string {
  let text = "";
  for (const line of lines) {
    const bullet = bulletText(line);
    if (bullet !== null) text += `${text ? "\n" : ""}${bullet}`;
    else text += text && !text.endsWith("\n") ? ` ${line}` : line;
  }
  return text.replace(/\t+/g, " ").trim();
}

const SEGMENT_SEPARATOR = /\t|\s*\|\s*|\s+[•·▪◦]\s+|\s+[—–]\s+|\s+-\s+/;

export function segmentsOf(line: string): string[] {
  return line
    .split(SEGMENT_SEPARATOR)
    .map((segment) => segment.replace(/^[\s,;:()]+|[\s,;:(]+$/g, ""))
    .filter((segment) => /[\p{L}\p{N}]/u.test(segment));
}

export function stripDates(line: string): string {
  let rest = line;
  for (const range of findDateRanges(line)) rest = rest.split(range.text).join("\t");
  const single = rest === line ? setApartDate(line) : null;
  if (single)
    rest =
      rest.slice(0, rest.lastIndexOf(single)) +
      "\t" +
      rest.slice(rest.lastIndexOf(single) + single.length);
  return rest
    .replace(/[([]\s*\t\s*[)\]]/g, "\t")
    .replace(/\b(?:since|from)\s*\t/gi, "\t")
    .trim();
}

export function isTitleLike(line: string): boolean {
  const text = line.replace(/\t/g, " ").trim();
  return (
    text.length > 0 &&
    text.length <= 120 &&
    text.split(/\s+/).length <= 16 &&
    !/[.!?;]$/.test(text) &&
    !/^\p{Ll}/u.test(text)
  );
}

export function isProse(line: string): boolean {
  return line.split(/\s+/).length >= 8;
}

export function toLines(text: string): string[] {
  return text
    .split(/\r\n?|\n/)
    .map((line) =>
      line
        .replace(/(?!\t)\p{Cc}/gu, "")
        .replace(/[ \u00a0]+/g, " ")
        .replace(/ *\t[\t ]*/g, "\t")
        .trim(),
    )
    .filter(Boolean);
}

export function clip(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const end = /[\ud800-\udbff]/.test(trimmed.charAt(max - 1)) ? max - 1 : max;
  return trimmed.slice(0, end).trimEnd();
}
