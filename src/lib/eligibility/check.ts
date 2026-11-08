import {
  AUTHORIZATION,
  CONTRACT,
  FULL_TIME,
  HOME_COUNTRY,
  LOCATION_LINE,
  NOT_REMOTE,
  NO_RELOCATION,
  ON_SITE,
  RELOCATION,
  REMOTE,
  asksCitizenship,
  describesTeamOnly,
  fieldSaysWorldwide,
  offersSponsorship,
  refusesSponsorship,
  restrictedPlaces,
  saysOnSite,
  saysWorldwide,
} from "./cues";
import { findPlaces, type FoundPlace, type Place } from "./places";
import type { WorkProfile } from "./profile";
import { findTimeRule } from "./time";
import type { EligibilityFinding, EligibilityRule, EligibilityVerdict } from "./types";
import {
  homeName,
  locationFinding,
  rightsVerdict,
  sponsorOfferVerdict,
  timeVerdict,
  workTypeVerdict,
  type CheckOptions,
  type Claim,
  type Context,
  type Source,
  type Unit,
} from "./verdicts";

export type { CheckOptions };

// Client-safe and pure. Reads a job post for the rules that decide whether it can hire someone from
// where they are, and checks each against the work profile. Rule-based on purpose: every verdict
// points at a line the person can read for themselves, and nothing leaves the browser.

export type PostInput = { location: string; text: string };

const MAX_QUOTE = 240;
const MAX_UNITS = 400;
const RULES: EligibilityRule[] = [
  "location",
  "authorization",
  "sponsorship",
  "time_zone",
  "work_type",
];
const SEVERITY: Record<EligibilityVerdict, number> = { ok: 1, check: 2, blocked: 3 };
const TIME_ZONE_PHRASE = /\b[\w.]+(?:\s+[\w.]+)?\s+time[- ]?zones?\b/gi;

// Sentences of the post, so each quote is one claim a person can find and read.
function unitsOf(text: string): Unit[] {
  const units: Unit[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s*(?:[-*•·]|\d+[.)])\s+/, "").trim();
    if (!line) continue;
    // Two letters before the stop, so "U.S. citizens" and "e.g. Python" stay in one piece.
    const parts = line.split(/(?<=[A-Za-z0-9)]{2}[.!?;])\s+(?=[A-Z"“(])/);
    for (const part of parts) {
      const clean = part.trim();
      if (clean) units.push({ text: clean, quote: clip(clean) });
      if (units.length >= MAX_UNITS) return units;
    }
  }
  return units;
}

// "Remote · United States" (how job boards join remote and the allowed countries) limits the job;
// "Remote · New York, NY" names an office and may not.
function remoteCountries(location: string, spots: FoundPlace[]): Place[] {
  const bare = (text: string) => text.replace(/^the\s+/i, "").toLowerCase();
  const parts = location
    .split(/\s*[·•|;]\s*/)
    .filter((part) => part && !/^(?:remote|anywhere|distributed)$/i.test(part));
  const named =
    parts.length > 0 &&
    parts.every((part) => spots.some((spot) => bare(part) === bare(spot.text)));
  return named ? spots.map((spot) => spot.place) : [];
}

function clip(text: string): string {
  if (text.length <= MAX_QUOTE) return text;
  const cut = text.slice(0, MAX_QUOTE);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), MAX_QUOTE - 20)).trimEnd()}…`;
}

/**
 * One finding per rule the post sets (the most serious one when it says it more than once), in
 * rule order. An empty list means the post doesn't say where you must live, which visa you need,
 * which hours you'd keep or what kind of job it is. `profile` null: signed out or never saved.
 */
export function checkEligibility(
  post: PostInput,
  profile: WorkProfile | null,
  options: CheckOptions,
): EligibilityFinding[] {
  const units = unitsOf(post.text);
  // Boards without a location field often put a "Location: ..." line in the text instead.
  const locationUnit = post.location.trim()
    ? null
    : (units.find((unit) => LOCATION_LINE.test(unit.text)) ?? null);
  const location =
    post.location.trim() || (LOCATION_LINE.exec(locationUnit?.text ?? "")?.[1] ?? "").trim();
  const fieldClaim = {
    quote: locationUnit?.quote ?? clip(location),
    source: (locationUnit ? "post" : "location") as Source,
  };
  const all = `${location}\n${post.text}`;
  const notRemote = NOT_REMOTE.test(all);
  const fieldSpots = location ? findPlaces(location) : [];
  const context: Context = {
    profile,
    locationPlaces: fieldSpots.map((spot) => spot.place),
    sponsorOffered: units.some((unit) => offersSponsorship(unit.text)),
    relocation: units.some((unit) => RELOCATION.test(unit.text) && !NO_RELOCATION.test(unit.text)),
    remote: REMOTE.test(all) && !notRemote,
    onSite: notRemote || ON_SITE.test(location) || units.some((unit) => saysOnSite(unit.text)),
  };

  const restricted: Claim[] = [];
  let field: Claim | null = null;
  let anywhere: Claim | null = null;
  if (location) {
    const remoteField = /\bremote\b|\banywhere\b|\bdistributed\b|\bworldwide\b/i.test(location);
    const cued = restrictedPlaces(location, fieldSpots, { field: true });
    const limited =
      cued.length > 0 || !remoteField || ON_SITE.test(location)
        ? cued
        : remoteCountries(location, fieldSpots);
    if (limited.length > 0) restricted.push({ ...fieldClaim, places: limited });
    else if (fieldSpots.length > 0) field = { ...fieldClaim, places: context.locationPlaces };
    else if (remoteField && fieldSaysWorldwide(location)) anywhere = { ...fieldClaim, places: [] };
  }

  const parsed = units.map((unit) => {
    const timeRule = describesTeamOnly(unit.text) ? null : findTimeRule(unit.text);
    const line = unit.text.replace(TIME_ZONE_PHRASE, " ");
    const spots = findPlaces(line);
    return { unit, timeRule, line, spots, places: spots.map((spot) => spot.place) };
  });
  for (const { unit, timeRule, line, spots, places } of parsed) {
    if (unit === locationUnit) continue;
    const limited = restrictedPlaces(line, spots);
    if (limited.length > 0) restricted.push({ places: limited, quote: unit.quote, source: "post" });
    else if (
      !anywhere &&
      places.length === 0 &&
      context.remote &&
      !timeRule &&
      saysWorldwide(unit.text)
    ) {
      anywhere = { places: [], quote: unit.quote, source: "post" };
    }
  }
  // A post that limits where you live also says which visa a "no sponsorship" line is about.
  if (context.locationPlaces.length === 0) {
    context.locationPlaces = restricted.flatMap((claim) => claim.places);
  }
  const where = locationFinding(restricted, field, anywhere, context);
  const found: EligibilityFinding[] = where ? [where] : [];
  // Remote and open where they live, or asking for the right to work "in your country of
  // residence": a "no sponsorship" line naming no country is then about home, needing no visa.
  const homeRights = units.some(
    (unit) => HOME_COUNTRY.test(unit.text) && AUTHORIZATION.test(unit.text),
  );
  const worksAtHome = (where?.verdict === "ok" && context.remote && !context.onSite) || homeRights;
  if (worksAtHome && where?.verdict !== "blocked" && profile?.country) {
    context.worksFromHome = homeName(profile.country);
  }

  let fullTimeAt: Unit | null = null;
  let contractAt: Unit | null = null;
  for (const { unit, timeRule, places } of parsed) {
    if (timeRule) found.push(timeVerdict(timeRule, unit.quote, profile, options));
    const noSponsor = refusesSponsorship(unit.text);
    if (asksCitizenship(unit.text)) found.push(rightsVerdict("citizenship", unit, places, context));
    else if (AUTHORIZATION.test(unit.text) && !noSponsor)
      found.push(rightsVerdict("authorization", unit, places, context));
    if (noSponsor) found.push(rightsVerdict("sponsorship", unit, places, context));
    else if (offersSponsorship(unit.text))
      found.push(sponsorOfferVerdict(unit, places, context));
    if (!fullTimeAt && FULL_TIME.test(unit.text)) fullTimeAt = unit;
    if (!contractAt && CONTRACT.test(unit.text)) contractAt = unit;
  }
  const typeQuote = fullTimeAt ?? contractAt;
  if (profile && typeQuote)
    found.push(workTypeVerdict(fullTimeAt !== null, contractAt !== null, typeQuote.quote, profile));

  // Of equally serious findings the first wins, in reading order.
  const best = new Map<EligibilityRule, EligibilityFinding>();
  for (const item of found) {
    const current = best.get(item.rule);
    if (!current || SEVERITY[item.verdict] > SEVERITY[current.verdict]) best.set(item.rule, item);
  }
  return RULES.flatMap((rule) => best.get(rule) ?? []);
}

/** The most serious verdict in a list, or null when the post sets no rules. */
export function worstVerdict(findings: EligibilityFinding[]): EligibilityVerdict | null {
  let worst: EligibilityVerdict | null = null;
  for (const item of findings) {
    if (!worst || SEVERITY[item.verdict] > SEVERITY[worst]) worst = item.verdict;
  }
  return worst;
}
