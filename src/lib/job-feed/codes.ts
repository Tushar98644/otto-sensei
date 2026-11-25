import { createHash } from "node:crypto";
import { CONTENT_LANGS, type ContentLang } from "@/lib/i18n/languages";
import {
  EMPLOYMENT_TYPES,
  OCCUPATION_CODE,
  ROLE_FAMILIES,
  SENIORITIES,
  type EmploymentType,
  type RoleFamily,
  type Seniority,
} from "./types";

// The small numbers a listing stores instead of text (docs/database.md, listings). The migration that
// filled listings computes the same hashes in SQL with sha256, so both must stay as they are.

const top64 = (text: string) =>
  createHash("sha256").update(text, "utf8").digest().readBigUInt64BE(0);

// 53 bits, so the value is a safe JS number.
export function hash53(text: string): number {
  return Number(top64(text) >> 11n);
}

export function hash32(text: string): number {
  return createHash("sha256").update(text, "utf8").digest().readInt32BE(0);
}

const BOARD_SHIFT = 2 ** 38;

// The board in the top bits, so one board's rows are one primary key range.
export function listingId(board: number, ext: string): number {
  return board * BOARD_SHIFT + Number(top64(`${board}:${ext}`) >> 26n);
}

export function boardRange(board: number): [number, number] {
  return [board * BOARD_SHIFT, (board + 1) * BOARD_SHIFT - 1];
}

// A listing's link: its own when it keeps one, else its board's pattern with its id.
export const jobUrlOf = (template: string, ext: string, url: string) =>
  url || template.replaceAll("{id}", ext);

// The public id keeps the UUID shape every route, uuid column and resume already carries.
const PUBLIC_ID = /^00000000-0000-4([0-9a-f]{3})-8([0-9a-f]{3})-([0-9a-f]{12})$/i;

export function publicJobId(id: number): string {
  const hex = id.toString(16).padStart(18, "0");
  return `00000000-0000-4${hex.slice(0, 3)}-8${hex.slice(3, 6)}-${hex.slice(6)}`;
}

export function listingIdOf(publicId: string): number | null {
  const match = PUBLIC_ID.exec(publicId);
  if (!match) return null;
  const id = Number.parseInt(`${match[1]}${match[2]}${match[3]}`, 16);
  return Number.isSafeInteger(id) ? id : null;
}

// "15-1252.00" as 150,125,200 (an X after the dash is 10), so the minor group is code / 1e5, the major / 1e7.
export function packOccupation(code: string | null | undefined): number {
  if (!code || !OCCUPATION_CODE.test(code)) return 0;
  const first = code[3] === "X" ? 10 : Number(code[3]);
  return (
    Number(code.slice(0, 2)) * 10_000_000 +
    first * 100_000 +
    Number(code.slice(4, 7)) * 100 +
    Number(code.slice(8, 10))
  );
}

export function unpackOccupation(value: number): string | null {
  if (!value) return null;
  const major = Math.floor(value / 10_000_000);
  const first = Math.floor(value / 100_000) % 100;
  const rest = Math.floor(value / 100) % 1_000;
  const tail = value % 100;
  const digit = first === 10 ? "X" : String(first);
  return `${String(major).padStart(2, "0")}-${digit}${String(rest).padStart(3, "0")}.${String(tail).padStart(2, "0")}`;
}

// "15-1" as 1501 and "15" as 15, the units of packOccupation / 1e5 and / 1e7.
export function packMinor(minor: string): number {
  const first = minor[3] === "X" ? 10 : Number(minor[3]);
  return Number(minor.slice(0, 2)) * 100 + first;
}

export const packMajor = (major: string) => Number(major);

export const familyCode = (family: RoleFamily | null) =>
  family ? ROLE_FAMILIES.indexOf(family) + 1 : 0;
export const familyOf = (code: number): RoleFamily | null => ROLE_FAMILIES[code - 1] ?? null;

export const levelCode = (seniority: Seniority) => SENIORITIES.indexOf(seniority);
export const seniorityOf = (code: number): Seniority => SENIORITIES[code] ?? "mid";

// Listing flags: what the read set (low bits), what the rebuild set, the job type in bits 6-8 and
// the post's language in bits 9-11 (0: not known, read as English).
export const FLAG = {
  remote: 1,
  evergreen: 2,
  lead: 4,
  openingRemote: 8,
  copy: 16,
  hasCopies: 32,
} as const;
export const REBUILD_FLAGS = FLAG.lead | FLAG.openingRemote | FLAG.copy | FLAG.hasCopies;
const TYPE_SHIFT = 6;
export const LANG_SHIFT = 9;

export function readFlags(input: {
  remote: boolean;
  evergreen: boolean;
  employmentType: EmploymentType | null;
  lang?: ContentLang | null;
}): number {
  const type = input.employmentType ? EMPLOYMENT_TYPES.indexOf(input.employmentType) + 1 : 0;
  return (
    (input.remote ? FLAG.remote : 0) |
    (input.evergreen ? FLAG.evergreen : 0) |
    (type << TYPE_SHIFT) |
    (langCode(input.lang ?? null) << LANG_SHIFT)
  );
}

export const employmentTypeOf = (flags: number): EmploymentType | null =>
  EMPLOYMENT_TYPES[((flags >> TYPE_SHIFT) & 7) - 1] ?? null;

export const langCode = (lang: ContentLang | null) => (lang ? CONTENT_LANGS.indexOf(lang) + 1 : 0);
export const langOfFlags = (flags: number): ContentLang | null =>
  CONTENT_LANGS[((flags >> LANG_SHIFT) & 7) - 1] ?? null;

// The codes a language choice keeps; English keeps posts of no known language too.
export function langCodes(langs: readonly ContentLang[]): number[] {
  const codes = langs.map((lang) => langCode(lang));
  return langs.includes("en") ? [0, ...codes] : codes;
}

// Times in whole minutes since 1970: 4 bytes, and good until the year 6053.
export const toMinutes = (ms: number) => Math.floor(ms / 60_000);
export const fromMinutes = (minutes: number) => minutes * 60_000;
