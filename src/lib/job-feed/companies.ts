import { eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { companies, jobBoards } from "@/db/schema";
import { cityById } from "@/lib/geo/cities";
import { DAY_MS } from "@/lib/time";
import { fromMinutes, toMinutes } from "./codes";
import { careersUrl } from "./careers";
import type { CompanySnapshot, JobSourceId } from "./types";
import { companyKey } from "./visa";

// A company counts as hiring now when it posted a job this recently.
export const HIRING_DAYS = 14;
const HYBRID = /\bhybrid\b/i;
const CHUNK = 500;

export type CompanyMember = {
  board: number;
  company: string;
  city: number;
  location: string;
  remote: boolean;
  lead: boolean;
  // Minutes since 1970.
  newest: number;
};

export type CompanyRow = typeof companies.$inferInsert & {
  city: number;
  remote: number;
  hybrid: number;
};

type Tally = {
  slots: Map<string, { board: number; company: string }>;
  names: Map<string, number>;
  cities: Map<number, number>;
  roles: number;
  remote: number;
  hybrid: number;
  newest: number;
};

const slotOf = (row: { board: number; company: string }) => `${row.board}\u0000${row.company}`;

function most<T>(counts: ReadonlyMap<T, number>, fallback: T): T {
  let best = fallback;
  let top = 0;
  for (const [value, n] of counts) {
    if (n > top) {
      best = value;
      top = n;
    }
  }
  return best;
}

// One row per board and stored company name, each carrying its whole company's facts.
export function buildCompanies(
  members: readonly CompanyMember[],
  boardNames: ReadonlyMap<number, string>,
): CompanyRow[] {
  const tallies = new Map<string, Tally>();
  for (const member of members) {
    const name = (member.company || boardNames.get(member.board) || "").trim();
    const key = companyKey(name);
    if (!key) continue;
    let tally = tallies.get(key);
    if (!tally) {
      tally = {
        slots: new Map(),
        names: new Map(),
        cities: new Map(),
        roles: 0,
        remote: 0,
        hybrid: 0,
        newest: 0,
      };
      tallies.set(key, tally);
    }
    tally.slots.set(slotOf(member), { board: member.board, company: member.company });
    tally.names.set(name, (tally.names.get(name) ?? 0) + 1);
    if (member.city > 0) tally.cities.set(member.city, (tally.cities.get(member.city) ?? 0) + 1);
    tally.newest = Math.max(tally.newest, member.newest);
    if (!member.lead) continue;
    tally.roles += 1;
    if (member.remote) tally.remote += 1;
    else if (HYBRID.test(member.location)) tally.hybrid += 1;
  }
  const rows: CompanyRow[] = [];
  for (const tally of tallies.values()) {
    if (tally.roles === 0) continue;
    const name = most(tally.names, "");
    const city = most(tally.cities, 0);
    for (const slot of tally.slots.values()) {
      rows.push({
        ...slot,
        name,
        city,
        roles: tally.roles,
        remote: tally.remote,
        hybrid: tally.hybrid,
        newest: tally.newest,
      });
    }
  }
  return rows;
}

const same = (a: CompanyRow, b: CompanyRow) =>
  a.name === b.name &&
  a.city === b.city &&
  a.roles === b.roles &&
  a.remote === b.remote &&
  a.hybrid === b.hybrid &&
  a.newest === b.newest;

// Writes only rows that changed and deletes companies with no open job left; returns how many it touched.
export async function writeCompanies(db: Db, rows: readonly CompanyRow[]): Promise<number> {
  const old = new Map(
    (await db.select().from(companies)).map((row) => [slotOf(row), row as CompanyRow]),
  );
  const changed = rows.filter((row) => {
    const before = old.get(slotOf(row));
    return !before || !same(before, row);
  });
  for (let i = 0; i < changed.length; i += CHUNK) {
    await db
      .insert(companies)
      .values(changed.slice(i, i + CHUNK))
      .onConflictDoUpdate({
        target: [companies.board, companies.company],
        set: {
          name: sql`excluded.name`,
          city: sql`excluded.city`,
          roles: sql`excluded.roles`,
          remote: sql`excluded.remote`,
          hybrid: sql`excluded.hybrid`,
          newest: sql`excluded.newest`,
        },
      });
  }
  const keep = new Set(rows.map(slotOf));
  const gone = [...old.values()].filter((row) => !keep.has(slotOf(row)));
  for (let i = 0; i < gone.length; i += CHUNK) {
    const part = gone.slice(i, i + CHUNK);
    await db.execute(sql`delete from ${companies} where (board, company) in (select * from unnest(
      array[${sql.join(
        part.map((row) => sql`${row.board}`),
        sql`, `,
      )}]::smallint[],
      array[${sql.join(
        part.map((row) => sql`${row.company}`),
        sql`, `,
      )}]::text[]))`);
  }
  return changed.length + gone.length;
}

export type CompanyFacts = {
  name: string;
  city: number;
  roles: number;
  remote: number;
  hybrid: number;
  newest: number;
  careers: string | null;
  slots: { board: number; company: string }[];
};

// Every company by its name's key (visa.ts companyKey) and by each board and stored name it has.
export type CompanyIndex = {
  byKey: Map<string, CompanyFacts>;
  bySlot: Map<string, CompanyFacts>;
};

let cached: { builtAt: number; index: CompanyIndex } | null = null;

export const companySlot = slotOf;

// Read once per match index build.
export async function companyIndex(db: Db, builtAt: number): Promise<CompanyIndex> {
  if (cached?.builtAt === builtAt) return cached.index;
  const rows = await db
    .select({
      board: companies.board,
      company: companies.company,
      name: companies.name,
      city: companies.city,
      roles: companies.roles,
      remote: companies.remote,
      hybrid: companies.hybrid,
      newest: companies.newest,
      source: jobBoards.source,
      token: jobBoards.token,
    })
    .from(companies)
    .innerJoin(jobBoards, eq(jobBoards.id, companies.board));
  const byKey = new Map<string, CompanyFacts>();
  const bySlot = new Map<string, CompanyFacts>();
  for (const row of rows) {
    const key = companyKey(row.name);
    const careers = careersUrl(row.source as JobSourceId, row.token);
    let facts = byKey.get(key);
    if (facts) {
      facts.slots.push({ board: row.board, company: row.company });
      facts.careers ??= careers;
    } else {
      facts = {
        name: row.name,
        city: row.city,
        roles: row.roles,
        remote: row.remote,
        hybrid: row.hybrid,
        newest: fromMinutes(row.newest),
        careers,
        slots: [{ board: row.board, company: row.company }],
      };
      byKey.set(key, facts);
    }
    bySlot.set(slotOf(row), facts);
  }
  const index = { byKey, bySlot };
  cached = { builtAt, index };
  return index;
}

export const hiringSince = (now: number) => toMinutes(now - HIRING_DAYS * DAY_MS);

export function snapshotOf(facts: CompanyFacts, now: number): CompanySnapshot {
  const city = cityById(facts.city);
  return {
    name: facts.name,
    roles: facts.roles,
    remote: facts.remote,
    hybrid: facts.hybrid,
    hiring: facts.newest >= now - HIRING_DAYS * DAY_MS,
    city: city ? { name: city.name, country: city.country, admin: city.admin } : null,
    careers: facts.careers,
  };
}
