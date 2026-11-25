import { intlLocale, type Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import englishWords from "@/i18n/messages/en/jobsShared";
import {
  COUNTRY_CODES,
  countryName,
  isCountryCode,
  placeContains,
  type Place,
  type PlaceGroup,
} from "@/lib/eligibility/places";
import type { WorkProfile } from "@/lib/eligibility/profile";
import { roleFamily, SENIORITY_RANK, seniorityForYears, seniorityOf, skillsFamily } from "./roles";
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
  NO_CHOICE,
  PLACE_GROUPS,
  type LookingFor,
  type LookingForChoice,
  type LookingForResponse,
  type PlaceChoice,
} from "./types";

// The jobsShared namespace; components outside a messages provider read these English words.
export type JobsSharedWords = typeof englishWords;
export const ENGLISH_JOBS_SHARED: JobsSharedWords = englishWords;

export const LEVEL_NAMES: Record<Seniority, string> = englishWords.levels;

// A country's name in the reader's language; English keeps "US", "UK" and "UAE" short.
export type RegionName = (code: string) => string;
const SHORT_COUNTRY: Record<string, string> = { US: "US", GB: "UK", AE: "UAE" };
const englishRegion: RegionName = (code) => SHORT_COUNTRY[code] ?? countryName(code);

// Country names in another language come from Intl; English keeps the ones above.
export function regionNamesFor(locale: Locale): RegionName | undefined {
  if (locale === "en") return undefined;
  const names = new Intl.DisplayNames([intlLocale(locale)], { type: "region" });
  return (code) => names.of(code) ?? code;
}

// "Data and AI" reads as "data and AI" inside a sentence.
export const familyWords = (family: RoleFamily, words: JobsSharedWords = englishWords) =>
  words.families[family];

// The role the line shows: a job picked from the list, else the standard job the resume's title reads as, never the title itself.
export function roleName(
  value: Pick<LookingFor, "title" | "family">,
  occupation: string | null,
  picked: boolean,
  words: JobsSharedWords = englishWords,
): string {
  if (picked && value.title) return value.title;
  if (occupation) return occupation;
  return value.family
    ? fmt(words.anyFamilyRole, { family: familyWords(value.family, words) })
    : words.anyRole;
}

// What Otto says while a new choice's matches load, like "Looking for entry-level finance jobs…".
export function searchingLine(
  value: Pick<LookingFor, "title" | "family" | "level">,
  occupation: string | null,
  picked: boolean,
  words: JobsSharedWords = englishWords,
): string {
  const { searching } = words;
  const role =
    (picked && value.title) || occupation || (value.family ? familyWords(value.family, words) : "");
  if (value.level === "intern")
    return role ? fmt(searching.roleInternships, { role }) : searching.internships;
  const level = value.level ? words.searchLevels[value.level] : "";
  if (level && role) return fmt(searching.levelRole, { level, role });
  if (level) return fmt(searching.level, { level });
  return role ? fmt(searching.role, { role }) : searching.jobs;
}

export function placeLabel(
  choice: PlaceChoice,
  words: JobsSharedWords = englishWords,
  regionName: RegionName = englishRegion,
): string {
  if (choice === "anywhere") return words.anywhere;
  if (choice.startsWith("g:"))
    return words.groups[choice.slice(2) as (typeof PLACE_GROUPS)[number]];
  return regionName(choice.slice(2));
}

export function placeLine(
  value: Pick<LookingFor, "place" | "remote">,
  words: JobsSharedWords = englishWords,
  regionName: RegionName = englishRegion,
): string {
  if (value.place === "anywhere") return value.remote ? words.remoteAnywhere : words.anywhereLine;
  return fmt(words.placeLine, {
    remote: value.remote ? words.card.remote : words.card.remoteOrOnsite,
    place: placeLabel(value.place, words, regionName),
  });
}

const LEVEL_WORDS =
  /\b(?:senior|sr\.?|snr|junior|jr\.?|associate|entry[- ]level|graduate|new grad|intern(?:ship)?|trainee|apprentice|staff|principal|lead|ii|iii|iv|level \d)\b/gi;

export function roleTitle(title: string): string {
  const cleaned = title
    .split(/\s+[-–—|@]\s+|\s+at\s+|,\s+/i)[0]!
    .replace(/\([^)]*\)/g, " ")
    .replace(LEVEL_WORDS, " ")
    .replace(/\s+\bi\s*$/i, " ")
    .replace(/(?:^|\s)[.,;:]+(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || title.trim()).slice(0, 80);
}

export type RoleOption = { title: string; family: RoleFamily | null; occupation: string | null };

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

export function levelOf(profile: Pick<MatchProfile, "titles" | "years">): Seniority | null {
  const latest = profile.titles[0];
  const fromTitle = latest ? seniorityOf(latest) : null;
  const fromYears = profile.years === null ? null : seniorityForYears(profile.years);
  if (fromTitle && fromYears && SENIORITY_RANK[fromYears] > SENIORITY_RANK[fromTitle])
    return fromYears;
  return fromTitle ?? fromYears;
}

const EU_GROUP: Place = { kind: "group", group: "eu" };

export function placeFromProfile(profile: WorkProfile | null): PlaceChoice {
  const country = profile?.country ?? "";
  if (!country || !isCountryCode(country)) return "anywhere";
  return placeContains(EU_GROUP, country) ? "g:eu" : `c:${country}`;
}

const NO_ROLE: RoleOption = { title: "", family: null, occupation: null };

// A title that names no kind of role yields to a clear lead in the skills, then to "Any role".
function guessedRole(
  profile: Pick<MatchProfile, "titles"> & { skills?: readonly string[] },
): RoleOption {
  const options = roleOptions(profile);
  const named = options.find((option) => option.family !== null);
  if (named) return named;
  const family = skillsFamily(profile.skills ?? []);
  if (family) return { ...NO_ROLE, family };
  return options[0] ?? NO_ROLE;
}

export function lookingForOf(
  profile: Pick<MatchProfile, "titles" | "years"> & { skills?: readonly string[] },
  work: WorkProfile | null,
  choice: LookingForChoice = NO_CHOICE,
): LookingFor {
  const role = choice.role ?? guessedRole(profile);
  return {
    title: role.title,
    family: role.family,
    occupation: role.occupation ?? null,
    level: choice.level ?? levelOf(profile),
    place: choice.place ?? placeFromProfile(work),
    remote: choice.remote,
    ...(choice.langs ? { langs: choice.langs } : {}),
  };
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

export function acceptedPlaces(choice: PlaceChoice): string[] | null {
  if (choice === "anywhere") return null;
  const countries = choice.startsWith("c:")
    ? new Set([choice.slice(2)])
    : membersOf(choice.slice(2) as PlaceGroup);
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

export function titleFits(jobTitle: string, roleTitleAsked: string): boolean {
  const asked = titleWords(roleTitleAsked);
  if (asked.length === 0) return false;
  const words = new Set(titleWords(jobTitle));
  return asked.every((word) => words.has(word));
}
