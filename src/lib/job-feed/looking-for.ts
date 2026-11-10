import { fieldSaysWorldwide } from "@/lib/eligibility/cues";
import {
  COUNTRY_CODES,
  countryName,
  findPlaces,
  isCountryCode,
  placeContains,
  type Place,
  type PlaceGroup,
} from "@/lib/eligibility/places";
import type { WorkProfile } from "@/lib/eligibility/profile";
import { roleFamily, SENIORITY_RANK, seniorityForYears, seniorityOf } from "./roles";
import {
  NO_CHOICE,
  PLACE_GROUPS,
  type LookingFor,
  type LookingForChoice,
  type MatchProfile,
  type PlaceChoice,
  type RoleFamily,
  type Seniority,
} from "./types";

export {
  LOOKING_FOR_LIMITS,
  LookingForChoiceSchema,
  LookingForSchema,
  NO_CHOICE,
  PLACE_GROUPS,
  type LookingFor,
  type LookingForChoice,
  type LookingForResponse,
  type PlaceChoice,
} from "./types";

// Client-safe and pure. The "Looking for" card on the Jobs tab: the role, level and place Matches
// are ranked for, guessed from the resume and the work profile and changed in one tap
// (MATCHING-RESEARCH.md, Round 2 (f): infer, then confirm, never block). Role and level shape the
// order; "Remote only" is the one hard filter. Nothing here leaves our own server.

export const LEVEL_NAMES: Record<Seniority, string> = {
  intern: "Internship",
  junior: "Entry level",
  mid: "Mid level",
  senior: "Senior",
  lead: "Lead or staff",
  director: "Director and up",
};

const GROUP_LABELS: Record<(typeof PLACE_GROUPS)[number], string> = {
  north_america: "North America",
  latam: "Latin America",
  europe: "Europe",
  eu: "EU",
  emea: "Europe, Middle East and Africa",
  apac: "Asia-Pacific",
  anz: "Australia and New Zealand",
};

const SHORT_COUNTRY: Record<string, string> = { US: "US", GB: "UK", AE: "UAE" };

export function placeLabel(choice: PlaceChoice): string {
  if (choice === "anywhere") return "anywhere";
  if (choice.startsWith("g:"))
    return GROUP_LABELS[choice.slice(2) as (typeof PLACE_GROUPS)[number]];
  const code = choice.slice(2);
  return SHORT_COUNTRY[code] ?? countryName(code);
}

/** "Remote, EU", "Remote or on-site, US", "Remote, anywhere". */
export function placeLine(value: Pick<LookingFor, "place" | "remote">): string {
  if (value.place === "anywhere") return value.remote ? "Remote, anywhere" : "Anywhere";
  return `${value.remote ? "Remote" : "Remote or on-site"}, ${placeLabel(value.place)}`;
}

// Level words a title carries, dropped from the role it names: "Senior Product Manager" is a
// Product Manager at the senior level.
const LEVEL_WORDS =
  /\b(?:senior|sr\.?|snr|junior|jr\.?|associate|entry[- ]level|graduate|new grad|intern(?:ship)?|trainee|apprentice|staff|principal|lead|ii|iii|iv|level \d)\b/gi;

/** The kind of role in a title, without its level: "Sr. Backend Engineer II" -> "Backend Engineer". */
export function roleTitle(title: string): string {
  const cleaned = title
    .split(/\s+[-–—|@]\s+|\s+at\s+|,\s+/i)[0]!
    .replace(/\([^)]*\)/g, " ")
    .replace(LEVEL_WORDS, " ")
    .replace(/\s+\bi\s*$/i, " ")
    // The dot a dropped "Sr." leaves behind.
    .replace(/(?:^|\s)[.,;:]+(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || title.trim()).slice(0, 80);
}

// The occupation is read on the server (occupations/index.ts); the browser leaves it null.
export type RoleOption = { title: string; family: RoleFamily | null; occupation: string | null };

/** The roles a resume names, newest first, without repeats: the card's role menu. */
export function roleOptions(profile: Pick<MatchProfile, "titles">): RoleOption[] {
  const seen = new Set<string>();
  const out: RoleOption[] = [];
  for (const title of profile.titles) {
    const role = roleTitle(title);
    const key = role.toLowerCase();
    if (!role || seen.has(key)) continue;
    seen.add(key);
    out.push({ title: role, family: roleFamily(title), occupation: null });
  }
  return out;
}

/** The level the resume reads at: the latest title, raised by years, never past senior by years. */
export function levelOf(profile: Pick<MatchProfile, "titles" | "years">): Seniority | null {
  const latest = profile.titles[0];
  const fromTitle = latest ? seniorityOf(latest) : null;
  const fromYears = profile.years === null ? null : seniorityForYears(profile.years);
  if (fromTitle && fromYears && SENIORITY_RANK[fromYears] > SENIORITY_RANK[fromTitle])
    return fromYears;
  return fromTitle ?? fromYears;
}

const EU_GROUP: Place = { kind: "group", group: "eu" };

/** Where to look, from the work profile's country: the EU for an EU country, else the country. */
export function placeFromProfile(profile: WorkProfile | null): PlaceChoice {
  const country = profile?.country ?? "";
  if (!country || !isCountryCode(country)) return "anywhere";
  return placeContains(EU_GROUP, country) ? "g:eu" : `c:${country}`;
}

/** The card as shown: each part the person picked, else the guess from resume and work profile. */
export function lookingForOf(
  profile: Pick<MatchProfile, "titles" | "years">,
  work: WorkProfile | null,
  choice: LookingForChoice = NO_CHOICE,
): LookingFor {
  const [latest] = roleOptions(profile).filter((option) => option.family !== null);
  const role = choice.role ??
    latest ??
    roleOptions(profile)[0] ?? { title: "", family: null, occupation: null };
  return {
    title: role.title,
    family: role.family,
    occupation: role.occupation ?? null,
    level: choice.level ?? levelOf(profile),
    place: choice.place ?? placeFromProfile(work),
    remote: choice.remote,
  };
}

// --- Place fit, for ranking ---------------------------------------------------------------------

// Where a job is, as short tokens: country codes ("US"), groups ("g:emea"), "*" for anywhere.
// Worked out once per location (findPlaces reads the text), so stored at ingest in job_match.
const placeCache = new Map<string, string[]>();
const PLACE_CACHE_MAX = 20_000;

export function jobPlaceTokens(location: string): string[] {
  const key = location.trim();
  if (!key) return [];
  const known = placeCache.get(key);
  if (known) return known;
  const tokens = new Set<string>();
  for (const spot of findPlaces(key)) {
    tokens.add(spot.place.kind === "country" ? spot.place.code : `g:${spot.place.group}`);
  }
  if (tokens.size === 0 && fieldSaysWorldwide(key)) tokens.add("*");
  const out = [...tokens].sort();
  if (placeCache.size >= PLACE_CACHE_MAX) placeCache.clear();
  placeCache.set(key, out);
  return out;
}

const members = new Map<PlaceGroup, Set<string>>();
function membersOf(group: PlaceGroup): Set<string> {
  let set = members.get(group);
  if (!set) {
    set = new Set(COUNTRY_CODES.filter((code) => placeContains({ kind: "group", group }, code)));
    members.set(group, set);
  }
  return set;
}

const ALL_GROUPS: readonly PlaceGroup[] = [...PLACE_GROUPS, "americas"];

/**
 * The job place tokens that suit a choice: the country or the group's countries, every group
 * that covers any of them, and "*". null for "anywhere", where place doesn't change the order.
 */
export function acceptedPlaces(choice: PlaceChoice): string[] | null {
  if (choice === "anywhere") return null;
  const countries = choice.startsWith("c:")
    ? new Set([choice.slice(2)])
    : membersOf(choice.slice(2) as PlaceGroup);
  // A US choice takes Puerto Rico and the other territories, as placeContains does.
  if (choice === "c:US")
    for (const code of COUNTRY_CODES)
      if (placeContains({ kind: "country", code: "US" }, code)) countries.add(code);
  const out = new Set<string>(["*", ...countries]);
  for (const group of ALL_GROUPS) {
    const inside = membersOf(group);
    if ([...countries].some((code) => inside.has(code))) out.add(`g:${group}`);
  }
  return [...out].sort();
}

export type PlaceFit = "match" | "unknown" | "miss";

/** Whether a job's place suits the choice. A job that names no place is "unknown", never a miss. */
export function placeFit(
  jobTokens: readonly string[],
  accepted: readonly string[] | null,
): PlaceFit {
  if (accepted === null || jobTokens.length === 0) return "unknown";
  const set = new Set(accepted);
  return jobTokens.some((token) => set.has(token)) ? "match" : "miss";
}

const TITLE_STOP = new Set(["of", "and", "the", "for", "a", "an", "to", "in", "&"]);
const titleWords = (title: string) =>
  title
    .toLowerCase()
    .split(/[^\p{L}\p{N}+#]+/u)
    .filter((word) => word && !TITLE_STOP.has(word));

/** Every word of the role asked for is in the job's title: "Product Manager" in "Senior Product Manager, Growth". */
export function titleFits(jobTitle: string, roleTitleAsked: string): boolean {
  const asked = titleWords(roleTitleAsked);
  if (asked.length === 0) return false;
  const words = new Set(titleWords(jobTitle));
  return asked.every((word) => words.has(word));
}
