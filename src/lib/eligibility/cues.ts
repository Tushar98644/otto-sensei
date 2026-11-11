import { findPlaces, type FoundPlace, type Place } from "./places";
import type { WorkRegion } from "./profile";

// Almost every pattern here exists to stop a false alarm: company intros ("a Berlin-based startup")
// and team descriptions ("spread across UTC-8 to UTC+2") use the same words as real rules.

export const REMOTE = /\bremote\b|\bwork from home\b|\bWFH\b|\bdistributed (?:team|company)\b/i;
export const NOT_REMOTE =
  /\b(?:not|no|isn't|is not|non)[- ](?:a\s+|fully\s+)?remote\b|\bremote (?:work )?(?:is not|isn't) (?:an option|possible|available)\b/i;
export const ON_SITE = /\b(?:hybrid|on[- ]?site|in[- ]office|in the office|in[- ]person)\b/i;
// "2 days a week in our SF office", "You'll work from our Austin HQ".
const OFFICE_DAYS =
  /\b(?:[1-5]|one|two|three|four|five)(?:\s*(?:-|to|or)\s*(?:[1-5]|two|three|four|five))?\s+days?\s+(?:a|per|each|every)\s+week\b[^.\n]{0,40}\b(?:office|HQ|headquarters|studio|on[- ]?site)\b/i;
const AT_OFFICE =
  /\b(?:work(?:ing)?|based|be)\s+(?:from|at|in|out of)\s+(?:our|the)\s+(?:[\w-]+\s+){0,3}(?:office|HQ|headquarters)\b/i;
// "Visit our Berlin office once a quarter" is a remote job with trips.
const OCCASIONAL =
  /\b(?:occasional(?:ly)?|optional(?:ly)?|once (?:a|per|every) (?:month|quarter|year)|quarterly|retreats?|off-?sites?|interviews?|if you (?:want|like|prefer)|whenever you)\b/i;

export function saysOnSite(line: string): boolean {
  if (OCCASIONAL.test(line)) return false;
  return ON_SITE.test(line) || OFFICE_DAYS.test(line) || AT_OFFICE.test(line);
}
export const RELOCATION = /\breloca(?:te|tion|ting)\b/i;
export const NO_RELOCATION =
  /\b(?:no|not|without|unable|cannot|can't|don't|do not)\b[^.\n]{0,30}\breloca/i;
// A "Location: ..." line inside the post, used when the board gives no location field.
export const LOCATION_LINE = /^(?:job\s+|work\s+)?locations?\s*[:\-–]\s*(.{2,120})$/i;

const WORLDWIDE_STRONG =
  /\b(?:from anywhere|anywhere in the world|(?:candidates?|applicants?|people|talent|anyone|hire|hiring|work(?:ing)?|live|based)\s+(?:located\s+)?anywhere|location[- ]independent|any (?:country|location))\b/i;
const WORLDWIDE_SOFT = /\b(?:worldwide|world-wide|globally|global)\b/i;
const WORK_CONTEXT =
  /\b(?:remote|hir(?:e|ing)|candidates?|applicants?|open to|location|based|work(?:ing)? from)\b/i;

export function saysWorldwide(line: string): boolean {
  return WORLDWIDE_STRONG.test(line) || (WORLDWIDE_SOFT.test(line) && WORK_CONTEXT.test(line));
}

export function fieldSaysWorldwide(location: string): boolean {
  return /\b(?:anywhere|worldwide|world-wide|global|globally|international)\b/i.test(location);
}

export const AUTHORIZATION =
  /\b(?:(?:legally|currently|lawfully)\s+)?(?:authori[sz]ed|eligible|entitled|permitted|allowed|able) to (?:live and )?work\b|\bright to work\b|\bwork(?:ing)? (?:authori[sz]ation|permit|visa|rights?)\b|\bauthori[sz]ation to work\b|\bemployment authori[sz]ation\b/i;
export const NO_SPONSOR =
  /\b(?:no|not|unable|cannot|can't|can ?not|won't|will not|do(?:es)? not|don't|doesn't|aren't|are not|isn't|is not)\b[^.\n]{0,50}\bsponsor|\bsponsor\w*\b[^.\n]{0,30}\b(?:not (?:available|possible|offered|provided)|unavailable)\b|\bsponsor\w*\s*[:\-–]\s*(?:no|none|n\/a)\b|\bwithout (?:the need for |requiring |needing )?(?:current or future |any )?(?:visa |employer |employment )?sponsorship\b/i;
export const YES_SPONSOR =
  /\b(?:(?:visa )?sponsorship (?:is )?(?:available|offered|provided|possible)|(?:visa )?sponsorship\s*[:\-–]\s*(?:yes|available|offered|provided|possible)|(?:we|can|will|do|happy to|able to|glad to|open to|willing to)\s+(?:\w+\s+)?sponsor\w*|offer(?:s|ing)? (?:visa )?sponsorship|provides? (?:visa )?sponsorship|(?:visa|immigration|work permit) (?:support|assistance|help)|(?:support|help|assist)(?:\s+you)?\s+(?:with|in getting|to get|obtain(?:ing)?)\s+(?:an?\s+|the\s+|your\s+)?(?:\w+\s+){0,2}(?:visas?|blue card|work permit))\b/i;

// "We sponsor conference trips": a perk, not a visa, unless the line also names one.
const PERK_SPONSOR =
  /\bsponsor(?:s|ed|ing|ship)?\s+(?:of\s+|for\s+)?(?:[\w-]+\s+){0,2}(?:conferences?|events?|trips?|travel|certifications?|courses?|classes|training|learning|education|memberships?|meetups?|hackathons?|relocation|tuition|gym|books?|equipment|attendance|tickets?|open[- ]source|charit\w*|sports?|clubs?)\b/i;
const VISA_WORD =
  /\bvisas?\b|\bimmigration\b|\bwork permits?\b|\bH-?1-?B\b|\bBlue Card\b|\bgreen card\b|\bSkilled Worker\b|\bLMIA\b/i;

function aboutVisas(line: string): boolean {
  return VISA_WORD.test(line) || !PERK_SPONSOR.test(line);
}

export function refusesSponsorship(line: string): boolean {
  return NO_SPONSOR.test(line) && aboutVisas(line);
}

export function offersSponsorship(line: string): boolean {
  return YES_SPONSOR.test(line) && !NO_SPONSOR.test(line) && aboutVisas(line);
}

// "Authorized to work in the country you live in": a remote job asking for work rights at home.
export const HOME_COUNTRY =
  /\b(?:the\s+)?(?:country|location|place)\s+(?:where\s+|in which\s+|that\s+)?you(?:'re|\s+are)?\s+(?:currently\s+)?(?:live|living|reside|residing|based|located|work(?:ing)? from)\b|\byour\s+(?:(?:home\s+)?country|place|country) of residence\b|\bwhere you (?:live|reside)\b/i;

const CITIZENSHIP =
  /\b(?:must|need to|required to|have to)\s+(?:be|hold|have)\s+(?:an?\s+)?(?:[\w.]+\s+){0,3}citizen(?:ship)?\b|\bcitizen(?:s|ship)\b[^.\n]{0,40}\b(?:only|required|requirement|is a must|needed)\b|\b(?:requires?|required|requiring)\s+(?:[\w.]+\s+){0,3}citizenship\b|\bonly\s+(?:open to\s+)?(?:[\w.]+\s+){0,2}citizens\b/i;
// Equal-opportunity lines name citizenship as something they ignore.
const EQUAL_OPPORTUNITY = /\bregardless of\b|\bdiscriminat|\bequal (?:employment )?opportunit/i;
export const PERMANENT_RESIDENT = /\b(?:permanent residen(?:t|ts|ce|cy)|green card|PR holders?)\b/i;

/** "Must be a U.S. citizen", "UK citizens only": more than a right to work. */
export function asksCitizenship(line: string): boolean {
  return CITIZENSHIP.test(line) && !EQUAL_OPPORTUNITY.test(line);
}

// Visa names that pin a sponsorship line to one country when it names no place.
const VISA_REGIONS: Array<[RegExp, WorkRegion]> = [
  [/\b(?:H-?1-?B|TN visa|E-3|O-1|L-1)\b|\b(?:OPT|CPT|EAD)\b|\bgreen card\b/, "us"],
  [/\b(?:Skilled Worker|Tier 2|Global Talent) visa\b|\b(?:ILR|BRP)\b/i, "uk"],
  [/\bBlue Card\b/i, "eu"],
  [/\b(?:LMIA|PGWP)\b/, "ca"],
];

export function visaRegionIn(line: string): WorkRegion | null {
  for (const [pattern, region] of VISA_REGIONS) if (pattern.test(line)) return region;
  return null;
}

// "permanent" alone is a job type, but not in "permanent resident".
export const FULL_TIME = /\bfull[- ]time\b|\bpermanent\b(?!\s+(?:residen\w*|address))/i;
// No bare "contractors" or "B2B": "you'll work with contractors" and "a B2B SaaS company" are not
// contract jobs.
export const CONTRACT =
  /\bcontract(?:or)?s?\s+(?:role|position|basis|job|work|engagement|opportunity|assignment)\b|\bcontract\s*(?:\/|or|and)\s*(?:full|perm)|\b(?:full[- ]time|permanent)\s*(?:\/|or|and)\s*contract\b|\bcontract[- ]to[- ]hire\b|\b(?:as an?|independent)\s+contractor\b|\b(?:fixed|short)[- ]term\s+(?:contract|role|position|project)\b|\bfreelance\b|\b\d+[- ](?:month|week)s?\s+contract\b|\bon a contract\b|\b(?:employment|job|position|engagement|work|contract) type:?\s*(?:contract|freelance|temporary)\b|\bB2B\s+(?:contract|basis|agreement)\b|\bon a B2B\b|\b1099\b|\bC2C\b|\bcorp[- ]to[- ]corp\b/i;

// A team description, not a rule: "Our team is spread across UTC-8 to UTC+2".
const DESCRIBES_TEAM = /\b(?:spread|spans?|spanning|across)\b/i;
const ASKS =
  /\b(?:must|need|needs|required?|requirement|only|within|should|expect(?:ed)?|able to|hire|hiring|candidates?|applicants?|you|your|overlap\w*|availab\w*)\b/i;

export function describesTeamOnly(line: string): boolean {
  return DESCRIBES_TEAM.test(line) && !ASKS.test(line);
}

// "Our app is available in the US only" names a place and "only", but nobody's job.
const ABOUT_THE_JOB =
  /\b(?:remote|hir(?:e|es|ing)|candidates?|applicants?|you|your|you're|you'll|must|role|position|job|work(?:ing)?|based|located|resid\w*|eligible|open to|locations?|citizens?|talent|people|team members?)\b/i;

// Any place in the line is the rule: "Must reside in one of the following states: CA, NY".
const STRONG_RULE =
  /\bmust\s+(?:be\s+)?(?:(?:currently|legally|physically)\s+)?(?:based|located|resid(?:e|ing|ent)|liv(?:e|ing)|work(?:ing)? from)\b|\b(?:can|are able to|will|may)\s+only\s+(?:hire|employ|consider|accept|work with)\b|\b(?:only|exclusively)\s+(?:(?:open|available)\s+to\s+)?(?:hir(?:e|ing)|consider(?:ing)?|accept(?:ing)?|candidates?|applicants?|residents?)\b|\bresidents? only\b/i;

// Words right before a place that make it a rule: "Remote - US", "anywhere in the EU", "open to
// candidates in EMEA", "hiring in Canada", "Locations: ".
const CUE_BEFORE = new RegExp(
  // Grouped, so every cue (not only the last) has to end right where the place starts.
  `(?:${[
    String.raw`\bremote\b\s*(?:[(\[\-–—:|,]\s*|(?:in|from|within)\s+)`,
    String.raw`\b(?:only|exclusively)\s+(?:(?:open|available)\s+to\s+(?:\w+\s+){0,2})?(?:in|from|within|for)\s+`,
    String.raw`\b(?:anywhere|resid(?:e|es|ing|ents?)|living|live|work(?:ing)? from|hir(?:e|es|ing)|employ(?:ing)?|candidates?|applicants?|citizens?|open to)\s+(?:(?:people|candidates|applicants|talent|those|anyone|engineers|developers)\s+)?(?:(?:currently\s+)?(?:based|located|living|residing)\s+)?(?:in|of|from|within)\s+`,
    String.raw`\b(?:eligible\s+)?(?:locations?|countries|regions?)\s*:\s*`,
  ].join("|")})(?:the\\s+)?$`,
  "i",
);
// "based in" and "located in" describe the company as often as the hire, so they only count
// when the clause is about the person or the role: "This role is based in London" yes, "We're
// based in San Francisco" no.
const BASED_BEFORE =
  /\b(?:based|located|situated)\s+(?:in|out of|within)\s+(?:(?:the|our|one of our)\s+)?$/i;
const PERSON =
  /\b(?:you|your|you're|you'll|candidates?|applicants?|role|position|job|opening|must|required|need to|should|have to|only|hires?)\b/i;
const PAY =
  /\b(?:salary|salaries|compensation|pay (?:range|band|scale|rate)|base pay|OTE|bonus|stipend|benefits|health (?:insurance|care|coverage)|401\(?k\)?|pension)\b|[$€£]\s?\d/i;
const CLAUSE_BREAK =/[;:!?—–()]|,\s|\bbut\b|\bwhile\b|\bwhereas\b|\bwith\b/i;

const ONLY_AFTER = /^\s*(?:[-–]\s*)?only\b/i;
const REMOTE_AFTER = /^\s*(?:[-–,]\s*|\(\s*)?remote\b/i;
const BASED_AFTER =
  /^[-\s]based\b(?=\s*(?:\w+\s+)?(?:candidates?|applicants?|people|residents?|hires?|talent|engineers?|developers?|designers?|professionals?|individuals?|team members?|contractors?|freelancers?|roles?|positions?|only)\b|\s*[.,;)!]|\s*$)/i;
const LIST_JOIN = /^\s*(?:,|\/|&|\+|;|\bor\b|\band\b|,\s*(?:or|and)\b)?\s*(?:the\s+)?$/i;

function personClause(before: string): boolean {
  const clause = before.split(CLAUSE_BREAK).at(-1) ?? "";
  return PERSON.test(clause);
}

function cuedAt(line: string, spot: FoundPlace): boolean {
  const before = line.slice(Math.max(0, spot.index - 80), spot.index);
  const end = spot.index + spot.text.length;
  const after = line.slice(end, end + 60);
  return (
    CUE_BEFORE.test(before) ||
    (BASED_BEFORE.test(before) && personClause(before.replace(BASED_BEFORE, ""))) ||
    ONLY_AFTER.test(after) ||
    REMOTE_AFTER.test(after) ||
    BASED_AFTER.test(after)
  );
}

const joined = (line: string, a: FoundPlace, b: FoundPlace) =>
  LIST_JOIN.test(line.slice(a.index + a.text.length, b.index));

// Each place a cue points at, plus the rest of a list it starts or ends. Empty when the line only
// mentions places ("customers in the UK").
export function restrictedPlaces(
  line: string,
  found: FoundPlace[] = findPlaces(line),
  options: { field?: boolean } = {},
): Place[] {
  if (found.length === 0) return [];
  // A post line must be about hiring or the job; a bare "US only." is short enough to count.
  if (!options.field && line.length > 30 && !ABOUT_THE_JOB.test(line)) return [];
  if (STRONG_RULE.test(line)) return found.map((spot) => spot.place);
  // "The salary range for US-based candidates is $150k": pay by place, not who may apply.
  if (!options.field && PAY.test(line) && !/\bonly\b/i.test(line)) return [];
  const marks = found.map((spot) => cuedAt(line, spot));
  // Forward then back, so a cue at either end of a list covers all of it.
  for (const step of [1, -1]) {
    const start = step === 1 ? 1 : found.length - 2;
    for (let i = start; i >= 0 && i < found.length; i += step) {
      const a = found[Math.min(i, i - step)];
      const b = found[Math.max(i, i - step)];
      if (a && b && !marks[i] && marks[i - step] && joined(line, a, b)) marks[i] = true;
    }
  }
  return found.filter((_, i) => marks[i]).map((spot) => spot.place);
}
