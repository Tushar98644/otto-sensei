import { z } from "zod";
import { countryName, findPlaces, isCountryCode, placeContains } from "@/lib/eligibility/places";
import { htmlToText } from "@/lib/jobs/html";
import { toTime } from "@/lib/jobs/posting";
import { DAY_MS } from "@/lib/time";
import {
  eachItem,
  FeedShapeError,
  httpsLink,
  joinLocation,
  nullishString,
  REMOTE_WORDS,
  typeFrom,
  type RawJob,
} from "./shared";

// A career site is "{tenant}.wd{N}/{site}": https://{tenant}.wd{N}.myworkdayjobs.com/{site}.
export type WorkdayBoard = { tenant: string; host: string; site: string };

const TENANT = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const SHARD = /^wd\d{1,3}$/;
const SITE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;
const JOB_PATH = /^\/job\/[^?#\s]{1,400}$/;
const MAX_ID_CHARS = 300;

export const WORKDAY_PAGE_SIZE = 20;

export function workdayBoard(token: string): WorkdayBoard {
  const [host, site, ...rest] = token.split("/");
  const [tenant, shard, ...more] = (host ?? "").split(".");
  if (
    rest.length > 0 ||
    more.length > 0 ||
    !tenant ||
    !shard ||
    !site ||
    !TENANT.test(tenant) ||
    !SHARD.test(shard) ||
    !SITE.test(site)
  )
    throw new FeedShapeError(`bad token ${token}`);
  return { tenant, host: `${tenant}.${shard}.myworkdayjobs.com`, site };
}

export function workdayListUrl(board: WorkdayBoard): URL {
  return new URL(`https://${board.host}/wday/cxs/${board.tenant}/${board.site}/jobs`);
}

export function workdayJobUrl(board: WorkdayBoard, externalPath: string): URL {
  return new URL(`https://${board.host}/wday/cxs/${board.tenant}/${board.site}${externalPath}`);
}

export const workdayRobotsUrl = (board: WorkdayBoard) =>
  new URL(`https://${board.host}/robots.txt`);

export function workdayListBody(offset: number, facets: Record<string, string[]> = {}) {
  return { appliedFacets: facets, limit: WORKDAY_PAGE_SIZE, offset, searchText: "" };
}

export type WorkdayListing = {
  externalPath: string;
  title: string;
  locationsText: string;
  postedOn: string;
};

const Listing = z.object({
  title: z.string().trim().min(1),
  externalPath: z.string().regex(JOB_PATH),
  locationsText: nullishString,
  postedOn: nullishString,
});

const FacetValue = z.object({
  facetParameter: nullishString,
  descriptor: nullishString,
  id: nullishString,
  count: z.number().nullish(),
  values: z.array(z.unknown()).nullish(),
});

export type WorkdayFacet = {
  parameter: string;
  values: { id: string; name: string; count: number }[];
};

export type WorkdayPage = { total: number; listings: WorkdayListing[]; facets: WorkdayFacet[] };

function collectFacets(items: readonly unknown[], out: WorkdayFacet[]): void {
  for (const facet of eachItem(items, FacetValue)) {
    const values = eachItem(facet.values ?? [], FacetValue);
    const leaves = values.flatMap((value) =>
      value.id && value.descriptor && !value.values
        ? [{ id: value.id, name: value.descriptor.trim(), count: value.count ?? 0 }]
        : [],
    );
    if (facet.facetParameter && leaves.length > 0)
      out.push({ parameter: facet.facetParameter, values: leaves });
    collectFacets(
      values.filter((value) => value.values),
      out,
    );
  }
}

export function parseWorkdayList(json: unknown): WorkdayPage {
  const page = z
    .object({
      total: z.number().nullish(),
      jobPostings: z.array(z.unknown()),
      facets: z.array(z.unknown()).nullish(),
    })
    .safeParse(json);
  if (!page.success) throw new FeedShapeError("workday");
  const facets: WorkdayFacet[] = [];
  collectFacets(page.data.facets ?? [], facets);
  return {
    total: page.data.total ?? 0,
    listings: eachItem(page.data.jobPostings, Listing).map((listing) => ({
      externalPath: listing.externalPath,
      title: listing.title,
      locationsText: listing.locationsText?.trim() ?? "",
      postedOn: listing.postedOn?.trim() ?? "",
    })),
    facets,
  };
}

// A facet value whose whole name is one country, such as "United Kingdom".
function countryOf(name: string): string | null {
  const found = findPlaces(name);
  const only = found.length === 1 ? found[0] : undefined;
  if (only?.place.kind !== "country" || only.text.length < name.replace(/\W+$/, "").length)
    return null;
  return only.place.code;
}

// A site's value led or ended by its country: "US, Oregon, Hillsboro", "Bangalore, India".
function siteCountry(name: string): string | null {
  const parts = name.split(/\s*(?:,|\s-\s)\s*/).filter(Boolean);
  if (parts.length < 2) return null;
  return countryOf(parts[0]!) ?? countryOf(parts.at(-1)!);
}

export type CountryFacet = {
  parameter: string;
  values: { id: string; code: string | null; count: number }[];
};

function bestFacet(
  facets: readonly WorkdayFacet[],
  read: (name: string) => string | null,
): WorkdayFacet | null {
  let best: WorkdayFacet | null = null;
  let bestKnown = 0;
  for (const facet of facets) {
    const known = facet.values.filter((value) => read(value.name)).length;
    if (known < 2 || known < facet.values.length * 0.6) continue;
    if (!best || known > bestKnown) [best, bestKnown] = [facet, known];
  }
  return best;
}

// The country facet where a site has one, else its list of sites when each names its country.
// Every value is kept: "Remote - United States" reads as the US, and one naming no country ("Remote") has no code.
export function countryFacet(facets: readonly WorkdayFacet[]): CountryFacet | null {
  const facet = bestFacet(facets, countryOf) ?? bestFacet(facets, siteCountry);
  if (!facet) return null;
  return {
    parameter: facet.parameter,
    values: facet.values.map((value) => ({
      id: value.id,
      code: countryOf(value.name) ?? siteCountry(value.name),
      count: value.count,
    })),
  };
}

// Where Otto's readers are asked to look first (owner decision 2026-11-22).
const TARGET_COUNTRIES = new Set(["US", "GB", "AU"]);

export function isTargetCountry(code: string): boolean {
  return (
    TARGET_COUNTRIES.has(code) ||
    placeContains({ kind: "group", group: "latam" }, code) ||
    placeContains({ kind: "group", group: "europe" }, code)
  );
}

const POSTED = /\bposted\s+(today|yesterday|(\d{1,3})\+?\s+days?\s+ago)\b/i;

export function workdayPostedAt(postedOn: string, readAt: number): number | null {
  const match = POSTED.exec(postedOn);
  if (!match) return null;
  const word = match[1]!.toLowerCase();
  const days =
    word === "today" ? 0 : word === "yesterday" ? 1 : Number(match[2]) + (/\+/.test(word) ? 1 : 0);
  return readAt - days * DAY_MS;
}

export function workdayExternalId(board: WorkdayBoard, externalPath: string): string {
  return `${board.tenant}/${board.site}${externalPath}`;
}

const remoteFrom = (texts: readonly string[], remoteType: string) =>
  /\bremote\b/i.test(remoteType) || texts.some((text) => REMOTE_WORDS.test(text));

function listedFields(board: WorkdayBoard, listing: WorkdayListing) {
  const url = httpsLink(`https://${board.host}/${board.site}${listing.externalPath}`);
  const externalId = workdayExternalId(board, listing.externalPath);
  if (!url || externalId.length > MAX_ID_CHARS) return null;
  return {
    externalId,
    url,
    // The list never shows the post, so a job changes when its title, places or link do.
    hashKey: [listing.title, listing.locationsText, listing.externalPath].join("\u0000"),
  };
}

export function workdayListingJob(
  board: WorkdayBoard,
  listing: WorkdayListing,
  company: string,
  readAt: number,
): RawJob | null {
  const fields = listedFields(board, listing);
  if (!fields) return null;
  const remote = remoteFrom([listing.locationsText], "");
  return {
    ...fields,
    company,
    title: listing.title,
    location: listing.locationsText,
    remote,
    employmentType: null,
    postedAt: workdayPostedAt(listing.postedOn, readAt),
    validThrough: null,
    text: "",
    listingOnly: true,
  };
}

const Detail = z.object({
  jobPostingInfo: z.object({
    title: z.string().trim().min(1),
    jobDescription: nullishString,
    location: nullishString,
    additionalLocations: z.array(z.string()).nullish(),
    remoteType: nullishString,
    startDate: nullishString,
    postedOn: nullishString,
    timeType: nullishString,
    country: z.object({ descriptor: nullishString }).nullish(),
    jobRequisitionLocation: z
      .object({ country: z.object({ alpha2Code: nullishString }).nullish() })
      .nullish(),
    canApply: z.boolean().nullish(),
  }),
});

function withCountry(place: string, code: string | null): string {
  if (!place || !code || !isCountryCode(code)) return place;
  const named = findPlaces(place, { cities: true }).some(
    (spot) => spot.place.kind === "country" && placeContains(spot.place, code),
  );
  return named ? place : `${place}, ${countryName(code)}`;
}

export function parseWorkdayJob(
  json: unknown,
  board: WorkdayBoard,
  listing: WorkdayListing,
  company: string,
  readAt: number,
): RawJob | null {
  const parsed = Detail.safeParse(json);
  if (!parsed.success) throw new FeedShapeError("workday");
  const job = parsed.data.jobPostingInfo;
  const fields = listedFields(board, listing);
  if (!fields || job.canApply === false) return null;
  const code = job.jobRequisitionLocation?.country?.alpha2Code?.trim().toUpperCase() ?? null;
  const primary = withCountry(job.location?.trim() || job.country?.descriptor?.trim() || "", code);
  const places = [primary, ...(job.additionalLocations ?? []).map((place) => place.trim())].filter(
    Boolean,
  );
  if (places.length === 0 && listing.locationsText) places.push(listing.locationsText);
  const remoteType = job.remoteType?.trim() ?? "";
  const remote = remoteFrom(places, remoteType);
  const named = places.some((place) => REMOTE_WORDS.test(place));
  const label = remote && !named ? "Remote" : /\bhybrid\b/i.test(remoteType) ? "Hybrid" : null;
  return {
    ...fields,
    company,
    title: job.title,
    location: joinLocation([label, ...places.slice(0, 3)]),
    remote,
    employmentType: typeFrom(job.timeType),
    postedAt:
      toTime(job.startDate) ??
      workdayPostedAt(job.postedOn ?? "", readAt) ??
      workdayPostedAt(listing.postedOn, readAt),
    validThrough: null,
    text: htmlToText(job.jobDescription ?? ""),
  };
}
