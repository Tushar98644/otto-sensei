import type { Db } from "@/db/client";
import { readTitle } from "./occupations";
import rawVectors from "./occupations/vectors.json";
import {
  blend,
  cosine,
  readTitleVectors,
  TITLE_DIMS,
  titleVectorKey,
  type TitleVector,
} from "./title-vectors";
import type { LookingFor, MatchProfile } from "./types";

// Title and occupation similarity from JobBERT-v2 vectors (docs/matching.md). Nothing here runs the model:
// job titles were embedded at ingest, occupations ship in vectors.json, and a person's role is read
// from the title's stored vector or, failing that, from the occupation its words name.

type VectorFile = { dims: number; codes: string[]; vectors: string };

function rows(encoded: string, count: number): TitleVector[] {
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length !== count * TITLE_DIMS) return [];
  return Array.from(
    { length: count },
    (_, i) => new Int8Array(bytes.buffer, bytes.byteOffset + i * TITLE_DIMS, TITLE_DIMS),
  );
}

let centres: Map<string, TitleVector> | null = null;

export function occupationVectors(): Map<string, TitleVector> {
  if (centres) return centres;
  const file = rawVectors as VectorFile;
  const list = file.dims === TITLE_DIMS ? rows(file.vectors, file.codes.length) : [];
  centres = new Map(list.map((vector, i) => [file.codes[i]!, vector]));
  return centres;
}

export const SEMANTIC = {
  // Title similarity at which a job is the person's own role, and below which it's none of theirs.
  same: 0.65,
  floor: 0.45,
  // A different title this near is named on the card ("Role match: ...").
  explain: 0.55,
  // The person's chosen or latest title leads; earlier titles keep a little say.
  pastWeight: 0.3,
} as const;

export type PersonRole = { vector: TitleVector; title: string };

// What a title means, as a vector: the stored one, else the occupation its words name.
function titleMeaning(
  title: string,
  stored: ReadonlyMap<string, TitleVector>,
  occupation: string | null = null,
): TitleVector | null {
  const own = stored.get(titleVectorKey(title));
  if (own) return own;
  const code = occupation ?? readTitle(title).occupation;
  return code ? (occupationVectors().get(code) ?? null) : null;
}

export async function personRole(
  db: Db,
  lookingFor: Pick<LookingFor, "title" | "occupation">,
  profile: Pick<MatchProfile, "titles">,
): Promise<PersonRole | null> {
  const titles = [...new Set([lookingFor.title, ...profile.titles].filter(Boolean))];
  const stored = await readTitleVectors(db, titles.map(titleVectorKey));
  const parts: { vector: TitleVector; weight: number }[] = [];
  const lead = lookingFor.title
    ? titleMeaning(lookingFor.title, stored, lookingFor.occupation)
    : lookingFor.occupation
      ? (occupationVectors().get(lookingFor.occupation) ?? null)
      : null;
  if (lead) parts.push({ vector: lead, weight: 1 });
  for (const title of profile.titles) {
    if (title === lookingFor.title) continue;
    const vector = titleMeaning(title, stored);
    if (vector) parts.push({ vector, weight: parts.length === 0 ? 1 : SEMANTIC.pastWeight });
  }
  // With no role chosen and no title read, there's nothing to compare: the rules decide alone.
  if (!lookingFor.title && !lookingFor.occupation && parts.length === 0) return null;
  const vector = blend(parts);
  return vector ? { vector, title: lookingFor.title || profile.titles[0] || "" } : null;
}

// 0 below the floor, 1 at "same role", straight in between.
export function sameness(similarity: number): number {
  return Math.max(0, Math.min(1, (similarity - SEMANTIC.floor) / (SEMANTIC.same - SEMANTIC.floor)));
}

export async function titleSimilarities(
  db: Db,
  role: PersonRole,
  keys: readonly string[],
): Promise<Map<string, number>> {
  const stored = await readTitleVectors(db, keys);
  return new Map([...stored].map(([key, vector]) => [key, cosine(role.vector, vector)]));
}
