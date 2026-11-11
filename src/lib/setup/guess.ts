import { COUNTRY_CODES, findPlaces, isCountryCode, rightsRegionOf } from "@/lib/eligibility/places";
import type { WorkRegion, WorkRight, WorkRights } from "@/lib/eligibility/profile";

// Client-safe and pure. Smart defaults for the first-login step (DESIGN.md, "First login and
// setup"): where the person lives, read from their own resume first and this device's time zone
// second, and the work right that usually comes with living there. Every guess is shown and
// confirmed before anything is saved.

export type CountryGuess = { code: string; from: "resume" | "device" };

/** The first country a location line names: "Lisbon, Portugal" -> "PT", "Austin, TX" -> "US". */
export function countryInLocation(location: string): string | null {
  for (const found of findPlaces(location)) {
    if (found.place.kind === "country") return found.place.code;
  }
  return null;
}

// Intl.Locale's time zones per region (Chrome, Safari, Node), turned around. Firefox has neither
// spelling, so the map comes back empty there and the zone's city is read instead.
type LocaleWithZones = Intl.Locale & { getTimeZones?: () => string[]; timeZones?: string[] };

let zoneCountries: Map<string, string | null> | null = null;

function zoneMap(): Map<string, string | null> {
  if (zoneCountries) return zoneCountries;
  const map = new Map<string, string | null>();
  for (const code of COUNTRY_CODES) {
    let zones: readonly string[] = [];
    try {
      const locale = new Intl.Locale(`und-${code}`) as LocaleWithZones;
      zones = locale.getTimeZones?.() ?? locale.timeZones ?? [];
    } catch {
      zones = [];
    }
    for (const zone of zones) {
      // A zone two countries share says nothing about which one it is.
      map.set(zone, map.has(zone) && map.get(zone) !== code ? null : code);
    }
  }
  zoneCountries = map;
  return map;
}

// The runtime's own name for a zone: "Asia/Kolkata" and "Asia/Calcutta" are the same place, and
// each engine lists only one of them.
function canonicalZone(zone: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: zone }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

/** The country a time zone belongs to: "Europe/Berlin" -> "DE". Null for "UTC" and shared zones. */
export function countryOfTimeZone(zone: string): string | null {
  if (!zone) return null;
  const canonical = canonicalZone(zone);
  if (!canonical) return null;
  const map = zoneMap();
  for (const key of [zone, canonical]) {
    const hit = map.get(key);
    if (hit !== undefined) return hit;
  }
  const city = canonical.split("/").pop()?.replace(/_/g, " ") ?? "";
  return city ? countryInLocation(city) : null;
}

/**
 * Where the person most likely lives: the newest resume that names a country, else this device's
 * time zone. `locations` are the person's own resumes' location lines, newest first.
 */
export function guessCountry({
  locations,
  timeZone,
}: {
  locations: readonly string[];
  timeZone: string;
}): CountryGuess | null {
  for (const location of locations) {
    const code = countryInLocation(location);
    if (code) return { code, from: "resume" };
  }
  const code = countryOfTimeZone(timeZone);
  return code ? { code, from: "device" } : null;
}

/** The work-rights region living in a country is usually enough for: "PT" -> "eu", "NO" -> null. */
export function homeRegion(country: string): WorkRegion | null {
  return isCountryCode(country) ? rightsRegionOf({ kind: "country", code: country }) : null;
}

// The rights as the step shows them, and which region the step set by itself (so changing the
// country can take that guess back, but never an answer the person gave).
export type RightsDraft = { rights: WorkRights; auto: WorkRegion | null };

/** After a country change: the old guess goes back to unanswered, the new home region to "Yes". */
export function moveHomeRegion(draft: RightsDraft, country: string): RightsDraft {
  const rights: WorkRights = { ...draft.rights };
  if (draft.auto && rights[draft.auto] === "authorized") rights[draft.auto] = null;
  const region = homeRegion(country);
  if (region && rights[region] === null) {
    rights[region] = "authorized";
    return { rights, auto: region };
  }
  return { rights, auto: null };
}

/** The person's own answer for a region; it is never guessed over again. */
export function answerRegion(
  draft: RightsDraft,
  region: WorkRegion,
  value: WorkRight | null,
): RightsDraft {
  return {
    rights: { ...draft.rights, [region]: value },
    auto: draft.auto === region ? null : draft.auto,
  };
}
