import type { RoleFamily, Seniority } from "./types";

const FAMILY_RULES: readonly (readonly [RoleFamily, RegExp])[] = [
  [
    "design",
    /\b(?:designer|design (?:lead|manager|director)|ux|ui\/ux|user research(?:er)?|design researcher|illustrator|art director)\b/,
  ],
  [
    "marketing",
    /\b(?:marketing|marketer|growth (?:manager|lead|marketer)|seo|sem|content (?:writer|strategist|lead|manager|designer)|copywriter|brand (?:manager|lead|strategist)|communications|social media|demand gen\w*|lifecycle|pr manager)\b/,
  ],
  [
    "sales",
    /\b(?:sales|account (?:executive|manager)|ae|sdr|bdr|business development|account director|partnerships?|revenue|go[- ]to[- ]market|gtm)\b/,
  ],
  [
    "data",
    /\b(?:data (?:scientist|science|analyst|analytics|engineer(?:ing)?|architect)|analytics|machine learning|ml(?:ops)? engineer|ai engineer|research scientist|applied scientist|statistician|business intelligence|bi (?:analyst|developer|engineer)|quantitative|quant)\b/,
  ],
  [
    "product",
    /\b(?:product (?:manager|owner|lead|director|management)|pm|head of product|vp,? product|chief product)\b/,
  ],
  [
    "support",
    /\b(?:support|customer success|customer experience|success manager|implementation (?:manager|specialist|consultant)|onboarding|technical account manager|help ?desk|service desk)\b/,
  ],
  [
    "people",
    /\b(?:recruit(?:er|ing|ment)|talent|people (?:partner|operations|ops|team|business partner)|hr|human resources|sourcer)\b/,
  ],
  [
    "finance",
    /\b(?:finance|financial|accountant|accounting|controller|fp&a|tax|payroll|treasury|audit(?:or)?|bookkeep\w*|billing specialist|accounts? (?:payable|receivable)|equity administration|stock (?:plan|administration)|credit analyst|underwrit\w*)\b/,
  ],
  [
    "legal",
    /\b(?:counsel|legal|lawyer|attorney|paralegal|compliance|privacy officer|kyc|aml|sanctions)\b/,
  ],
  [
    "engineering",
    /\b(?:engineer(?:ing)?|developer|programmer|swe|sde|sre|devops|architect|full[- ]?stack|front[- ]?end|back[- ]?end|mobile|ios|android|qa|tester|test automation|cto|tech lead|technical lead)\b/,
  ],
  [
    "operations",
    /\b(?:operations|ops|program manager|project manager|chief of staff|strategy|business analyst|office manager|executive assistant|coordinator|administrator)\b/,
  ],
  ["marketing", /\b(?:ads|paid media|media buyer|campaigns?)\b/],
  ["people", /\b(?:benefits|compensation|workplace)\b/],
  ["sales", /\b(?:relationship manager|country manager|account lead)\b/],
  ["data", /\b(?:analyst|data manager)\b/],
];

export function roleFamily(title: string): RoleFamily | null {
  const text = title.toLowerCase();
  for (const [family, rule] of FAMILY_RULES) if (rule.test(text)) return family;
  return null;
}

const OFFICE = [
  "11-",
  "13-",
  "15-",
  "19-3",
  "23-",
  "27-1",
  "27-3",
  "41-1012",
  "41-3",
  "41-4",
  "41-9",
  "41-X",
  "43-",
];
const FAMILY_OCCUPATIONS: Record<RoleFamily, readonly string[]> = {
  engineering: ["15-", "17-2061", "17-2072", "11-3021", "11-9041"],
  data: OFFICE,
  design: [...OFFICE, "27-4"],
  product: OFFICE,
  marketing: [...OFFICE, "27-4"],
  sales: OFFICE,
  support: OFFICE,
  operations: OFFICE,
  people: OFFICE,
  finance: OFFICE,
  legal: OFFICE,
};

export function familyFits(family: RoleFamily, occupation: string | null): boolean {
  if (occupation === null) return true;
  return FAMILY_OCCUPATIONS[family].some((prefix) => occupation.startsWith(prefix));
}

const PICKED_KIND: Record<RoleFamily, readonly string[]> = {
  engineering: ["15-1", "17-2061", "17-2072", "11-3021", "11-9041"],
  data: ["15-2", "15-1221", "15-124", "13-1161"],
  design: ["27-1", "15-1255"],
  product: ["11-X101", "15-1299.09"],
  marketing: ["11-2011", "11-2021", "11-2032", "11-2033", "27-3"],
  sales: ["41-1012", "41-3", "41-4", "41-9", "41-X102", "11-2022"],
  support: ["43-4", "15-123", "41-X101"],
  operations: ["11-1", "13-1082", "13-1111", "13-1199", "43-6", "43-1011"],
  people: ["13-107", "13-114", "13-1151", "11-31"],
  finance: ["13-2", "11-3031", "43-3"],
  legal: ["23-", "13-1041", "11-9199.02"],
};

const FAMILY_ORDER: readonly RoleFamily[] = [
  "product",
  "design",
  "people",
  "legal",
  "engineering",
  "data",
  "support",
  "marketing",
  "sales",
  "finance",
  "operations",
];

export function familyOfOccupation(occupation: string): RoleFamily | null {
  return (
    FAMILY_ORDER.find((family) =>
      PICKED_KIND[family].some((prefix) => occupation.startsWith(prefix)),
    ) ?? null
  );
}

const DIRECTOR =
  /\b(?:director|head of|vp|vice president|chief|cto|ceo|coo|cfo|cmo|cpo|founding (?:lead|head))\b/;
const PEOPLE_MANAGER =
  /\b(?:engineering|design|sales|support|recruiting|people|team|group|qa|security|sales development|customer success) manager\b|\bmanager(?: i{1,3})?,? (?:engineering|software|design|sales|sales development|commercial sales|customer success|support|solutions engineering)\b/;
const LEAD =
  /\b(?:staff|principal|lead|architect|distinguished|fellow|group product manager|tech lead)\b/;
const SENIOR = /\b(?:senior|sr\.?|snr|iii|iv|level 3)\b/;
const JUNIOR =
  /\b(?:junior|jr\.?|entry[- ]level|graduate|grad|new grad|associate|apprentice|trainee|i|level 1)\b/;
const INTERN = /\b(?:intern|internship|co-?op|working student|placement student)\b/;

export function seniorityOf(title: string): Seniority {
  const text = title
    .toLowerCase()
    .replace(/\s*[(),]\s*/g, " ")
    .trim();
  if (INTERN.test(text)) return "intern";
  if (DIRECTOR.test(text)) return "director";
  if (LEAD.test(text) || PEOPLE_MANAGER.test(text)) return "lead";
  if (SENIOR.test(text)) return "senior";
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

export function seniorityForYears(years: number): Seniority {
  if (years < 2) return "junior";
  if (years < 5) return "mid";
  return "senior";
}

const YEARS =
  /\b(?:at least|minimum(?: of)?|min\.?)?\s*(\d{1,2})\s*(?:\+|plus)?\s*(?:(?:-|–|to)\s*\d{1,2}\s*)?(?:\+\s*)?(?:years?|yrs?)\b(?:\s+of)?(?:\s+[\w/&+.-]+){0,5}?\s+(?:experience|exp\b)/gi;

export function minYearsOf(text: string): number | null {
  let min: number | null = null;
  for (const match of text.matchAll(YEARS)) {
    const years = Number(match[1]);
    if (years >= 1 && years <= 20 && (min === null || years < min)) min = years;
  }
  return min;
}
