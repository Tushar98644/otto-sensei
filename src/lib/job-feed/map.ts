import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { listings } from "@/db/schema";
import type { WorkProfile } from "@/lib/eligibility/profile";
import { cityById } from "@/lib/geo/cities";
import type { ContentLang } from "@/lib/i18n/languages";
import { boardRange, FLAG } from "./codes";
import { companyIndex, companySlot, snapshotOf, type CompanyIndex } from "./companies";
import { lookingForOf } from "./looking-for";
import { personFrom } from "./match";
import { indexWeights, poolCompanies, readStoredCounts } from "./match-index";
import { OCCUPATIONS } from "./occupations";
import { poolQueryOf, withOccupation } from "./rank";
import { listingRows, shownConditions, skillWeights, toFeedJob } from "./records";
import type {
  CompanyJobsResponse,
  JobFilters,
  JobMapResponse,
  LookingFor,
  MapPin,
  MatchProfile,
} from "./types";
import { companyKey } from "./visa";

export type MapRequest = {
  profile: MatchProfile;
  filters: JobFilters;
  lookingFor: LookingFor | null;
  workProfile: WorkProfile | null;
  langs: readonly ContentLang[] | null;
  now: number;
};

const EMPTY: CompanyIndex = { byKey: new Map(), bySlot: new Map() };

// One pin per company and city: where its matching jobs are, else where most of its jobs are.
export async function mapCompanies(
  db: Db,
  request: MapRequest,
): Promise<Omit<JobMapResponse, "ok">> {
  const lookingFor = withOccupation(
    request.lookingFor ?? lookingForOf(request.profile, request.workProfile),
  );
  const person = personFrom(request.profile, lookingFor, OCCUPATIONS);
  const counts = await readStoredCounts(db);
  const weights = counts
    ? await indexWeights(db, counts).catch(() => skillWeights(db))
    : await skillWeights(db);
  const query = poolQueryOf(person, lookingFor, request.filters, weights, request.langs);
  const [pool, index] = await Promise.all([
    poolCompanies(db, query, counts, request.now),
    counts ? companyIndex(db, counts.builtAt).catch(() => EMPTY) : EMPTY,
  ]);
  const pins = new Map<string, MapPin>();
  let placed = 0;
  for (const row of pool.companies) {
    const facts = index.bySlot.get(companySlot(row));
    if (!facts) continue;
    const city = cityById(row.city) ?? cityById(facts.city);
    if (!city) continue;
    placed += row.roles;
    const key = `${companyKey(facts.name)}\u0000${city.id}`;
    const pin = pins.get(key);
    if (pin) {
      pin.roles += row.roles;
      continue;
    }
    const snapshot = snapshotOf(facts, request.now);
    pins.set(key, {
      name: facts.name,
      lat: city.lat,
      lng: city.lng,
      city: { name: city.name, country: city.country, admin: city.admin },
      roles: row.roles,
      total: facts.roles,
      hiring: snapshot.hiring,
    });
  }
  return { pins: [...pins.values()], openings: pool.openings, placed };
}

export const COMPANY_JOBS_SHOWN = 50;

// A company's open jobs, newest first, and what Otto knows of it; null when it has none open.
export async function companyJobs(
  db: Db,
  name: string,
  now: number,
): Promise<Omit<CompanyJobsResponse, "ok"> | null> {
  const counts = await readStoredCounts(db);
  if (!counts) return null;
  const facts = (await companyIndex(db, counts.builtAt)).byKey.get(companyKey(name));
  if (!facts) return null;
  const ids: number[] = [];
  for (const slot of facts.slots) {
    const [low, high] = boardRange(slot.board);
    const rows = await db
      .select({ id: listings.id })
      .from(listings)
      .where(
        and(
          sql`${listings.id} between ${low} and ${high}`,
          eq(listings.company, slot.company),
          shownConditions(now),
          sql`(${listings.flags} & ${FLAG.copy}) = 0`,
        ),
      )
      .orderBy(desc(sql`least(${listings.posted}, ${listings.seen})`))
      .limit(COMPANY_JOBS_SHOWN);
    ids.push(...rows.map((row) => row.id));
  }
  const jobs = (await listingRows(db, ids))
    .sort((a, b) => Math.min(b.postedAt, b.firstSeenAt) - Math.min(a.postedAt, a.firstSeenAt))
    .slice(0, COMPANY_JOBS_SHOWN)
    .map(toFeedJob);
  return { company: snapshotOf(facts, now), jobs };
}
