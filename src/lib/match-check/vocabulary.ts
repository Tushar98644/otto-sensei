import { COMMON_SKILLS, EXACT_CASE_SKILLS } from "@/lib/ai/tailor-vocabulary";
import { findSkills, SKILL_LABELS } from "@/lib/job-feed/skills";
import { ACRONYMS } from "@/lib/tailor/acronyms";
import { isPlausible, termKey } from "@/lib/tailor/keywords";
import { textTokens } from "@/lib/tailor/tokens";

const LANGUAGES: readonly string[] = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Dutch",
  "Polish",
  "Swedish",
  "Danish",
  "Norwegian",
  "Finnish",
  "Czech",
  "Greek",
  "Turkish",
  "Russian",
  "Ukrainian",
  "Arabic",
  "Hebrew",
  "Hindi",
  "Japanese",
  "Korean",
  "Mandarin",
  "Cantonese",
  "Vietnamese",
  "Thai",
  "Indonesian",
];

type Extra = { label: string; forms?: readonly string[]; exact?: boolean; language?: boolean };

// Unambiguous skills, tools and licences the job feed's vocabulary doesn't cover, so non-tech posts get read too.
const EXTRA: readonly Extra[] = [
  { label: "Patient care" },
  { label: "Cerner" },
  { label: "CPR", exact: true },
  { label: "First aid" },
  { label: "Phlebotomy" },
  { label: "Medication administration" },
  { label: "Cash handling" },
  { label: "Point of sale", forms: ["POS system", "POS systems"] },
  { label: "Food safety" },
  { label: "Visual merchandising" },
  { label: "Stock control" },
  { label: "Microsoft Word", forms: ["MS Word"] },
  { label: "Calendar management" },
  { label: "Minute taking", forms: ["Minute-taking"] },
  { label: "AutoCAD" },
  { label: "SolidWorks" },
  { label: "Revit" },
  { label: "ArcGIS" },
  { label: "QGIS" },
  { label: "GIS", exact: true },
  { label: "BIM", exact: true },
  { label: "Canva" },
  { label: "Blender", exact: true },
  { label: "Unreal Engine" },
  { label: "Premiere Pro", forms: ["Adobe Premiere"] },
  { label: "Final Cut Pro" },
  { label: "Lightroom" },
  { label: "Adobe Creative Cloud", forms: ["Adobe Creative Suite"] },
  { label: "Stata" },
  { label: "Alteryx" },
  { label: "VBA", exact: true },
  { label: "Power Query" },
  { label: "Power Automate" },
  { label: "SharePoint" },
  { label: "ServiceNow" },
  { label: "Trello" },
  { label: "Miro", exact: true },
  { label: "Shopify" },
  { label: "WordPress" },
  { label: "Business development" },
  { label: "Change management" },
  { label: "Risk management" },
  { label: "Vendor management" },
  { label: "Contract management" },
  { label: "Event planning", forms: ["Event management"] },
  { label: "Market research" },
  { label: "Public relations" },
  { label: "Community management" },
  { label: "Pipeline management" },
  { label: "Customer support" },
  { label: "Technical support" },
  { label: "Help desk", forms: ["Helpdesk", "Service desk"] },
  { label: "Talent acquisition" },
  { label: "Employee relations" },
  { label: "Performance management" },
  { label: "Lesson planning" },
  { label: "Curriculum development", forms: ["Curriculum design"] },
  { label: "Classroom management" },
  { label: "Warehouse management" },
  { label: "Quality control" },
  { label: "Root cause analysis" },
  { label: "Preventive maintenance", forms: ["Preventative maintenance"] },
  { label: "GMP", exact: true },
  { label: "HACCP", exact: true },
  { label: "ISO 9001" },
  { label: "Kaizen" },
  { label: "PLC", exact: true },
  { label: "Forklift" },
  ...LANGUAGES.map((label): Extra => ({ label, exact: true, language: true })),
];

// Too often about the company rather than the candidate, or covered by a vocabulary entry.
const SKIPPED: ReadonlySet<string> = new Set(
  [
    "AI",
    "B2B",
    "B2C",
    "SaaS",
    "REST API",
    "CAD",
    "HR",
    "ROI",
    "KPI",
    "SLA",
    "SOP",
    "OKR",
    "ARR",
    "MRR",
  ].map(termKey),
);

const LANGUAGE_CONTEXT =
  /\b(?:fluen\w*|native|speak\w*|spoken|written|bilingual|languages?|proficien\w*|business[- ]level|mother tongue|[ABC][12])\b/i;
const LANGUAGE_NAMES = new RegExp(`\\b(?:${LANGUAGES.join("|")})\\b`, "g");
const LANGUAGE_FILLER =
  /\b(?:is|are|a|an|and|or|also|big|huge|plus|bonus|required|preferred|nice|to|have|having|essential|advantage|must|would|be|great|ideally|knowledge|of|skills?)\b/gi;

const LANGUAGE_NAME = new RegExp(LANGUAGE_NAMES.source);

export function namesLanguage(text: string): boolean {
  return LANGUAGE_NAME.test(text);
}

// "German is a plus" names the language; "German market experience" doesn't.
function aboutLanguage(clause: string): boolean {
  if (LANGUAGE_CONTEXT.test(clause)) return true;
  const rest = clause.replace(LANGUAGE_NAMES, " ").replace(LANGUAGE_FILLER, " ");
  return !/\p{L}/u.test(rest);
}

export type Candidate = {
  label: string;
  terms: readonly string[];
  spellings: readonly string[];
  exact: boolean;
  language: boolean;
};

const VOCABULARY_KEYS: ReadonlySet<string> = new Set([...SKILL_LABELS].map(termKey));

// A single word the job feed reads (Golang, Tailwind) is left to it; a longer phrase that only contains one (SQL Server) is not.
function inVocabulary(spelling: string): boolean {
  if (VOCABULARY_KEYS.has(termKey(spelling))) return true;
  return !/\s/.test(spelling.trim()) && findSkills(spelling).length > 0;
}

const OTHER_FORM = new Map<string, readonly string[]>(
  ACRONYMS.flatMap(([short, long]) => [
    [termKey(short), [short, long]],
    [termKey(long), [short, long]],
  ]),
);

export function acronymForms(label: string): readonly string[] {
  return OTHER_FORM.get(termKey(label)) ?? [];
}

function buildCandidates(): Map<string, Candidate> {
  const byKey = new Map<string, Candidate>();
  const add = (candidate: Candidate) => {
    for (const spelling of candidate.spellings) {
      const key = termKey(spelling);
      if (!key || SKIPPED.has(key) || byKey.has(key) || inVocabulary(spelling)) continue;
      byKey.set(key, candidate);
    }
  };
  for (const extra of EXTRA) {
    const spellings = [extra.label, ...(extra.forms ?? [])];
    add({
      label: extra.label,
      terms: spellings,
      spellings,
      exact: extra.exact === true,
      language: extra.language === true,
    });
  }
  for (const [short, long] of ACRONYMS) {
    if (SKIPPED.has(termKey(short))) continue;
    add({ label: short, terms: [short, long], spellings: [short], exact: true, language: false });
    add({ label: short, terms: [short, long], spellings: [long], exact: false, language: false });
  }
  for (const skill of COMMON_SKILLS) {
    add({
      label: skill,
      terms: [skill],
      spellings: [skill],
      exact: EXACT_CASE_SKILLS.has(skill),
      language: false,
    });
  }
  return byKey;
}

let candidates: Map<string, Candidate> | null = null;
let longest = 1;

function candidateMap(): Map<string, Candidate> {
  if (candidates) return candidates;
  candidates = buildCandidates();
  for (const key of candidates.keys()) longest = Math.max(longest, key.length);
  return candidates;
}

function spelledRight(span: string, candidate: Candidate): boolean {
  if (!candidate.exact) return true;
  return candidate.spellings.some((spelling) => span === spelling || span === `${spelling}s`);
}

export function findCandidates(clause: string): Candidate[] {
  const map = candidateMap();
  const tokens = textTokens(clause);
  const found: Candidate[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const first = tokens[i]!;
    if ((tokens[i - 1]?.end ?? -1) > first.start) continue;
    let squashed = "";
    for (let j = i; j < tokens.length; j++) {
      const token = tokens[j]!;
      if (j > i && !token.joined) break;
      squashed += token.value;
      if (squashed.length > longest) break;
      if ((tokens[j + 1]?.start ?? Number.POSITIVE_INFINITY) < token.end) continue;
      const candidate = map.get(squashed);
      if (!candidate || found.includes(candidate)) continue;
      const span = clause.slice(first.start, token.end);
      if (!isPlausible(clause, first.start, token.end, candidate.label)) continue;
      if (!spelledRight(span, candidate)) continue;
      if (candidate.language && !aboutLanguage(clause)) continue;
      found.push(candidate);
    }
  }
  return found;
}

// Distinct skills, so BLS and "basic life support" count once.
export function candidateCount(): number {
  const labels = [...candidateMap().values()].map((candidate) => termKey(candidate.label));
  return new Set([...labels, ...VOCABULARY_KEYS]).size;
}
