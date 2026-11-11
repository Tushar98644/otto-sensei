import { COUNTRY_CODES, findPlaces, isCountryCode, rightsRegionOf } from "@/lib/eligibility/places";
import type { WorkRegion, WorkRight, WorkRights } from "@/lib/eligibility/profile";

// Every guess is shown and confirmed before anything is saved.

export type CountryGuess = { code: string; from: "resume" | "device" };

/** "Lisbon, Portugal" -> "PT", "Austin, TX" -> "US". */
export function countryInLocation(location: string): string | null {
  for (const found of findPlaces(location)) {
    if (found.place.kind === "country") return found.place.code;
  }
  return null;
}

// Firefox has neither spelling, so the map comes back empty there and the zone's city is read
// instead.
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

// "Asia/Kolkata" and "Asia/Calcutta" are the same place, and each engine lists only one of them.
function canonicalZone(zone: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: zone }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

/** Null for "UTC" and shared zones. */
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

// The newest resume that names a country, else this device's time zone.
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

/** "PT" -> "eu", "NO" -> null. */
export function homeRegion(country: string): WorkRegion | null {
  return isCountryCode(country) ? rightsRegionOf({ kind: "country", code: country }) : null;
}

// `auto`: the region the step set itself, so a country change can take that guess back, never an
// answer.
export type RightsDraft = { rights: WorkRights; auto: WorkRegion | null };

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
