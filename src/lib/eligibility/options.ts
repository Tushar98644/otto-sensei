import { COUNTRY_CODES, countryName } from "./places";
import { isTimeZone } from "./profile";
import { formatOffset, offsetMinutes } from "./time";

// Client-safe. Choices for the work profile form, named by the runtime's own data.

export type Option = { value: string; label: string };

export function countryOptions(): Option[] {
  const collator = new Intl.Collator("en");
  return COUNTRY_CODES.map((code) => ({ value: code, label: countryName(code) })).sort((a, b) =>
    collator.compare(a.label, b.label),
  );
}

/** Every IANA zone with today's offset, e.g. "America/New York (UTC-5)". `keep` is always listed. */
export function timeZoneOptions(now: number, keep = ""): Option[] {
  const zones = new Set(Intl.supportedValuesOf("timeZone"));
  // Older names such as "Asia/Calcutta" are valid but not listed; never drop a saved one.
  if (keep && isTimeZone(keep)) zones.add(keep);
  return [...zones].sort().map((zone) => {
    const offset = offsetMinutes(zone, now);
    const name = zone.replace(/_/g, " ");
    return { value: zone, label: offset === null ? name : `${name} (${formatOffset(offset)})` };
  });
}

/** This browser's time zone, or "" when it doesn't say. */
export function deviceTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && isTimeZone(zone) ? zone : "";
  } catch {
    return "";
  }
}
