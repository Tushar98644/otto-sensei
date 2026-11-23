import { and, desc, inArray, isNull, lt, notExists, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { jobMatch, titleVectors } from "@/db/schema";
import { DAY_MS } from "@/lib/time";
import { OCCUPATION_CODE } from "./types";

// JobBERT-v2 title vectors (scripts/title-vectors.py), cut to TITLE_DIMS by a fixed basis and stored as int8.
export const TITLE_DIMS = 256;
export const TITLE_KEY_CHARS = 120;

const GENDER = /\(\s*(?:[mwfdhx]\s*\/\s*)+[mwfdhx]\s*\)|\(\s*all genders?\s*\)/giu;
const ENTITY = /&(?:amp|nbsp|#39|quot);/g;
const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&nbsp;": " ",
  "&#39;": "'",
  "&quot;": '"',
};

// One key per way a title is written, so a title is embedded once however many jobs carry it.
export function titleVectorKey(title: string): string {
  return title
    .replace(ENTITY, (entity) => ENTITIES[entity] ?? entity)
    .replace(GENDER, " ")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TITLE_KEY_CHARS);
}

export type TitleVector = Int8Array;

export function vectorFrom(bytes: Uint8Array | null | undefined): TitleVector | null {
  if (!bytes || bytes.length !== TITLE_DIMS) return null;
  return new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export function fromBase64(text: string): TitleVector | null {
  return vectorFrom(Uint8Array.from(Buffer.from(text, "base64")));
}

const norms = new WeakMap<TitleVector, number>();
function normOf(vector: TitleVector): number {
  let norm = norms.get(vector);
  if (norm === undefined) {
    let sum = 0;
    for (let i = 0; i < vector.length; i++) sum += vector[i]! * vector[i]!;
    norm = Math.sqrt(sum);
    norms.set(vector, norm);
  }
  return norm;
}

export function cosine(a: TitleVector, b: TitleVector): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  const scale = normOf(a) * normOf(b);
  return scale === 0 ? 0 : dot / scale;
}

// Several weighted titles read as one direction, the latest counting most.
export function blend(
  parts: readonly { vector: TitleVector; weight: number }[],
): TitleVector | null {
  if (parts.length === 0) return null;
  const sum = new Float64Array(TITLE_DIMS);
  for (const { vector, weight } of parts) {
    const scale = weight / (normOf(vector) || 1);
    for (let i = 0; i < TITLE_DIMS; i++) sum[i]! += vector[i]! * scale;
  }
  let peak = 0;
  for (const value of sum) peak = Math.max(peak, Math.abs(value));
  if (peak === 0) return null;
  return Int8Array.from(sum, (value) => Math.round((value / peak) * 127));
}

// A key's vector never changes once stored, so each server keeps those it has read.
const known = new Map<string, TitleVector>();
const KNOWN_MAX = 100_000;

export async function readTitleVectors(
  db: Db,
  keys: readonly string[],
): Promise<Map<string, TitleVector>> {
  const out = new Map<string, TitleVector>();
  const unique = [...new Set(keys)].filter(Boolean);
  const missing = unique.filter((key) => {
    const vector = known.get(key);
    if (vector) out.set(key, vector);
    return !vector;
  });
  if (missing.length === 0) return out;
  const rows = await db
    .select({ key: titleVectors.key, vec: titleVectors.vec })
    .from(titleVectors)
    .where(inArray(titleVectors.key, missing));
  if (known.size + rows.length > KNOWN_MAX) known.clear();
  for (const row of rows) {
    const vector = vectorFrom(row.vec);
    if (!vector) continue;
    out.set(row.key, vector);
    known.set(row.key, vector);
  }
  return out;
}

// As scripts/title-vectors.py writes it: key, base64 int8 vector, nearest occupations and their
// similarities.
export type TitleVectorRow = [string, string, string[], number[]];

export const TITLE_VECTOR_LIMITS = {
  // Keys a person chose or a job carried, kept this long after the last of them.
  keepMs: 30 * DAY_MS,
  writeChunk: 500,
  occupations: 3,
} as const;

const chunked = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );

// Titles to embed, newest first; a person's chosen role is touched again so it isn't pruned.
export async function noteTitles(
  db: Db,
  keys: readonly string[],
  now: number,
  { touch = false }: { touch?: boolean } = {},
): Promise<number> {
  const unique = [...new Set(keys.map((key) => key.slice(0, TITLE_KEY_CHARS)))].filter(Boolean);
  let added = 0;
  for (const part of chunked(unique, TITLE_VECTOR_LIMITS.writeChunk)) {
    const insert = db.insert(titleVectors).values(part.map((key) => ({ key, seenAt: now })));
    const rows = await (
      touch
        ? insert.onConflictDoUpdate({ target: titleVectors.key, set: { seenAt: now } })
        : insert.onConflictDoNothing()
    ).returning({ key: titleVectors.key });
    added += rows.length;
  }
  return added;
}

export async function waitingTitles(db: Db, limit: number): Promise<string[]> {
  const rows = await db
    .select({ key: titleVectors.key })
    .from(titleVectors)
    .where(isNull(titleVectors.vec))
    .orderBy(desc(titleVectors.seenAt), titleVectors.key)
    .limit(limit);
  return rows.map((row) => row.key);
}

const similarity = (value: unknown) => Math.max(-1, Math.min(1, Number(value) || 0));
const pgArray = (values: readonly (string | number)[]) => `{${values.join(",")}}`;

// Only keys already waiting are filled, so a caller can't add titles nobody asked for.
export async function saveTitleVectors(
  db: Db,
  rows: readonly TitleVectorRow[],
  now: number,
): Promise<number> {
  const valid = rows.flatMap(([key, encoded, occs, sims]) => {
    const vector = fromBase64(encoded);
    const codes = occs.filter((code) => OCCUPATION_CODE.test(code));
    if (!vector || codes.length !== occs.length) return [];
    return [
      {
        key,
        vec: Buffer.from(vector.buffer, vector.byteOffset, vector.length),
        occs: codes.slice(0, TITLE_VECTOR_LIMITS.occupations),
        sims: sims.slice(0, TITLE_VECTOR_LIMITS.occupations).map(similarity),
      },
    ];
  });
  let saved = 0;
  for (const part of chunked(valid, TITLE_VECTOR_LIMITS.writeChunk)) {
    const updated = await db
      .update(titleVectors)
      .set({
        vec: sql`v.vec`,
        occs: sql`v.occs`,
        sims: sql`v.sims`,
        embeddedAt: now,
      })
      .from(
        sql`(values ${sql.join(
          part.map(
            (row) =>
              sql`(${row.key}::text, ${row.vec}::bytea, ${pgArray(row.occs)}::text[], ${pgArray(row.sims)}::real[])`,
          ),
          sql`, `,
        )}) as v(key, vec, occs, sims)`,
      )
      .where(sql`${titleVectors.key} = v.key`)
      .returning({ key: titleVectors.key });
    saved += updated.length;
  }
  return saved;
}

export type TitleKind = { occs: string[]; sims: number[] };

// Every stored key, with the nearest occupations of those already embedded.
export async function readTitleKinds(db: Db): Promise<Map<string, TitleKind>> {
  const rows = await db
    .select({
      key: titleVectors.key,
      occs: titleVectors.occs,
      sims: titleVectors.sims,
    })
    .from(titleVectors);
  return new Map(rows.map(({ key, ...kind }) => [key, kind]));
}

// A title no opening carries and nobody chose for a month goes.
export async function pruneTitles(db: Db, now: number): Promise<number> {
  const gone = await db
    .delete(titleVectors)
    .where(
      and(
        lt(titleVectors.seenAt, now - TITLE_VECTOR_LIMITS.keepMs),
        notExists(
          db
            .select({ one: sql`1` })
            .from(jobMatch)
            .where(sql`${jobMatch.tkey} = ${titleVectors.key}`),
        ),
      ),
    )
    .returning({ key: titleVectors.key });
  return gone.length;
}
