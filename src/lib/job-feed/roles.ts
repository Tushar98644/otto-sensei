import { englishTitle } from "./occupations/translate";
import type { RoleFamily, Seniority } from "./types";

// The role is the title's first part with a named kind ("Software Engineer, Compliance" is engineering).
const FAMILY_RULES: readonly (readonly [RoleFamily, RegExp])[] = [
  [
    "design",
    /\b(?:designer|design (?:lead|manager|director)|ux|ui\/ux|user research(?:er)?|design researcher|illustrator|art director)\b|^design$/g,
  ],
  [
    "marketing",
    /\b(?:marketing|marketer|growth (?:manager|lead|marketer)|seo|sem|content (?:writer|strategist|lead|manager|designer)|copywriter|brand (?:manager|lead|strategist)|communications|social media|demand gen\w*|lifecycle|pr manager)\b/g,
  ],
  [
    "sales",
    /\b(?:sales(?: engineer(?:ing)?)?|presales|pre-sales|account (?:executive|manager)|ae|sdr|bdr|business development|account director|partnerships?|revenue|go[- ]to[- ]market|gtm)\b/g,
  ],
  [
    "data",
    /\b(?:data (?:scientist|science|analyst|analytics|engineer(?:ing)?|architect)|analytics(?: engineer)?|machine learning(?: engineer(?:ing)?)?|(?:ml(?:ops)?|ai|ai\/ml|bi) engineer(?:ing)?|research scientist|applied scientist|statistician|business intelligence(?: developer| engineer)?|bi (?:analyst|developer)|quantitative|quant)\b/g,
  ],
  [
    "product",
    /\b(?:product (?:manager|owner|lead|director|management)|pm|head of product|vp,? product|chief product)\b|^product(?: management)?$/g,
  ],
  [
    "support",
    /\b(?:support(?: engineer| specialist| analyst| technician)?|customer success(?: engineer)?|customer experience|success manager|implementation (?:manager|specialist|consultant)|onboarding|technical account manager|help ?desk|service desk)\b/g,
  ],
  [
    "people",
    /\b(?:recruit(?:er|ing|ment)|talent|people (?:partner|operations|ops|team|business partner)|hr|human resources|sourcer)\b/g,
  ],
  [
    "finance",
    /\b(?:finance|financial|accountant|accounting|controller|fp&a|tax(?: compliance)?|payroll|treasury|audit(?:or)?|bookkeep\w*|billing specialist|accounts? (?:payable|receivable)|equity administration|stock (?:plan|administration)|credit analyst|underwrit\w*)\b/g,
  ],
  [
    "legal",
    /\b(?:counsel|legal(?: engineer(?:ing)?)?|lawyer|attorney|paralegal|compliance|privacy officer|kyc|aml|sanctions)\b/g,
  ],
  [
    "engineering",
    /\b(?:engineer(?:ing)?|developer|programmer|swe|sde|sre|devops|architect|full[- ]?stack|front[- ]?end|back[- ]?end|ios|android|qa|tester|test automation|cto|tech lead|technical lead|systems? administrator|sysadmin|database administrator)\b/g,
  ],
  ["operations", /\b(?:chief of staff|office manager|executive assistant)\b/g],
];

// Words that name a kind only when nothing more specific does ("Recruiting Coordinator" is people).
const GENERIC_RULES: readonly (readonly [RoleFamily, RegExp])[] = [
  [
    "operations",
    /\b(?:operations|ops|program manager|project manager|strategy|business analyst|coordinator|administrator)\b/g,
  ],
  ["marketing", /\b(?:ads|paid media|media buyer|campaigns?)\b/g],
  ["people", /\b(?:benefits|compensation|workplace)\b/g],
  ["sales", /\b(?:relationship manager|country manager|account lead)\b/g],
  ["data", /\b(?:analyst|data manager)\b/g],
];

const TITLE_PARTS = /\s+[-–—|@•·:]\s+|\s+at\s+|\s*@\s*|\s*[,;|[\]{}]\s*/;
const BRACKETED = /\(([^)]*)\)/g;

type Rules = readonly (readonly [RoleFamily, RegExp])[];

// Within a part the head noun wins ("Python Finance Developer" is engineering); a tie goes to the earlier rule.
function lastNamed(text: string, rules: Rules): RoleFamily | null {
  let best: { family: RoleFamily; end: number } | null = null;
  for (const [family, rule] of rules) {
    for (const match of text.matchAll(rule)) {
      const end = match.index + match[0].length;
      if (!best || end > best.end) best = { family, end };
    }
  }
  return best?.family ?? null;
}

// A title in another language is read in its English words first ("Gerente de Ventas").
export function roleFamily(title: string): RoleFamily | null {
  const english = englishTitle(title);
  return (english === title ? null : familyOf(english)) ?? familyOf(title);
}

function familyOf(title: string): RoleFamily | null {
  const text = title.toLowerCase();
  const asides = [...text.matchAll(BRACKETED)].map((match) => match[1]!);
  const parts = [...text.replace(BRACKETED, " ").split(TITLE_PARTS), ...asides]
    .map((part) => part.trim())
    .filter(Boolean);
  for (const part of parts) {
    const family = lastNamed(part, FAMILY_RULES);
    if (family) return family;
  }
  for (const [family, rule] of GENERIC_RULES) if (text.search(rule) !== -1) return family;
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

// Skills that point at one kind of role; the rest (Python, SQL, Excel, Jira) are shared by many.
export const SKILL_FAMILIES: Partial<Record<RoleFamily, readonly string[]>> = {
  engineering: [
    "Java",
    "JavaScript",
    "TypeScript",
    "Go",
    "Rust",
    "Ruby",
    "PHP",
    "Kotlin",
    "Swift",
    "Objective-C",
    "C",
    "C++",
    "C#",
    "Elixir",
    "Erlang",
    "Haskell",
    "Clojure",
    "OCaml",
    "Dart",
    "Elm",
    "Lua",
    "Perl",
    "Solidity",
    "Bash",
    "PowerShell",
    "React",
    "React Native",
    "Next.js",
    "Vue",
    "Nuxt",
    "Angular",
    "Svelte",
    "Redux",
    "Webpack",
    "Vite",
    "HTML",
    "CSS",
    "Sass",
    "Tailwind CSS",
    "Storybook",
    "Jest",
    "Cypress",
    "Playwright",
    "Selenium",
    "Three.js",
    "WebGL",
    "WebAssembly",
    "iOS",
    "Android",
    "SwiftUI",
    "Jetpack Compose",
    "Flutter",
    "Node.js",
    "NestJS",
    "Express.js",
    "Django",
    "Flask",
    "FastAPI",
    "Spring Boot",
    "Ruby on Rails",
    "Laravel",
    ".NET",
    "GraphQL",
    "gRPC",
    "REST",
    "Microservices",
    "Distributed systems",
    "System design",
    "Serverless",
    "RabbitMQ",
    "Kafka",
    "Redis",
    "PostgreSQL",
    "MySQL",
    "SQLite",
    "MongoDB",
    "DynamoDB",
    "Cassandra",
    "Elasticsearch",
    "Terraform",
    "Pulumi",
    "Ansible",
    "Docker",
    "Kubernetes",
    "Helm",
    "CI/CD",
    "GitHub Actions",
    "Jenkins",
    "CircleCI",
    "Git",
    "Linux",
    "Nginx",
    "Prometheus",
    "Grafana",
    "OpenTelemetry",
    "Penetration testing",
    "OWASP",
    "Threat modeling",
  ],
  data: [
    "R",
    "MATLAB",
    "Julia",
    "Snowflake",
    "BigQuery",
    "Redshift",
    "Databricks",
    "dbt",
    "Airflow",
    "Spark",
    "Flink",
    "Hadoop",
    "ETL",
    "Data modeling",
    "Data warehousing",
    "Tableau",
    "Looker",
    "Power BI",
    "Pandas",
    "NumPy",
    "Jupyter",
    "Statistics",
    "SAS",
    "SPSS",
    "Machine learning",
    "Deep learning",
    "PyTorch",
    "TensorFlow",
    "scikit-learn",
    "Keras",
    "NLP",
    "Computer vision",
    "Hugging Face",
    "MLOps",
    "Reinforcement learning",
  ],
  design: [
    "Figma",
    "Sketch",
    "Adobe XD",
    "Photoshop",
    "Illustrator",
    "InDesign",
    "After Effects",
    "Framer",
    "Webflow",
    "Prototyping",
    "Wireframing",
    "User research",
    "Usability testing",
    "Design systems",
    "Interaction design",
    "Motion design",
  ],
  product: ["Roadmapping", "Amplitude", "Mixpanel", "A/B testing"],
  marketing: [
    "SEO",
    "SEM",
    "Google Ads",
    "Google Analytics",
    "HubSpot",
    "Marketo",
    "Content marketing",
    "Copywriting",
    "Email marketing",
    "Lifecycle marketing",
    "Performance marketing",
    "Marketing automation",
  ],
  sales: ["Salesforce", "Salesloft", "MEDDICC", "CRM"],
  support: ["Zendesk", "Intercom", "Freshdesk"],
  finance: ["Financial modeling", "FP&A", "GAAP", "IFRS", "NetSuite", "QuickBooks"],
};

const FAMILY_OF_SKILL = new Map(
  Object.entries(SKILL_FAMILIES).flatMap(([family, skills]) =>
    skills.map((skill) => [skill, family as RoleFamily] as const),
  ),
);

const SKILLS_GUESS = { least: 3, lead: 2 } as const;

// Only a clear lead counts: three or more skills of one kind, at least twice the next kind's.
export function skillsFamily(skills: readonly string[]): RoleFamily | null {
  const counts = new Map<RoleFamily, number>();
  for (const skill of new Set(skills)) {
    const family = FAMILY_OF_SKILL.get(skill);
    if (family) counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  const [first, second] = [...counts].sort((a, b) => b[1] - a[1]);
  if (!first || first[1] < SKILLS_GUESS.least) return null;
  return !second || first[1] >= SKILLS_GUESS.lead * second[1] ? first[0] : null;
}

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
  const text = englishTitle(title)
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

// "5+ años de experiencia", "3 anos de experiência", "5 ans d'expérience", "mindestens 5 Jahre Berufserfahrung",
// and the other way round: "experiencia mínima de 3 años", "Erfahrung von mindestens 3 Jahren".
const YEAR_WORDS = String.raw`(?:años|anos|ans|années|annees|jahren?)`;
const EXPERIENCE_WORDS = String.raw`(?:experiencias?|experiência|experiencia|expériences?|\p{L}*erfahrung(?:en)?)`;
const AT_LEAST = String.raw`(?:al menos|como m[ií]nimo|m[ií]nimo(?: de)?|m[aá]s de|pelo menos|no m[ií]nimo|mais de|au moins|minimum(?: de)?|plus de|mindestens|mind\.|über|mehr als)`;
const YEARS_COUNT = String.raw`(\d{1,2})\s*\+?\s*(?:(?:-|–|a|à|bis|ou|o|e|y)\s*\d{1,2}\s*)?\+?`;
const YEARS_THEN_EXPERIENCE = new RegExp(
  String.raw`(?<![\p{L}\p{N}])(?:${AT_LEAST}\s+)?${YEARS_COUNT}\s*${YEAR_WORDS}(?!\p{L})(?:\s+(?:o|ou|oder)\s+(?:m[aá]s|mais|plus|mehr))?(?:(?:\s+|\s*['’]\s*)[\p{L}\p{N}/&+.-]+){0,6}?(?:\s+|\s*['’]\s*)${EXPERIENCE_WORDS}(?!\p{L})`,
  "giu",
);
const EXPERIENCE_THEN_YEARS = new RegExp(
  String.raw`(?<!\p{L})${EXPERIENCE_WORDS}(?:\s+\p{L}+){0,3}?\s*(?:[(:]\s*)?(?:(?:de|von|du|d['’])\s*)?(?:${AT_LEAST}\s+)?${YEARS_COUNT}\s*${YEAR_WORDS}(?!\p{L})`,
  "giu",
);

export function minYearsOf(text: string): number | null {
  let min: number | null = null;
  for (const pattern of [YEARS, YEARS_THEN_EXPERIENCE, EXPERIENCE_THEN_YEARS]) {
    for (const match of text.matchAll(pattern)) {
      const years = Number(match[1]);
      if (years >= 1 && years <= 20 && (min === null || years < min)) min = years;
    }
  }
  return min;
}
