import { HOME_COUNTRY, NO_RELOCATION, PERMANENT_RESIDENT, RELOCATION, visaRegionIn } from "./cues";
import { placeContains, placeName, rightsRegionOf, type Place } from "./places";
import { REGION_NAMES, type WorkProfile, type WorkRegion } from "./profile";
import {
  formatHours,
  formatOffset,
  gapMinutes,
  offsetMinutes,
  zoneOffset,
  type TimeRule,
} from "./time";
import type { EligibilityFinding, EligibilityRule, EligibilityVerdict, ProfileGap } from "./types";

// check.ts decides which rules a post sets.

export type Source = "post" | "location";
export type Unit = { text: string; quote: string };
export type Claim = { places: Place[]; quote: string; source: Source };

export type Context = {
  profile: WorkProfile | null;
  locationPlaces: Place[];
  sponsorOffered: boolean;
  relocation: boolean;
  remote: boolean;
  onSite: boolean;
  // Set when the job is remote and open where the person lives, e.g. "Nigeria".
  worksFromHome?: string;
  sponsorRegions?: readonly WorkRegion[];
};

export type CheckOptions = {
  now: number;
  deviceTimeZone?: string;
  sponsorRegions?: readonly WorkRegion[];
};

// How a note states the register fact. An explicit "we don't sponsor" line still wins.
const REGISTER_NAMES: Record<WorkRegion, string> = {
  uk: "is listed as a UK visa sponsor",
  us: "has had H-1B visa petitions approved",
  eu: "is listed as a visa sponsor",
  ca: "is listed as a visa sponsor",
};

function listedSponsor(regions: readonly WorkRegion[], context: Context): WorkRegion | null {
  return regions.find((region) => context.sponsorRegions?.includes(region)) ?? null;
}

function listPlaces(places: Place[]): string {
  const names = [...new Set(places.map(placeName))];
  if (names.length <= 2) return names.join(" or ");
  return `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
}

export const homeName = (code: string) => placeName({ kind: "country", code });

function finding(
  rule: EligibilityRule,
  verdict: EligibilityVerdict,
  note: string,
  quote: string,
  extra: { source?: Source; gap?: ProfileGap } = {},
): EligibilityFinding {
  return {
    rule,
    verdict,
    note,
    quote,
    source: extra.source ?? "post",
    ...(extra.gap ? { gap: extra.gap } : {}),
  };
}

type Mode = "restricted" | "on_site" | "unclear";

function locationVerdict(
  places: Place[],
  mode: Mode,
  claim: Omit<Claim, "places">,
  context: Context,
): EligibilityFinding {
  const { quote, source } = claim;
  const country = context.profile?.country ?? "";
  if (!country) {
    return finding(
      "location",
      "check",
      "Add your country to your work profile to check this.",
      quote,
      { source, gap: "country" },
    );
  }
  const home = homeName(country);
  const where = listPlaces(places);
  if (mode === "restricted") {
    return RELOCATION.test(quote) && !NO_RELOCATION.test(quote)
      ? finding(
          "location",
          "check",
          `This is for people in ${where}, or willing to move there. You live in ${home}.`,
          quote,
          { source },
        )
      : finding(
          "location",
          "blocked",
          `This is for people in ${where}. You live in ${home}.`,
          quote,
          { source },
        );
  }
  if (mode === "unclear") {
    return finding(
      "location",
      "check",
      `The post lists ${where} and says remote. Ask if they hire from ${home}.`,
      quote,
      { source },
    );
  }
  const canWork = places.some((place) => {
    const region = rightsRegionOf(place);
    return region !== null && context.profile?.rights[region] === "authorized";
  });
  if (canWork) {
    return finding(
      "location",
      "check",
      `The job is in ${where}. You can work there, so it comes down to moving.`,
      quote,
      { source },
    );
  }
  if (context.sponsorOffered) {
    return finding(
      "location",
      "check",
      `The job is in ${where}, and they sponsor visas. You'd need to move.`,
      quote,
      { source },
    );
  }
  const listed = listedSponsor(
    places.flatMap((place) => rightsRegionOf(place) ?? []),
    context,
  );
  if (listed) {
    return finding(
      "location",
      "check",
      `The job is in ${where}, and the company ${REGISTER_NAMES[listed]}. Ask whether they'd sponsor you before you apply.`,
      quote,
      { source },
    );
  }
  if (context.relocation) {
    return finding(
      "location",
      "check",
      `The job is in ${where}, and the post mentions relocation. Ask if they'd move you.`,
      quote,
      { source },
    );
  }
  return finding("location", "blocked", `The job is in ${where}, and it isn't remote.`, quote, {
    source,
  });
}

// Places limiting the job are alternatives ("Remote - US" in the field, "we also hire in Canada" in
// the text), so the person only needs to be in one of them.
export function locationFinding(
  restricted: Claim[],
  field: Claim | null,
  anywhere: Claim | null,
  context: Context,
): EligibilityFinding | null {
  const country = context.profile?.country ?? "";
  const first = restricted[0];
  if (first) {
    const covering = country
      ? restricted.find((claim) => claim.places.some((place) => placeContains(place, country)))
      : undefined;
    if (covering) {
      return finding(
        "location",
        "ok",
        `You live in ${homeName(country)}, which this covers.`,
        covering.quote,
        { source: covering.source },
      );
    }
    const places = restricted.flatMap((claim) => claim.places);
    return locationVerdict(places, context.onSite ? "on_site" : "restricted", first, context);
  }
  if (field && country && field.places.some((place) => placeContains(place, country))) {
    return finding(
      "location",
      "ok",
      `You live in ${homeName(country)}, which this covers.`,
      field.quote,
      { source: field.source },
    );
  }
  if (field && (context.onSite || !context.remote))
    return locationVerdict(field.places, "on_site", field, context);
  if (anywhere) {
    return finding("location", "ok", "The post says you can work from anywhere.", anywhere.quote, {
      source: anywhere.source,
    });
  }
  return field ? locationVerdict(field.places, "unclear", field, context) : null;
}

function regionsFor(
  places: Place[],
  hint: WorkRegion | null,
  context: Context,
): { regions: WorkRegion[]; named: Place | null } {
  const own = [...new Set(places.flatMap((place) => rightsRegionOf(place) ?? []))];
  if (own.length > 0) return { regions: own, named: null };
  if (hint) return { regions: [hint], named: null };
  if (places[0]) return { regions: [], named: places[0] };
  const fromLocation = [
    ...new Set(context.locationPlaces.flatMap((place) => rightsRegionOf(place) ?? [])),
  ];
  return { regions: fromLocation, named: context.locationPlaces[0] ?? null };
}

type RightsRule = "authorization" | "sponsorship" | "citizenship";

export function rightsVerdict(
  kind: RightsRule,
  unit: Unit,
  places: Place[],
  context: Context,
): EligibilityFinding {
  const rule = kind === "sponsorship" ? "sponsorship" : "authorization";
  const { quote } = unit;
  // "Authorized to work in the country you live in": no visa comes into it.
  if (kind !== "citizenship" && places.length === 0 && HOME_COUNTRY.test(unit.text)) {
    const country = context.profile?.country ?? "";
    const home = country ? homeName(country) : "";
    const note =
      kind === "sponsorship"
        ? `They don't sponsor visas, but you'd work from ${home}, where you live.`
        : `They ask for the right to work where you live, in ${home}.`;
    return country
      ? finding(rule, "ok", note, quote)
      : finding(rule, "check", "Add your country to your work profile to check this.", quote, {
          gap: "country",
        });
  }
  const { regions, named } = regionsFor(places, visaRegionIn(unit.text), context);
  const what = PERMANENT_RESIDENT.test(unit.text)
    ? "citizenship or permanent residence"
    : "citizenship";
  const [first] = regions;
  // "Remote - EMEA" with "no sponsorship", for someone in Lagos: no visa comes into it.
  if (!first && context.worksFromHome && kind !== "citizenship") {
    const home = context.worksFromHome;
    return kind === "sponsorship"
      ? finding(
          rule,
          "ok",
          `They don't sponsor visas, but you'd work from ${home}, where you live.`,
          quote,
        )
      : finding(rule, "ok", `You'd work from ${home}, where you live.`, quote);
  }
  if (!first) {
    const note = named
      ? `Your work profile covers the US, UK, EU and Canada, so check ${placeName(named)} yourself.`
      : kind === "sponsorship"
        ? "They don't sponsor visas. Check which country this covers."
        : kind === "citizenship"
          ? `They ask for ${what}. Check which country they mean.`
          : "Check which country they mean.";
    return finding(rule, "check", note, quote);
  }
  const rights = context.profile?.rights;
  const authorized = regions.find((region) => rights?.[region] === "authorized");
  const unanswered = regions.find((region) => (rights?.[region] ?? null) === null);
  if (kind === "citizenship") {
    if (authorized) {
      return finding(
        rule,
        "check",
        `They ask for ${what} in ${REGION_NAMES[authorized]}, not just the right to work. Check that you have it.`,
        quote,
      );
    }
    if (unanswered)
      return finding(
        rule,
        "check",
        `Add whether you can work in ${REGION_NAMES[unanswered]} to your work profile.`,
        quote,
        { gap: "rights" },
      );
    return finding(
      rule,
      "blocked",
      `They ask for ${what}, and you said you'd need a visa for ${REGION_NAMES[first]}.`,
      quote,
    );
  }
  if (authorized) {
    return kind === "sponsorship"
      ? finding(
          rule,
          "ok",
          `They don't sponsor visas, but you said you don't need one for ${REGION_NAMES[authorized]}.`,
          quote,
        )
      : finding(rule, "ok", `You said you can work in ${REGION_NAMES[authorized]}.`, quote);
  }
  if (unanswered) {
    const where = REGION_NAMES[unanswered];
    const note =
      kind === "sponsorship"
        ? `Add whether you'd need a visa for ${where} to your work profile.`
        : `Add whether you can work in ${where} to your work profile.`;
    return finding(rule, "check", note, quote, { gap: "rights" });
  }
  const where = REGION_NAMES[first];
  if (kind === "sponsorship")
    return finding(
      rule,
      "blocked",
      `They don't sponsor visas, and you said you'd need one for ${where}.`,
      quote,
    );
  if (context.sponsorOffered)
    return finding(
      rule,
      "check",
      `You'd need a visa for ${where}, and the post mentions sponsorship. Ask before you apply.`,
      quote,
    );
  const listed = listedSponsor(regions, context);
  return listed
    ? finding(
        rule,
        "check",
        `You'd need a visa for ${where}, and the company ${REGISTER_NAMES[listed]}. Ask before you apply.`,
        quote,
      )
    : finding(rule, "blocked", `You said you'd need a visa to work in ${where}.`, quote);
}

export function sponsorOfferVerdict(
  unit: Unit,
  places: Place[],
  context: Context,
): EligibilityFinding {
  const { regions } = regionsFor(places, visaRegionIn(unit.text), context);
  const needs = regions.find((region) => context.profile?.rights[region] === "sponsorship");
  const note = needs
    ? `They sponsor visas, and you said you'd need one for ${REGION_NAMES[needs]}.`
    : "The post says they can sponsor a visa.";
  return finding("sponsorship", "ok", note, unit.quote);
}

export function timeVerdict(
  rule: TimeRule,
  quote: string,
  profile: WorkProfile | null,
  options: CheckOptions,
): EligibilityFinding {
  const zone = profile?.timeZone || options.deviceTimeZone || "";
  const mine = zone ? offsetMinutes(zone, options.now) : null;
  if (mine === null) {
    return finding(
      "time_zone",
      "check",
      "Add your time zone to your work profile to check this.",
      quote,
      { gap: "time_zone" },
    );
  }
  const you = profile?.timeZone
    ? `You're on ${formatOffset(mine)}`
    : `This device is on ${formatOffset(mine)}`;
  const at = options.now;
  if (rule.kind === "range") {
    const min = zoneOffset(rule.min, at) ?? 0;
    const max = zoneOffset(rule.max, at) ?? 0;
    if (mine >= min && mine <= max)
      return finding("time_zone", "ok", `${you}, inside ${rule.label}.`, quote);
    const distance = Math.min(gapMinutes(mine, min), gapMinutes(mine, max));
    const verdict = distance <= 120 ? "check" : "blocked";
    return finding(
      "time_zone",
      verdict,
      `${you}, ${formatHours(distance)} outside ${rule.label}.`,
      quote,
    );
  }
  if (rule.kind === "within") {
    const gap = gapMinutes(mine, zoneOffset(rule.zone, at) ?? 0);
    return gap <= rule.hours * 60
      ? finding(
          "time_zone",
          "ok",
          `${you}, ${formatHours(gap)} from ${rule.zone.label}. The post allows ${rule.hours}.`,
          quote,
        )
      : finding(
          "time_zone",
          "blocked",
          `${you}, ${formatHours(gap)} from ${rule.zone.label}. The post asks for ${rule.hours} at most.`,
          quote,
        );
  }
  if (rule.kind === "overlap") {
    const gap = gapMinutes(mine, zoneOffset(rule.zone, at) ?? 0);
    if (rule.hours === null) {
      return gap <= 180
        ? finding(
            "time_zone",
            "ok",
            `${you}, ${formatHours(gap)} from ${rule.zone.label}, so most of your day overlaps.`,
            quote,
          )
        : finding(
            "time_zone",
            "check",
            `${you}, ${formatHours(gap)} from ${rule.zone.label}. You'd need to shift your hours.`,
            quote,
          );
    }
    // A 9 to 5 day in each place.
    const shared = Math.max(0, 480 - gap);
    const note = `A 9 to 5 day gives you ${formatHours(shared)} of overlap with ${rule.zone.label}. They ask for ${rule.hours}.`;
    return shared >= rule.hours * 60
      ? finding("time_zone", "ok", note, quote)
      : finding("time_zone", "check", `${note} You'd need to shift your hours.`, quote);
  }
  let closest = Number.POSITIVE_INFINITY;
  let label = "";
  for (const target of rule.zones) {
    const gap = gapMinutes(mine, zoneOffset(target, at) ?? 0);
    if (gap < closest) {
      closest = gap;
      label = target.label;
    }
  }
  const verdict = closest <= 60 ? "ok" : closest <= 180 ? "check" : "blocked";
  return finding("time_zone", verdict, `${you}, ${formatHours(closest)} from ${label}.`, quote);
}

export function workTypeVerdict(
  fullTime: boolean,
  contract: boolean,
  quote: string,
  profile: WorkProfile,
): EligibilityFinding {
  const fits = (fullTime && profile.fullTime) || (contract && profile.contract);
  const kind =
    fullTime && contract ? "full-time or contract" : fullTime ? "full-time" : "a contract role";
  if (fits) return finding("work_type", "ok", `It's ${kind}, which you're open to.`, quote);
  const yours = profile.fullTime ? "full-time only" : "contract only";
  return finding("work_type", "check", `It's ${kind}. Your work profile says ${yours}.`, quote);
}
