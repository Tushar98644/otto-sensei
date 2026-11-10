import { foldCase } from "@/lib/tailor/tokens";

// Pure. Job titles as the occupation lookup reads them: the parts a title is made of ("Registered
// Nurse - ICU - Nights" is three), each as canonical words. The same rules turn the taxonomy's own
// titles into lookup keys at build time (scripts/occupations-build.ts), so a key and a title only
// have to agree with each other, not be good English: "nurses" and "nurse" both become "nurse",
// "labourer" becomes "laborer".

// British, Australian and Canadian spellings to the US ones the O*NET titles use. ESCO's labels
// are British English, so both sides of the lookup meet here.
const SPELLING: Record<string, string> = {
  labour: "labor",
  labourer: "laborer",
  centre: "center",
  organisation: "organization",
  organisational: "organizational",
  programme: "program",
  colour: "color",
  specialised: "specialized",
  analyse: "analyze",
  paediatric: "pediatric",
  paediatrics: "pediatrics",
  orthopaedic: "orthopedic",
  anaesthetist: "anesthetist",
  anaesthetic: "anesthetic",
  anaesthesia: "anesthesia",
  haematology: "hematology",
  gynaecology: "gynecology",
  oesophageal: "esophageal",
  maths: "math",
  defence: "defense",
  licence: "license",
  licenced: "licensed",
  practise: "practice",
  cheque: "check",
  tyre: "tire",
  aluminium: "aluminum",
  mould: "mold",
  moulder: "molder",
  jewellery: "jewelry",
  jeweller: "jeweler",
  catalogue: "catalog",
  travelling: "traveling",
  modelling: "modeling",
  counsellor: "counselor",
  counselling: "counseling",
  behaviour: "behavior",
  behavioural: "behavioral",
  neighbourhood: "neighborhood",
  enrolment: "enrollment",
  fulfilment: "fulfillment",
  storey: "story",
  plough: "plow",
  grey: "gray",
  draughtsman: "draftsman",
  draughtsperson: "drafter",
  theatre: "theater",
  litre: "liter",
  metre: "meter",
  kerb: "curb",
  aeroplane: "airplane",
  aeronautical: "aeronautical",
  manoeuvre: "maneuver",
  ageing: "aging",
  cosy: "cozy",
  sceptic: "skeptic",
};

// Shorthand job ads use for whole words. Kept to forms that mean one thing in a title.
const SHORTHAND: Record<string, string[]> = {
  mgr: ["manager"],
  mngr: ["manager"],
  asst: ["assistant"],
  assoc: ["associate"],
  coord: ["coordinator"],
  rep: ["representative"],
  reps: ["representative"],
  engr: ["engineer"],
  dev: ["developer"],
  devs: ["developer"],
  supv: ["supervisor"],
  supvr: ["supervisor"],
  exec: ["executive"],
  dept: ["department"],
  svc: ["service"],
  svcs: ["service"],
  ops: ["operation"],
  hgv: ["heavy", "goods", "vehicle"],
  lgv: ["large", "goods", "vehicle"],
  lorry: ["truck"],
  // UK and Australian titles: an "operative" is a worker, a "carer" a caregiver.
  operative: ["worker"],
  carer: ["caregiver"],
};

// Shorthand that depends on where it stands: "Pharmacy Tech" is a technician, "Tech Lead" isn't;
// "Admin Assistant" is administrative, "Office Admin" an administrator.
const SHORTHAND_LAST: Record<string, string> = {
  tech: "technician",
  techs: "technician",
  admin: "administrator",
};
const SHORTHAND_INNER: Record<string, string> = { admin: "administrative" };

// Hours, contract, hiring words and places of work: never what the job is. Matched as phrases on
// the folded title first, then as single words. Seniority words stay: "Staff Nurse", "Head Chef"
// and "Senior Accountant" are titles in their own right, and the longest-match lookup steps over
// them when they aren't. Words that are also jobs stay too: "Night Auditor", "Bank Teller", "Site
// Manager", "Contract Specialist", "Home Health Aide".
const NOISE_PHRASES =
  /\b(?:(?:full|part)[\s-]?time|per[\s-]?diem|work(?:ing)? (?:from|at) home|home[\s-]?based|sign[\s-]?on(?: bonus)?|(?:day|night|evening|weekend|swing|rotating|overnight|early|late|split) shifts?|fixed[\s-]?term|on[\s-]?site|in[\s-]?office|up to \S+|\d+(?:\.\d+)?\s*(?:k|hrs?|hours?)\b|all genders?)\b/g;
const NOISE = new Set(
  (
    "ft pt fte prn perm permanent temporary temp casual seasonal locum hourly salaried " +
    "shifts nights nightshift weekends evenings overnight remote hybrid onsite wfh urgent urgently " +
    "immediate immediately hiring asap needed wanted opening openings multiple various vacancy " +
    "vacancies position positions opportunity opportunities bonus incentive usd gbp eur aud cad " +
    "m w d f x h mwd fmx fmd mfd mfx wmd " +
    // Status, not the job: "Software Engineering Intern" is software engineering, "Graduate
    // Nurse" a nurse, "Apprentice Electrician" an electrician. Seniority reads them separately.
    "intern interns internship internships coop co op working student summer winter autumn " +
    "apprentice apprenticeship trainee graduate grad fellowship " +
    // Levels written as Roman numerals: "Staff Accountant II".
    "i ii iii iv"
  ).split(" "),
);

// Codes and numbers in a title: requisition ids, store numbers, levels written as digits.
const CODE = /^(?:[a-z]*\d[\da-z]*|\d+)$/;

// One word that names a dozen kinds of work, or a status rather than a job: never a lookup key
// alone ("Manager", "Engineer", "Intern"). It still ends longer keys ("Software Engineer").
export const GENERIC_WORDS: ReadonlySet<string> = new Set(
  (
    "engineer manager director operator technician specialist coordinator officer consultant " +
    "worker associate assistant aide analyst administrator agent advisor adviser supervisor " +
    "representative executive lead leader head chief partner owner intern internship resident " +
    "fellow fellowship trainee apprentice graduate student volunteer member professional expert " +
    "planner designer developer architect scientist researcher inspector installer mechanic " +
    "laborer helper attendant handler examiner tester technologist writer producer coach trainer " +
    "instructor counselor therapist clerk fitter maker setter tender cutter processor " +
    "controller monitor keeper master captain boss foreman superintendent liaison provider " +
    "contractor official investigator collector checker principal president management " +
    "intelligence advocate delegate staff team crew support service operation sale " +
    "generalist ambassador host senior junior"
  ).split(" "),
);

// Rank words a taxonomy name may start with: "Senior Data Analyst" is O*NET's name for an office
// supervisor, but a title saying it means a data analyst at the senior level.
export const RANK_WORDS: ReadonlySet<string> = new Set(
  "senior sr junior jr lead principal staff chief head associate assistant director".split(" "),
);

/** One word as the lookup compares it: folded, US spelling, consistent singular. */
export function canonicalWord(word: string): string {
  const us = SPELLING[word] ?? word;
  return singular(us);
}

// Consistent rather than correct: "nurses" -> "nurse", "secretaries" -> "secretary",
// "waitresses" -> "waitress", "sales" -> "sale". Applied to both sides, so only agreement matters.
function singular(word: string): string {
  if (word.length < 4 || !/^[a-z]+$/.test(word)) return word;
  if (/(?:ss|us|is|ics)$/.test(word)) return word;
  if (word.endsWith("sses")) return word.slice(0, -2);
  if (/(?:ches|shes|xes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("persons")) return word.slice(0, -1);
  return word.endsWith("s") ? word.slice(0, -1) : word;
}

/** Canonical words of one piece of text: for taxonomy titles, which carry no noise. */
export function titleWords(text: string, { dropNoise = false } = {}): string[] {
  let folded = foldCase(decode(text))
    .replace(/['’]s\b/g, "")
    // Rank words for "director" in what the job is: seniority reads them from the raw title.
    .replace(
      /\b(?:senior |executive |regional |area |group )?vice president\b|\b[searg]?vp\b|\bhead of\b/g,
      (m) => (m.endsWith("of") ? "director of" : "director"),
    );
  if (dropNoise) folded = folded.replace(NOISE_PHRASES, " ");
  // "Nurse (RN)" and "Nurse - RN" read alike; "C++" and "C#" keep their marks.
  const raw = folded
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#]+/g, " ")
    .split(" ")
    .filter((word) => word && !(dropNoise && (NOISE.has(word) || CODE.test(word))));
  const out: string[] = [];
  raw.forEach((word, index) => {
    const positional = index === raw.length - 1 ? SHORTHAND_LAST[word] : SHORTHAND_INNER[word];
    if (positional) out.push(positional);
    else if (SHORTHAND[word]) out.push(...SHORTHAND[word]);
    else out.push(canonicalWord(word));
  });
  return out;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&nbsp;": " ",
  "&#39;": "'",
  "&quot;": '"',
  "&lt;": "<",
  "&gt;": ">",
};

// Some boards send titles HTML-escaped: "Scheduling &amp; Reservations".
function decode(text: string): string {
  return text.replace(/&(?:amp|nbsp|#39|quot|lt|gt);/g, (entity) => ENTITIES[entity] ?? entity);
}

// What divides a title into parts: dashes and bars with spaces around them, commas, colons,
// brackets, and slashes with spaces. "Cook/Prep" keeps its slash; "Cook / Dishwasher" is two parts.
const SPLIT = /\s+[-–—|/•·]+\s+|\s*[,;:|•·]\s*|\s*[()[\]{}]\s*|\s+[-–—]|[-–—]\s+/u;
// Gender markers German, French and Dutch ads add: "(m/w/d)", "(f/h)", "(all genders)".
const GENDER = /\(\s*(?:[mwfdhx]\s*\/\s*)+[mwfdhx]\s*\)|\(\s*all genders?\s*\)/giu;

/**
 * The parts of a job title, in order, each as canonical words with noise left out. Brackets are
 * their own part: "Nurse (Night Shift)" -> [["nurse"]], "Manager, Sales" -> [["manager"], ["sale"]].
 */
export function titleParts(title: string): string[][] {
  const text = decode(title).replace(GENDER, " ");
  const parts: string[][] = [];
  for (const piece of text.split(SPLIT)) {
    const words = titleWords(piece, { dropNoise: true });
    if (words.length > 0) parts.push(words);
  }
  return parts;
}

/** A title (or a taxonomy label) as one lookup key: "Registered Nurses" -> "registered nurse". */
export function titleKey(title: string): string {
  return titleWords(title).join(" ");
}
