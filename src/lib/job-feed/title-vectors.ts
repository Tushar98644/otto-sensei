import { and, desc, gt, inArray, isNotNull, isNull, lt, notExists, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { listings, titles } from "@/db/schema";
import { DAY_MS } from "@/lib/time";
import { hash53, packOccupation } from "./codes";
import { encodeTitleVector, TITLE_DIMS, titleCodeFrom, type TitleCode } from "./title-code";
import { OCCUPATION_CODE } from "./types";

// JobBERT-v2 title vectors (scripts/title-vectors.py), stored in titles as 64-byte codes (title-code.ts).
export { TITLE_DIMS };
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

// titles.id: the migration that made the table hashed keys the same way in SQL.
export const titleId = (key: string) => hash53(key);

export type TitleVector = TitleCode;

export function fromBase64(text: string): TitleVector | null {
  const bytes = Uint8Array.from(Buffer.from(text, "base64"));
  return bytes.length === TITLE_DIMS
    ? encodeTitleVector(new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength))
    : null;
}

export const today = (now: number) => Math.floor(now / DAY_MS);

// A key's code never changes once stored, so each server keeps those it has read.
const known = new Map<string, TitleVector>();
const KNOWN_MAX = 100_000;

export async function readTitleVectors(
  db: Db,
  keys: readonly string[],
): Promise<Map<string, TitleVector>> {
  const out = new Map<string, TitleVector>();
  const missing = [...new Set(keys)].filter(Boolean).filter((key) => {
    const vector = known.get(key);
    if (vector) out.set(key, vector);
    return !vector;
  });
  if (missing.length === 0) return out;
  const byId = new Map(missing.map((key) => [titleId(key), key]));
  const rows = await db
    .select({ id: titles.id, code: titles.code })
    .from(titles)
    .where(and(inArray(titles.id, [...byId.keys()]), isNotNull(titles.code)));
  if (known.size + rows.length > KNOWN_MAX) known.clear();
  for (const row of rows) {
    const key = byId.get(row.id);
    const vector = titleCodeFrom(row.code);
    if (!key || !vector) continue;
    out.set(key, vector);
    known.set(key, vector);
  }
  return out;
}

// As scripts/title-vectors.py writes it: key, base64 int8 vector, nearest occupations and their
// similarities.
export type TitleVectorRow = [string, string, string[], number[]];

export const TITLE_VECTOR_LIMITS = {
  // Keys a person chose, kept this long after they last chose them; a job's are kept while it's open.
  keepMs: 30 * DAY_MS,
  writeChunk: 500,
  occupations: 3,
} as const;

const chunked = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );

// A person's chosen role, waiting to be embedded; choosing it again keeps it from being pruned.
export async function noteTitles(
  db: Db,
  keys: readonly string[],
  now: number,
  { touch = false }: { touch?: boolean } = {},
): Promise<number> {
  const unique = [...new Set(keys.map((key) => key.slice(0, TITLE_KEY_CHARS)))].filter(Boolean);
  let added = 0;
  for (const part of chunked(unique, TITLE_VECTOR_LIMITS.writeChunk)) {
    const insert = db
      .insert(titles)
      .values(part.map((key) => ({ id: titleId(key), text: key, seen: today(now) })));
    const rows = await (
      touch
        ? insert.onConflictDoUpdate({ target: titles.id, set: { seen: today(now) } })
        : insert.onConflictDoNothing()
    ).returning({ id: titles.id });
    added += rows.length;
  }
  return added;
}

// The keys still waiting for a code, newest first.
export async function waitingTitles(db: Db, limit: number): Promise<string[]> {
  const rows = await db
    .select({ text: titles.text })
    .from(titles)
    .where(isNull(titles.code))
    .orderBy(desc(titles.seen), titles.id)
    .limit(limit);
  return [...new Set(rows.map((row) => titleVectorKey(row.text)))].filter(Boolean);
}

const similarity = (value: unknown) => Math.max(-1, Math.min(1, Number(value) || 0));

// Only keys already waiting are filled, so a caller can't add titles nobody asked for.
export async function saveTitleVectors(db: Db, rows: readonly TitleVectorRow[]): Promise<number> {
  const valid = rows.flatMap(([key, encoded, occs, sims]) => {
    const code = fromBase64(encoded);
    if (!code || !occs.every((occ) => OCCUPATION_CODE.test(occ))) return [];
    const occ = packOccupation(occs[0]);
    return [
      {
        id: titleId(key),
        code: Buffer.from(code.buffer, code.byteOffset, code.length),
        occ: occ || null,
        sim: occ ? Math.round(similarity(sims[0]) * 10_000) : null,
      },
    ];
  });
  let saved = 0;
  for (const part of chunked(valid, TITLE_VECTOR_LIMITS.writeChunk)) {
    const updated = await db
      .update(titles)
      .set({ code: sql`v.code`, occ: sql`v.occ`, sim: sql`v.sim` })
      .from(
        sql`(values ${sql.join(
          part.map(
            (row) =>
              sql`(${row.id}::bigint, ${row.code}::bytea, ${row.occ}::integer, ${row.sim}::smallint)`,
          ),
          sql`, `,
        )}) as v(id, code, occ, sim)`,
      )
      .where(sql`${titles.id} = v.id`)
      .returning({ id: titles.id });
    saved += updated.length;
  }
  return saved;
}

// Vectors kept from title_vectors (256 bytes) become 64-byte codes, a batch a transaction, until `until`.
export async function recodeTitles(db: Db, until: number): Promise<number> {
  let after = -1;
  let recoded = 0;
  while (Date.now() < until) {
    const done = await db.transaction(async (tx) => {
      await tx.execute(sql`set local statement_timeout = '120s'`);
      const rows = await tx
        .select({ id: titles.id, code: titles.code })
        .from(titles)
        .where(and(gt(titles.id, after), sql`octet_length(${titles.code}) = ${TITLE_DIMS}`))
        .orderBy(titles.id)
        .limit(TITLE_VECTOR_LIMITS.writeChunk);
      const last = rows.at(-1);
      if (!last) return 0;
      after = last.id;
      const values = rows.flatMap((row) => {
        const code = titleCodeFrom(row.code);
        return code ? [sql`(${row.id}::bigint, ${Buffer.from(code)}::bytea)`] : [];
      });
      if (values.length > 0) {
        await tx
          .update(titles)
          .set({ code: sql`v.code` })
          .from(sql`(values ${sql.join(values, sql`, `)}) as v(id, code)`)
          .where(sql`${titles.id} = v.id`);
      }
      return rows.length;
    });
    if (done === 0) break;
    recoded += done;
  }
  return recoded;
}

// A title no listing carries and nobody chose for a month goes.
export async function pruneTitles(db: Db, now: number): Promise<number> {
  const gone = await db
    .delete(titles)
    .where(
      and(
        lt(titles.seen, today(now - TITLE_VECTOR_LIMITS.keepMs)),
        notExists(
          db
            .select({ one: sql`1` })
            .from(listings)
            .where(sql`${listings.title} = ${titles.id}`),
        ),
      ),
    )
    .returning({ id: titles.id });
  return gone.length;
}
