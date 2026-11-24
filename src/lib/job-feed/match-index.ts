import { and, eq, inArray, max, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import { companyVisa, jobBoards, jobCountsRow, listings, titles } from "@/db/schema";
import { postFacts } from "@/lib/eligibility/facts";
import {
  familyCode,
  FLAG,
  packMajor,
  packMinor,
  packOccupation,
  REBUILD_FLAGS,
  toMinutes,
  unpackOccupation,
} from "./codes";
import { jobPlaces } from "./job-places";
import { KIND, PAST_KIND_WEIGHT } from "./match";
import { occupationOf, readTitle } from "./occupations";
import type { RoleGate } from "./role-gate";
import { familyFits } from "./roles";
import { ORDER_LIMITS } from "./order";
import {
  CANDIDATE_POOL,
  copyRows,
  DEFAULT_SKILL_WEIGHT,
  FRESH_FOR_MS,
  jobCounts,
  listingRows,
  matchesWords,
  queryWords,
  readSkills,
  rowsOf,
  shownConditions,
  type CandidateRow,
} from "./records";
import { pruneTitles, recodeTitles, titleId, titleVectorKey, today } from "./title-vectors";
import type { TitleCode } from "./title-code";
import { companyKey, type VisaFacts } from "./visa";
import {
  LEVEL_SENIORITIES,
  SENIORITIES,
  type JobFilters,
  type RoleFamily,
  type Seniority,
} from "./types";

const CHUNK = 1_000;

export type StoredCounts = {
  openJobs: number;
  matchable: number;
  checkedAt: number | null;
  builtAt: number;
};

function missingTable(error: unknown): boolean {
  for (let e: unknown = error, depth = 0; e && depth < 4; depth++) {
    const code = (e as { code?: unknown }).code;
    if (code === "42P01") return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

export async function readStoredCounts(db: Db): Promise<StoredCounts | null> {
  try {
    const [row] = await db.select().from(jobCountsRow).limit(1);
    return row
      ? {
          openJobs: row.openJobs,
          matchable: row.matchable,
          checkedAt: row.checkedAt,
          builtAt: row.builtAt,
        }
      : null;
  } catch (error) {
    if (missingTable(error)) return null;
    throw error;
  }
}

type SkillTable = {
  ids: Map<string, number>;
  weights: Map<string, number>;
  maxSid: number;
  visa: Map<string, VisaFacts>;
};

let builtCache: { builtAt: number; table: SkillTable } | null = null;

// What every ranking of one build reads the same: skill ids and weights, and the visa registers.
async function buildTables(db: Db, builtAt: number): Promise<SkillTable> {
  if (builtCache?.builtAt === builtAt) return builtCache.table;
  const [{ ids, weights }, visa] = await Promise.all([readSkills(db), readVisaFacts(db)]);
  const table = { ids, weights, maxSid: Math.max(0, ...ids.values()), visa };
  builtCache = { builtAt, table };
  return table;
}

export async function indexWeights(db: Db, counts: StoredCounts): Promise<Map<string, number>> {
  return (await buildTables(db, counts.builtAt)).weights;
}

async function readVisaFacts(db: Db): Promise<Map<string, VisaFacts>> {
  const visa = new Map<string, VisaFacts>();
  try {
    for (const row of await db.select().from(companyVisa)) {
      visa.set(row.companyKey, { ukSponsor: row.ukName !== null, h1bYear: row.h1bYear });
    }
  } catch (error) {
    if (!missingTable(error)) throw error;
  }
  return visa;
}

// Past this the title's nearest occupation names it, for titles the rules can't read.
export const OCCUPATION_FROM_VECTOR = 0.7;

function nearestOccupation(occ: number | null, sim: number | null): string | null {
  const code = occ ? unpackOccupation(occ) : null;
  return code && sim !== null && sim / 10_000 >= OCCUPATION_FROM_VECTOR && occupationOf(code)
    ? code
    : null;
}

const LEGACY = "\u0001";
const LEGACY_BATCH = 2_000;

// Rows the compact-jobs migration copied keep the old rules text in facts: read it into compact facts
// and their own places, and give a copy whose title SQL couldn't key the right title.
async function finishCopiedRows(db: Db, now: number): Promise<number> {
  let done = 0;
  for (;;) {
    const rows = await db
      .select({
        id: listings.id,
        location: listings.location,
        facts: listings.facts,
        title: listings.title,
        titleText: listings.titleText,
        text: titles.text,
      })
      .from(listings)
      .innerJoin(titles, eq(titles.id, listings.title))
      .where(sql`left(${listings.facts}, 1) = ${LEGACY}`)
      .limit(LEGACY_BATCH);
    if (rows.length === 0) return done;
    const fixed = rows.map((row) => {
      const rules = row.facts.slice(1);
      const title = row.titleText || row.text;
      return {
        id: row.id,
        facts: postFacts({ location: row.location, text: rules }),
        places: jobPlaces(row.location, rules).join(" "),
        title,
        key: titleId(titleVectorKey(title)),
      };
    });
    const missing = [...new Map(fixed.map((row) => [row.key, row.title]))];
    for (let i = 0; i < missing.length; i += 500) {
      await db
        .insert(titles)
        .values(missing.slice(i, i + 500).map(([id, text]) => ({ id, text, seen: today(now) })))
        .onConflictDoNothing({ target: titles.id });
    }
    const canonical = new Map(
      (
        await db
          .select({ id: titles.id, text: titles.text })
          .from(titles)
          .where(inArray(titles.id, [...new Set(fixed.map((row) => row.key))]))
      ).map((row) => [row.id, row.text]),
    );
    const values = fixed.map(
      (row) =>
        sql`(${row.id}::bigint, ${row.key}::bigint, ${canonical.get(row.key) === row.title ? "" : row.title}::text, ${row.facts}::text, ${row.places}::text)`,
    );
    await db
      .update(listings)
      .set({
        title: sql`v.title`,
        titleText: sql`v.title_text`,
        facts: sql`v.facts`,
        places: sql`v.places`,
      })
      .from(sql`(values ${sql.join(values, sql`, `)}) as v(id, title, title_text, facts, places)`)
      .where(sql`${listings.id} = v.id`);
    done += rows.length;
  }
}

export async function rebuildMatchIndex(db: Db, now: number): Promise<number | null> {
  try {
    await db.select({ id: listings.id }).from(listings).limit(1);
  } catch (error) {
    if (missingTable(error)) return null;
    throw error;
  }
  await finishCopiedRows(db, now);
  await recodeTitles(db);
  // One transaction, so this read of every open job may run past the app role's 15 s statement limit.
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local statement_timeout = '120s'`);
    return buildMatchIndex(tx as unknown as Db, now);
  });
}

type Member = {
  id: number;
  board: number;
  grp: number;
  posted: number;
  remote: boolean;
  places: string;
  flags: number;
  occ: number;
  family: number;
  oplaces: string;
};

async function buildMatchIndex(db: Db, now: number): Promise<number> {
  builtCache = null;
  const rows = await db
    .select({
      id: listings.id,
      board: listings.board,
      grp: listings.grp,
      posted: listings.posted,
      flags: listings.flags,
      occ: listings.occ,
      family: listings.family,
      places: listings.places,
      oplaces: listings.oplaces,
      titleText: listings.titleText,
      title: titles.text,
      titleOcc: titles.occ,
      titleSim: titles.sim,
    })
    .from(listings)
    .innerJoin(titles, eq(titles.id, listings.title))
    .where(shownConditions(now));

  // Read again from the title, so a change to the title rules reaches every stored job.
  const kinds = new Map<string, { occ: number; family: number }>();
  const groups = new Map<string, Member[]>();
  const fresh: (Member & { kindOcc: number; kindFamily: number })[] = [];
  for (const row of rows) {
    const title = row.titleText || row.title;
    let kind = kinds.get(title);
    if (!kind) {
      const read = readTitle(title);
      const occ = read.occupation ?? nearestOccupation(row.titleOcc, row.titleSim);
      const family = read.family && familyFits(read.family, occ) ? read.family : null;
      kind = { occ: packOccupation(occ), family: familyCode(family) };
      kinds.set(title, kind);
    }
    const member = {
      id: row.id,
      board: row.board,
      grp: row.grp,
      posted: row.posted,
      remote: (row.flags & FLAG.remote) !== 0,
      places: row.places,
      flags: row.flags,
      occ: row.occ,
      family: row.family,
      oplaces: row.oplaces,
    };
    fresh.push({ ...member, kindOcc: kind.occ, kindFamily: kind.family });
    const key = `${row.board}:${row.grp}`;
    const list = groups.get(key);
    if (list) list.push(member);
    else groups.set(key, [member]);
  }

  // The newest copy leads its opening and carries every copy's places; the rest are found through it.
  const next = new Map<number, { flags: number; oplaces: string }>();
  for (const list of groups.values()) {
    list.sort((a, b) => b.posted - a.posted || b.id - a.id);
    const [lead] = list;
    if (!lead) continue;
    const union = [...new Set(list.flatMap((member) => member.places.split(" ").filter(Boolean)))]
      .sort()
      .join(" ");
    const remote = list.some((member) => member.remote);
    next.set(lead.id, {
      flags: FLAG.lead | (remote ? FLAG.openingRemote : 0) | (list.length > 1 ? FLAG.hasCopies : 0),
      oplaces: union === lead.places ? "" : union,
    });
    for (const copy of list.slice(1)) next.set(copy.id, { flags: FLAG.copy, oplaces: "" });
  }

  type Write = { id: number; flags: number; occ: number; family: number; oplaces: string };
  const writes: Write[] = [];
  for (const row of fresh) {
    const target = next.get(row.id) ?? { flags: 0, oplaces: "" };
    const flags = (row.flags & ~REBUILD_FLAGS) | target.flags;
    if (
      flags !== row.flags ||
      row.kindOcc !== row.occ ||
      row.kindFamily !== row.family ||
      target.oplaces !== row.oplaces
    )
      writes.push({
        id: row.id,
        flags,
        occ: row.kindOcc,
        family: row.kindFamily,
        oplaces: target.oplaces,
      });
  }
  // Only changed rows are written: rewriting all leaves a dead copy of every row until vacuum.
  for (let i = 0; i < writes.length; i += CHUNK) {
    const part = writes.slice(i, i + CHUNK);
    await db
      .update(listings)
      .set({ flags: sql`v.flags`, occ: sql`v.occ`, family: sql`v.family`, oplaces: sql`v.oplaces` })
      .from(
        sql`(values ${sql.join(
          part.map(
            (row) =>
              sql`(${row.id}::bigint, ${row.flags}::smallint, ${row.occ}::integer, ${row.family}::smallint, ${row.oplaces}::text)`,
          ),
          sql`, `,
        )}) as v(id, flags, occ, family, oplaces)`,
      )
      .where(sql`${listings.id} = v.id`);
  }
  // A job past 90 days, or one the read marked a general application, leads and follows nothing.
  await db
    .update(listings)
    .set({ flags: sql`${listings.flags} & ${~REBUILD_FLAGS & 0x7fff}`, oplaces: "" })
    .where(sql`(${listings.flags} & ${REBUILD_FLAGS}) <> 0 and not (${shownConditions(now)})`);

  const matchable = [...next.values()].filter((value) => value.flags & FLAG.lead).length;
  const [read] = await db.select({ at: max(jobBoards.lastFetchedAt) }).from(jobBoards);
  const counts = {
    openJobs: rows.length,
    matchable,
    checkedAt: read?.at ?? null,
    builtAt: now,
  };
  await db
    .insert(jobCountsRow)
    .values({ id: 1, ...counts })
    .onConflictDoUpdate({ target: jobCountsRow.id, set: counts });
  await pruneTitles(db, now);
  return matchable;
}

// A call that changed no job keeps the index and its build time (so cached Matches stay), and only notes its read.
export async function noteBoardsRead(db: Db): Promise<number | null> {
  const [read] = await db.select({ at: max(jobBoards.lastFetchedAt) }).from(jobBoards);
  const [row] = await db
    .update(jobCountsRow)
    .set({ checkedAt: read?.at ?? null })
    .where(eq(jobCountsRow.id, 1))
    .returning({ matchable: jobCountsRow.matchable });
  return row?.matchable ?? null;
}

export async function storedJobCounts(
  db: Db,
  now = Date.now(),
): Promise<{ open: number; matchable: number }> {
  const counts = await readStoredCounts(db);
  return counts ? { open: counts.openJobs, matchable: counts.matchable } : jobCounts(db, now);
}

export type PooledOpening = {
  row: CandidateRow;
  copies: CandidateRow[];
  places: string[];
  visa: VisaFacts | null;
  kind: {
    family: RoleFamily | null;
    occupation: string | null;
    zone: number | null;
    // The meaning code of its title (title-code.ts), once embedded.
    code: TitleCode | null;
  } | null;
};

export type OpeningPool = {
  openings: PooledOpening[];
  groups: number;
};

export type PoolQuery = {
  skills: readonly string[];
  families: readonly RoleFamily[];
  pastFamilies?: readonly RoleFamily[];
  seniority: Seniority | null;
  filters: JobFilters;
  weights: ReadonlyMap<string, number>;
  places: readonly string[] | null;
  limit?: number;
  offset?: number;
  kinds?: {
    occupations: ReadonlyMap<string, number>;
    minors: ReadonlyMap<string, number>;
    majors: ReadonlyMap<string, number>;
    byFamily: boolean;
  };
  // The kinds of work the person's role may be matched with (role-gate.ts); null lets skills decide.
  gate?: RoleGate | null;
  // Internships are shown only to someone looking for one.
  interns?: boolean;
};

const intArray = (values: readonly number[]) => `{${values.join(",")}}`;
const floatArray = (values: readonly number[]) =>
  `{${values.map((value) => value.toFixed(4)).join(",")}}`;
const textArrayLiteral = (values: readonly string[]) =>
  `{${values.map((value) => `"${value.replace(/["\\]/g, "")}"`).join(",")}}`;

type Scored = { id: number; score: number; near: boolean; posted: number; groups: number };

// A copy is kept as a page shows it: open to the same filters as the opening.
function copyFits(row: CandidateRow, filters: JobFilters, now: number): boolean {
  if (filters.remote && !row.remote) return false;
  if (filters.role && row.family !== filters.role) return false;
  if (filters.level && !LEVEL_SENIORITIES[filters.level].includes(row.seniority)) return false;
  if (filters.postedWithin && row.postedAt < now - filters.postedWithin * 24 * 60 * 60 * 1_000)
    return false;
  return [filters.q, filters.place].every((text) => matchesWords(row, queryWords(text)));
}

async function scoredOpenings(
  db: Db,
  query: PoolQuery,
  table: SkillTable,
  now: number,
  page: { limit: number; offset: number } | null,
  built: boolean,
): Promise<Scored[]> {
  const { filters } = query;
  const families = [...query.families];
  const past = query.pastFamilies ?? [];
  const reachFamilies = [...families, ...past].map((family) => familyCode(family));
  const sids = query.skills.flatMap((skill) => table.ids.get(skill) ?? []);
  const kinds = query.kinds ?? {
    occupations: new Map<string, number>(),
    minors: new Map<string, number>(),
    majors: new Map<string, number>(),
    byFamily: families.length + past.length > 0,
  };
  const occCodes = [...kinds.occupations.keys()].map(packOccupation);
  const minorCodes = [...kinds.minors.keys()].map(packMinor);
  const majorCodes = [...kinds.majors.keys()].map(packMajor);
  if (sids.length === 0 && reachFamilies.length === 0 && occCodes.length === 0) return [];
  const dense = Array.from({ length: Math.max(table.maxSid, 1) }, () => 0);
  for (const skill of query.skills) {
    const sid = table.ids.get(skill);
    if (sid !== undefined) dense[sid - 1] = query.weights.get(skill) ?? DEFAULT_SKILL_WEIGHT;
  }
  const level = query.seniority === null ? null : SENIORITIES.indexOf(query.seniority);
  const w = sql`${intArray(dense)}::float8[]`;
  const weightAt = (codes: number[], weights: number[], column: SQL) =>
    sql`coalesce((${floatArray(weights)}::float8[])[array_position(${intArray(codes)}::int[], ${column})], 0)`;
  const occWeight = weightAt(occCodes, [...kinds.occupations.values()], sql`l.occ`);
  const ownFamilies = families.map((family) => familyCode(family));
  const pastFamilies = past.map((family) => familyCode(family));
  const kindSql = sql`case when l.family > 0 and ${kinds.byFamily}::boolean then
      case when l.family = any(${intArray(ownFamilies)}::int[]) then 1::float8
        when l.family = any(${intArray(pastFamilies)}::int[]) then ${PAST_KIND_WEIGHT}::float8
        when ${occWeight} >= 1 then 1::float8 else 0::float8 end
    else greatest(${occWeight},
      ${weightAt(minorCodes, [...kinds.minors.values()], sql`(l.occ / 100000)`)},
      ${weightAt(majorCodes, [...kinds.majors.values()], sql`(l.occ / 10000000)`)}) end`;
  const conditions: SQL[] = [
    // Before the first rebuild has marked openings, every fresh job that isn't filler stands alone.
    built ? sql`(l.flags & ${FLAG.lead}) <> 0` : sql`(l.flags & ${FLAG.evergreen}) = 0`,
    sql`least(l.posted, l.seen) >= ${toMinutes(now - FRESH_FOR_MS)}`,
    sql`(h.found > 0 or l.family = any(${intArray(reachFamilies)}::int[])
      or l.occ = any(${intArray(occCodes)}::int[]) or (l.occ / 100000) = any(${intArray(minorCodes)}::int[]))`,
    sql`(k.kind >= ${KIND.same}::float8 or h.found >= 2)`,
  ];
  const gate = query.gate ?? null;
  if (gate) {
    const gateFamily = familyCode(gate.family);
    conditions.push(
      gate.codes.length > 0
        ? sql`(case when l.occ <> 0 then l.occ = any(${intArray(gate.codes.map(packOccupation))}::int[])
            else l.family = ${gateFamily} end)`
        : sql`l.family = ${gateFamily}`,
    );
  }
  if (query.interns === false) conditions.push(sql`l.level <> 0`);
  if (filters.remote)
    conditions.push(sql`(l.flags & ${built ? FLAG.openingRemote : FLAG.remote}) <> 0`);
  if (filters.role) conditions.push(sql`l.family = ${familyCode(filters.role)}`);
  if (filters.level) {
    const levels = LEVEL_SENIORITIES[filters.level].map((item) => SENIORITIES.indexOf(item));
    conditions.push(sql`l.level = any(${intArray(levels)}::int[])`);
  }
  if (filters.postedWithin)
    conditions.push(
      sql`l.posted >= ${toMinutes(now - filters.postedWithin * 24 * 60 * 60 * 1_000)}`,
    );
  const accepted = query.places;
  const acceptedSql = sql`${textArrayLiteral(accepted ?? [])}::text[]`;
  // A chosen place keeps openings anyone there can take, plus those that name no place.
  if (accepted !== null)
    conditions.push(sql`(p.pl = '' or p.pl = any(${acceptedSql})
      or (strpos(p.pl, ' ') > 0 and string_to_array(p.pl, ' ') && ${acceptedSql}))`);

  const gap = level === null ? sql`0` : sql`(l.level - ${level}::int)`;
  const placeFactor =
    accepted === null
      ? sql`1::float8`
      : sql`case when p.pl <> '' and (p.pl = any(${acceptedSql}) or string_to_array(p.pl, ' ') && ${acceptedSql})
          then ${ORDER_LIMITS.placeMatch}::float8 else 1::float8 end`;
  const window = page ? sql`limit ${page.limit}::int offset ${page.offset}::int` : sql``;
  return rowsOf<Scored>(
    await db.execute(sql`
      with scored as (
        select l.id, l.posted,
          (h.overlap + ${ORDER_LIMITS.familyWeight}::float8 * k.kind)
            * case ${gap} when 0 then 1::float8 when 1 then ${ORDER_LIMITS.oneUp}::float8
                when -1 then ${ORDER_LIMITS.oneDown}::float8 else ${ORDER_LIMITS.farLevel}::float8 end
            * ${placeFactor} as score,
          abs(${gap}) <= 1 as near
        from ${listings} l
        cross join lateral (select case when l.oplaces <> '' then l.oplaces else l.places end as pl) p
        cross join lateral (
          select coalesce(sum((${w})[i]), 0) as overlap, count(*) filter (where (${w})[i] > 0) as found
          from unnest(l.skills) i
        ) h
        cross join lateral (select ${kindSql} as kind) k
        where ${and(...conditions)}
      )
      select id, score, near, posted, (count(*) over ())::int as groups
      from scored
      order by near desc, score desc, posted desc, id
      ${window}
    `),
  ).map((row) => ({ ...row, id: Number(row.id) }));
}

const order = (a: Scored, b: Scored) =>
  Number(b.near) - Number(a.near) || b.score - a.score || b.posted - a.posted || a.id - b.id;

export async function poolOpenings(
  db: Db,
  query: PoolQuery,
  counts: StoredCounts | null,
  now: number,
): Promise<OpeningPool> {
  const table = await buildTables(db, counts?.builtAt ?? -1);
  const limit = query.limit ?? CANDIDATE_POOL;
  const offset = query.offset ?? 0;
  const words = [queryWords(query.filters.q), queryWords(query.filters.place)];
  const searching = words.some((list) => list.length > 0);
  let scored: Scored[];
  let groups: number;
  let rows: CandidateRow[];
  let copies: CandidateRow[];
  if (!searching) {
    scored = await scoredOpenings(db, query, table, now, { limit, offset }, counts !== null);
    groups = scored[0]?.groups ?? 0;
    rows = await listingRows(
      db,
      scored.map((item) => item.id),
    );
    copies = await copyRows(
      db,
      rows.filter((row) => row.flags & FLAG.hasCopies),
    );
  } else {
    // The search box matches an opening when any copy has every word: scored first, then matched here.
    const all = await scoredOpenings(db, query, table, now, null, counts !== null);
    const leads = await listingRows(
      db,
      all.map((item) => item.id),
    );
    const allCopies = await copyRows(
      db,
      leads.filter((row) => row.flags & FLAG.hasCopies),
    );
    const copiesOf = groupCopies(allCopies);
    const hit = new Set(
      leads
        .filter((row) =>
          words.every((list) =>
            [row, ...(copiesOf.get(`${row.board}:${row.grp}`) ?? [])].some((copy) =>
              matchesWords(copy, list),
            ),
          ),
        )
        .map((row) => row.listing),
    );
    const matched = all.filter((item) => hit.has(item.id)).sort(order);
    groups = matched.length;
    scored = matched.slice(offset, offset + limit);
    const kept = new Set(scored.map((item) => item.id));
    rows = leads.filter((row) => kept.has(row.listing));
    copies = allCopies;
  }
  const byId = new Map(rows.map((row) => [row.listing, row]));
  const byGroup = groupCopies(copies);
  const openings: PooledOpening[] = [];
  for (const item of scored) {
    const lead = byId.get(item.id);
    if (!lead) continue;
    // The copies a page could show under these filters; the lead, else the newest of them.
    const list = [lead, ...(byGroup.get(`${lead.board}:${lead.grp}`) ?? [])]
      .filter((copy) => copyFits(copy, query.filters, now))
      .sort((a, b) => b.postedAt - a.postedAt || b.listing - a.listing);
    const row = list.find((copy) => copy.listing === lead.listing) ?? list[0];
    if (!row) continue;
    openings.push({
      row,
      copies: list,
      places: (lead.oplaces || lead.places).split(" ").filter(Boolean),
      visa: visaOf(table.visa.get(companyKey(lead.company))),
      kind: {
        family: lead.family,
        occupation: lead.occupation,
        zone: occupationOf(lead.occupation)?.zone ?? null,
        code: lead.code,
      },
    });
  }
  return { openings, groups };
}

const visaOf = (facts: VisaFacts | undefined) =>
  facts && (facts.ukSponsor || facts.h1bYear !== null) ? facts : null;

function groupCopies(copies: readonly CandidateRow[]): Map<string, CandidateRow[]> {
  const byGroup = new Map<string, CandidateRow[]>();
  for (const copy of copies) {
    const key = `${copy.board}:${copy.grp}`;
    const list = byGroup.get(key);
    if (list) list.push(copy);
    else byGroup.set(key, [copy]);
  }
  return byGroup;
}
