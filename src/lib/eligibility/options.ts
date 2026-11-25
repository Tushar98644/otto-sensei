import { intlLocale, type Locale } from "@/i18n/config";
import { COUNTRY_CODES, countryName } from "./places";
import { isTimeZone } from "./profile";

export { deviceTimeZone } from "./profile";
import { formatOffset, offsetMinutes } from "./time";

export type Option = { value: string; label: string };

// Country names in the reader's language, sorted their way.
export function countryOptions(locale: Locale = "en"): Option[] {
  const tag = intlLocale(locale);
  const collator = new Intl.Collator(tag);
  const names = locale === "en" ? null : new Intl.DisplayNames([tag], { type: "region" });
  return COUNTRY_CODES.map((code) => ({
    value: code,
    label: names ? (names.of(code) ?? countryName(code)) : countryName(code),
  })).sort((a, b) => collator.compare(a.label, b.label));
}

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
