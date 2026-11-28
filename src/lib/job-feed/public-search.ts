import { and, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import { jobBoards, listings, titles } from "@/db/schema";
import { absoluteUrl } from "@/lib/seo/urls";
import { FLAG, listingIdOf } from "./codes";
import { searchWords } from "./normalize";
import {
  FRESH_FOR_MS,
  listingRows,
  queryWords,
  rowsOf,
  shownConditions,
  skillNames,
  type CandidateRow,
} from "./records";
import { sourceCredit } from "./sources";
import type { EmploymentType, Seniority } from "./types";

// Shallow on purpose: a public search shows a few openings, not the whole pool the app ranks.
export const PUBLIC_SEARCH_LIMITS = { limit: 10, offset: 100, timeout: "3s" } as const;

// What anyone may see of a job: never its post text, which the feeds allow only inside the app.
export type PublicJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  employmentType: EmploymentType | null;
  seniority: Seniority;
  postedAt: string;
  skills: string[];
  applyUrl: string;
  sourceCredit: string;
  ottoUrl: string;
};

export type PublicJobFilters = { q: string; remote?: boolean };
export type PublicJobPage = { limit: number; offset: number };

// Himalayas' terms bar passing its jobs to other search engines.
const HIDDEN_SOURCE = "himalayas";

export function ottoJobUrl(id: string): string {
  const query = new URLSearchParams({
    next: `/dashboard/jobs?tailor=${id}`,
    utm_source: "mcp",
    utm_medium: "connector",
    utm_campaign: "otto_jobs",
  });
  return absoluteUrl(`/login?${query}`);
}

function publicJob(row: CandidateRow): PublicJob {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    remote: row.remote,
    employmentType: row.employmentType,
    seniority: row.seniority,
    postedAt: new Date(row.postedAt).toISOString(),
    skills: row.keywords,
    applyUrl: row.url,
    sourceCredit: sourceCredit(row.source),
    ottoUrl: ottoJobUrl(row.id),
  };
}

// Postgres doesn't strip accents as foldCase does, so each plain letter also matches its accented forms.
const ACCENTS = new Map<string, string>();
for (const char of "ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñÝýÿĄąĆćČčĎďĘęĚěŃńŇňŘřŚśŠšŤťŮůŹźŻżŽžĞğŞşȘșȚțĂă") {
  const plain = searchWords(char);
  if (/^[a-z]$/.test(plain)) ACCENTS.set(plain, `${ACCENTS.get(plain) ?? ""}${char}`);
}

// Words hold only letters and digits (queryWords), so nothing in them is a regex operator.
function wordPattern(word: string): string {
  const letters = [...word].map((char) => {
    const accented = ACCENTS.get(char);
    return accented ? `[${char}${accented}]` : char;
  });
  return `\\m${letters.join("")}`;
}

const HAYSTACK = sql`coalesce(nullif(${listings.titleText}, ''), ${titles.text}) || ' ' || coalesce(nullif(${listings.company}, ''), ${jobBoards.company}) || ' ' || ${listings.location}`;

// Skill words per name, kept while skillNames hands back the same map.
const skillTokens = new WeakMap<ReadonlyMap<number, string>, [number, string[]][]>();

function skillsStartingWith(names: ReadonlyMap<number, string>, word: string): number[] {
  let tokens = skillTokens.get(names);
  if (!tokens) {
    tokens = [...names].map(([sid, name]) => [sid, searchWords(name).split(" ")]);
    skillTokens.set(names, tokens);
  }
  return tokens
    .filter(([, words]) => words.some((part) => part.startsWith(word)))
    .map(([sid]) => sid);
}

// A word starts a word of the title, company, place or a skill, or of a copy's place in another city.
function wordCondition(word: string, sids: readonly number[]): SQL {
  const pattern = wordPattern(word);
  const skill =
    sids.length > 0 ? sql` or ${listings.skills} && ${`{${sids.join(",")}}`}::smallint[]` : sql``;
  return sql`(${HAYSTACK} ~* ${pattern}${skill} or ((${listings.flags} & ${FLAG.hasCopies}) <> 0 and exists (
    select 1 from ${listings} c where (c.flags & ${sql.raw(String(FLAG.copy))}) <> 0
      and c.board = ${listings.board} and c.grp = ${listings.grp}
      and c.location ~* ${pattern})))`;
}

const clamp = (value: number, max: number, min: number) =>
  Math.min(max, Math.max(min, Math.floor(Number.isFinite(value) ? value : min)));

// Newest open openings matching every word, in one bounded query; copies and Himalayas jobs never show.
export async function searchPublicJobs(
  db: Db,
  filters: PublicJobFilters,
  page: PublicJobPage,
  now: number,
): Promise<{ jobs: PublicJob[]; total: number }> {
  const limit = clamp(page.limit, PUBLIC_SEARCH_LIMITS.limit, 1);
  const offset = clamp(page.offset, PUBLIC_SEARCH_LIMITS.offset, 0);
  const words = queryWords(filters.q);
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`set local statement_timeout = ${sql.raw(`'${PUBLIC_SEARCH_LIMITS.timeout}'`)}`,
    );
    const names = words.length > 0 ? await skillNames(tx) : new Map<number, string>();
    const conditions = [
      shownConditions(now),
      sql`(${listings.flags} & ${sql.raw(String(FLAG.copy))}) = 0`,
      sql`${jobBoards.source} <> ${HIDDEN_SOURCE}`,
      ...words.map((word) => wordCondition(word, skillsStartingWith(names, word))),
    ];
    if (filters.remote)
      conditions.push(sql`(${listings.flags} & ${FLAG.remote | FLAG.openingRemote}) <> 0`);
    const found = rowsOf<{ id: number | string; total: number }>(
      await tx.execute(sql`
        select ${listings.id} as id, (count(*) over ())::int as total
        from ${listings}
        join ${titles} on ${titles.id} = ${listings.title}
        join ${jobBoards} on ${jobBoards.id} = ${listings.board}
        where ${and(...conditions)}
        order by least(${listings.posted}, ${listings.seen}) desc, ${listings.id}
        limit ${limit}::int offset ${offset}::int
      `),
    );
    const ids = found.map((row) => Number(row.id));
    const byId = new Map((await listingRows(tx, ids)).map((row) => [row.listing, row]));
    const jobs = ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [publicJob(row)] : [];
    });
    return { jobs, total: found[0]?.total ?? 0 };
  });
}

// One open job by its public id; null for anything a search wouldn't show.
export async function publicJobById(db: Db, id: string, now: number): Promise<PublicJob | null> {
  const listing = listingIdOf(id.trim());
  if (listing === null) return null;
  const [row] = await listingRows(db, [listing]);
  if (!row || row.source === HIDDEN_SOURCE) return null;
  if ((row.flags & (FLAG.evergreen | FLAG.copy)) !== 0) return null;
  if (Math.min(row.postedAt, row.firstSeenAt) < now - FRESH_FOR_MS) return null;
  return publicJob(row);
}
