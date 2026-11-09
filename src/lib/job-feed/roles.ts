import type { RoleFamily, Seniority } from "./types";

// Client-safe and pure. What kind of role a job title names and how senior it is, for both job
// posts and the titles on a resume, so the two are read by the same rules.

// First match wins, so the narrower kinds go first: "Product Designer" is design, "Product
// Marketing Manager" is marketing, "Sales Engineer" is sales, "Data Engineer" is data.
const FAMILY_RULES: readonly (readonly [RoleFamily, RegExp])[] = [
  ["design", /\b(?:designer|design (?:lead|manager|director)|ux|ui\/ux|user research(?:er)?|design researcher|illustrator|art director)\b/],
  ["marketing", /\b(?:marketing|marketer|growth (?:manager|lead|marketer)|seo|sem|content (?:writer|strategist|lead|manager|designer)|copywriter|brand (?:manager|lead|strategist)|communications|social media|demand gen\w*|lifecycle|pr manager)\b/],
  ["sales", /\b(?:sales|account (?:executive|manager)|ae|sdr|bdr|business development|account director|partnerships?|revenue|go[- ]to[- ]market|gtm)\b/],
  ["data", /\b(?:data (?:scientist|science|analyst|analytics|engineer(?:ing)?|architect)|analytics|machine learning|ml(?:ops)? engineer|ai engineer|research scientist|applied scientist|statistician|business intelligence|bi (?:analyst|developer|engineer)|quantitative|quant)\b/],
  ["product", /\b(?:product (?:manager|owner|lead|director|management)|pm|head of product|vp,? product|chief product)\b/],
  ["support", /\b(?:support|customer success|customer experience|success manager|implementation (?:manager|specialist|consultant)|onboarding|technical account manager|help ?desk|service desk)\b/],
  ["people", /\b(?:recruit(?:er|ing|ment)|talent|people (?:partner|operations|ops|team|business partner)|hr|human resources|sourcer)\b/],
  ["finance", /\b(?:finance|financial|accountant|accounting|controller|fp&a|tax|payroll|treasury|audit(?:or)?|bookkeep\w*|billing specialist)\b/],
  ["legal", /\b(?:counsel|legal|lawyer|attorney|paralegal|compliance|privacy officer)\b/],
  ["engineering", /\b(?:engineer(?:ing)?|developer|programmer|swe|sde|sre|devops|architect|full[- ]?stack|front[- ]?end|back[- ]?end|mobile|ios|android|qa|tester|test automation|cto|tech lead|technical lead)\b/],
  ["operations", /\b(?:operations|ops|program manager|project manager|chief of staff|strategy|business analyst|office manager|executive assistant|coordinator|administrator)\b/],
  // Broad words last, once nothing narrower matched.
  ["marketing", /\b(?:ads|paid media|media buyer|campaigns?)\b/],
  ["people", /\b(?:benefits|compensation|workplace)\b/],
  ["sales", /\b(?:relationship manager|country manager|account lead)\b/],
  ["data", /\b(?:analyst|data manager)\b/],
];

/** The kind of role, or null when the title doesn't say ("Founder", "Generalist"). */
export function roleFamily(title: string): RoleFamily | null {
  const text = title.toLowerCase();
  for (const [family, rule] of FAMILY_RULES) if (rule.test(text)) return family;
  return null;
}

const DIRECTOR =
  /\b(?:director|head of|vp|vice president|chief|cto|ceo|coo|cfo|cmo|cpo|founding (?:lead|head))\b/;
// "Product Manager" and "Account Manager" are individual roles; these managers run a team.
const PEOPLE_MANAGER =
  /\b(?:engineering|design|sales|support|recruiting|people|team|group|qa|security) manager\b|\bmanager,? (?:engineering|software|design)\b/;
const LEAD = /\b(?:staff|principal|lead|architect|distinguished|fellow|group product manager|tech lead)\b/;
const SENIOR = /\b(?:senior|sr\.?|snr|iii|iv|level 3)\b/;
const JUNIOR = /\b(?:junior|jr\.?|entry[- ]level|graduate|grad|new grad|associate|apprentice|trainee|i|level 1)\b/;
const INTERN = /\b(?:intern|internship|co-?op|working student|placement student)\b/;

/** How senior a title reads. A title with no marker is mid level. */
export function seniorityOf(title: string): Seniority {
  // Roman numerals are only levels at the end ("Engineer II"), never inside ("Phase I trial").
  const text = title.toLowerCase().replace(/[(),]/g, " ");
  if (INTERN.test(text)) return "intern";
  if (DIRECTOR.test(text)) return "director";
  if (LEAD.test(text) || PEOPLE_MANAGER.test(text)) return "lead";
  if (SENIOR.test(text)) return "senior";
  // "Associate Director" was caught above; "Associate Product Manager" is entry level.
  if (JUNIOR.test(text.replace(/\bi\b(?!\s*$)/g, ""))) return "junior";
  return "mid";
}

export const SENIORITY_RANK: Record<Seniority, number> = {
  intern: 0,
  junior: 1,
  mid: 2,
  senior: 3,
  lead: 4,
  director: 5,
};

/** The level years of experience usually reach, for resumes whose titles don't say. */
export function seniorityForYears(years: number): Seniority {
  if (years < 2) return "junior";
  if (years < 5) return "mid";
  return "senior";
}

const YEARS =
  /\b(?:at least|minimum(?: of)?|min\.?)?\s*(\d{1,2})\s*(?:\+|plus)?\s*(?:(?:-|–|to)\s*\d{1,2}\s*)?(?:\+\s*)?(?:years?|yrs?)\b(?:\s+of)?(?:\s+[\w/&+.-]+){0,5}?\s+(?:experience|exp\b)/gi;

/**
 * The fewest years of experience the post asks for ("5+ years of experience", "3-5 years of
 * professional experience"), or null when it names none. The smallest number wins, so a "nice to
 * have 8 years" line doesn't raise the bar.
 */
export function minYearsOf(text: string): number | null {
  let min: number | null = null;
  for (const match of text.matchAll(YEARS)) {
    const years = Number(match[1]);
    if (years >= 1 && years <= 20 && (min === null || years < min)) min = years;
  }
  return min;
}
