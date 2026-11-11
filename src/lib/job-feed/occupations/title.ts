import { foldCase } from "@/lib/tailor/tokens";

// scripts/occupations-build.ts builds data.json's keys with these rules: re-run it after edits.

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
  operative: ["worker"],
  carer: ["caregiver"],
};

const SHORTHAND_LAST: Record<string, string> = {
  tech: "technician",
  techs: "technician",
  admin: "administrator",
};
const SHORTHAND_INNER: Record<string, string> = { admin: "administrative" };

const NOISE_PHRASES =
  /\b(?:(?:full|part)[\s-]?time|per[\s-]?diem|work(?:ing)? (?:from|at) home|home[\s-]?based|sign[\s-]?on(?: bonus)?|(?:day|night|evening|weekend|swing|rotating|overnight|early|late|split) shifts?|fixed[\s-]?term|on[\s-]?site|in[\s-]?office|up to \S+|\d+(?:\.\d+)?\s*(?:k|hrs?|hours?)\b|all genders?)\b/g;
const NOISE = new Set(
  (
    "ft pt fte prn perm permanent temporary temp casual seasonal locum hourly salaried " +
    "shifts nights nightshift weekends evenings overnight remote hybrid onsite wfh urgent urgently " +
    "immediate immediately hiring asap needed wanted opening openings multiple various vacancy " +
    "vacancies position positions opportunity opportunities bonus incentive usd gbp eur aud cad " +
    "m w d f x h mwd fmx fmd mfd mfx wmd " +
    "intern interns internship internships coop co op working student summer winter autumn " +
    "apprentice apprenticeship trainee graduate grad fellowship " +
    "i ii iii iv"
  ).split(" "),
);

const CODE = /^(?:[a-z]*\d[\da-z]*|\d+)$/;

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

export const RANK_WORDS: ReadonlySet<string> = new Set(
  "senior sr junior jr lead principal staff chief head associate assistant director".split(" "),
);

export function canonicalWord(word: string): string {
  const us = SPELLING[word] ?? word;
  return singular(us);
}

function singular(word: string): string {
  if (word.length < 4 || !/^[a-z]+$/.test(word)) return word;
  if (/(?:ss|us|is|ics)$/.test(word)) return word;
  if (word.endsWith("sses")) return word.slice(0, -2);
  if (/(?:ches|shes|xes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("persons")) return word.slice(0, -1);
  return word.endsWith("s") ? word.slice(0, -1) : word;
}

export function titleWords(text: string, { dropNoise = false } = {}): string[] {
  let folded = foldCase(decode(text))
    .replace(/['’]s\b/g, "")
    .replace(
      /\b(?:senior |executive |regional |area |group )?vice president\b|\b[searg]?vp\b|\bhead of\b/g,
      (m) => (m.endsWith("of") ? "director of" : "director"),
    );
  if (dropNoise) folded = folded.replace(NOISE_PHRASES, " ");
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

function decode(text: string): string {
  return text.replace(/&(?:amp|nbsp|#39|quot|lt|gt);/g, (entity) => ENTITIES[entity] ?? entity);
}

const SPLIT = /\s+[-–—|/•·]+\s+|\s*[,;:|•·]\s*|\s*[()[\]{}]\s*|\s+[-–—]|[-–—]\s+/u;
const GENDER = /\(\s*(?:[mwfdhx]\s*\/\s*)+[mwfdhx]\s*\)|\(\s*all genders?\s*\)/giu;

export function titleParts(title: string): string[][] {
  const text = decode(title).replace(GENDER, " ");
  const parts: string[][] = [];
  for (const piece of text.split(SPLIT)) {
    const words = titleWords(piece, { dropNoise: true });
    if (words.length > 0) parts.push(words);
  }
  return parts;
}

export function titleKey(title: string): string {
  return titleWords(title).join(" ");
}
