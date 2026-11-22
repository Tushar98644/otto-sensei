import { z } from "zod";
import { minYearsOf, roleFamily, seniorityOf } from "@/lib/job-feed/roles";

export const ROLE_FOCUSES = [
  "ai-ml",
  "backend",
  "frontend",
  "fullstack",
  "mobile",
  "data-science",
  "data-analysis",
  "data-engineering",
  "devops",
  "security",
  "qa",
  "product",
  "design",
] as const;
export type RoleFocus = (typeof ROLE_FOCUSES)[number];

export const PREP_LEVELS = ["junior", "mid", "senior", "staff"] as const;
export type PrepLevel = (typeof PREP_LEVELS)[number];

export const TECHNICAL_KINDS = ["deep-dive", "concept", "design", "coding"] as const;
export type TechnicalKind = (typeof TECHNICAL_KINDS)[number];

type FocusCopy = {
  label: string;
  section: string;
  about: string;
  kinds?: Partial<Record<TechnicalKind, string>>;
};

export const FOCUS_COPY: Record<RoleFocus, FocusCopy> = {
  "ai-ml": {
    label: "AI/ML engineer",
    section: "Technical",
    about: "Your own projects first, then retrieval, evals, caching, cost and a design round.",
  },
  backend: {
    label: "Backend engineer",
    section: "Technical",
    about: "Your own projects first, then caching, data, consistency, retries and a design round.",
  },
  frontend: {
    label: "Frontend engineer",
    section: "Technical",
    about:
      "Your own projects first, then rendering, performance, state, accessibility and a design round.",
  },
  fullstack: {
    label: "Full-stack engineer",
    section: "Technical",
    about: "Your own projects first, then both ends of the stack and a design round.",
  },
  mobile: {
    label: "Mobile engineer",
    section: "Technical",
    about: "Your own projects first, then offline, sync, performance, releases and a design round.",
  },
  "data-science": {
    label: "Data scientist",
    section: "Technical",
    about: "Your own projects first, then experiments, statistics, modelling and a case study.",
    kinds: { design: "Case study" },
  },
  "data-analysis": {
    label: "Data analyst",
    section: "Technical",
    about: "Your own analyses first, then SQL, metrics, experiments and an analysis case.",
    kinds: { design: "Analysis case" },
  },
  "data-engineering": {
    label: "Data engineer",
    section: "Technical",
    about: "Your own pipelines first, then modelling, backfills, orchestration and a design round.",
  },
  devops: {
    label: "DevOps / SRE",
    section: "Technical",
    about:
      "Your own systems first, then deploys, incidents, SLOs, infrastructure and a design round.",
  },
  security: {
    label: "Security engineer",
    section: "Technical",
    about: "Your own work first, then threats, auth, secrets, detection and a threat model.",
    kinds: { design: "Threat model" },
  },
  qa: {
    label: "QA / test engineer",
    section: "Technical",
    about: "Your own test work first, then strategy, automation, flaky tests and a test plan.",
    kinds: { design: "Test plan" },
  },
  product: {
    label: "Product manager",
    section: "Product craft",
    about:
      "Your own launches first, then metrics, priorities, trade-offs and a product sense round.",
    kinds: { "deep-dive": "Launch deep-dive", concept: "Product concept", design: "Product sense" },
  },
  design: {
    label: "Designer",
    section: "Design craft",
    about: "Your portfolio first, then research, systems, accessibility and a design exercise.",
    kinds: { "deep-dive": "Portfolio deep-dive", concept: "Craft", design: "Design exercise" },
  },
};

export const LEVEL_COPY: Record<PrepLevel, string> = {
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  staff: "Staff and up",
};

const KIND_COPY: Record<TechnicalKind, string> = {
  "deep-dive": "Project deep-dive",
  concept: "Core concept",
  design: "System design",
  coding: "Warm-up",
};

export function kindLabel(focus: RoleFocus, kind: TechnicalKind): string {
  return FOCUS_COPY[focus].kinds?.[kind] ?? KIND_COPY[kind];
}

// Interviews for these never get a coding warm-up.
const NO_CODING: ReadonlySet<RoleFocus> = new Set(["product", "design"]);

// Order matters: the first rule that matches the title wins.
const TITLE_RULES: readonly (readonly [RoleFocus, RegExp])[] = [
  [
    "product",
    /\b(?:product (?:manager|owner|lead|director|management)|head of product|vp,? (?:of )?product|chief product officer|group product manager|pm)\b/,
  ],
  [
    "design",
    /\b(?:designer|ux researcher|user researcher|design researcher|ux lead|design (?:lead|manager|director)|head of design)\b/,
  ],
  ["fullstack", /\bfull[- ]?stack\b/],
  ["backend", /\bback[- ]?end\b|\bserver[- ]side\b/],
  [
    "frontend",
    /\bfront[- ]?end\b|\bui (?:engineer|developer)\b|\bux engineer\b|\bdesign engineer\b|\bweb (?:developer|engineer)\b/,
  ],
  ["mobile", /\b(?:mobile|ios|android|react native|flutter)\b/],
  [
    "data-engineering",
    /\b(?:data (?:engineer|engineering|platform|infrastructure)|analytics engineer|etl (?:developer|engineer)|big data|data warehouse)\b/,
  ],
  [
    "data-science",
    /\b(?:data scien\w*|statistician|decision scien\w*|quantitative (?:analyst|researcher)|econometrician)\b/,
  ],
  [
    "ai-ml",
    /\b(?:ai|ml|llm|genai|gen ai|generative ai|machine learning|deep learning|nlp|computer vision|mlops|applied scientist|research scientist|prompt engineer|agent engineer)\b/,
  ],
  [
    "data-analysis",
    /\b(?:(?:data|business intelligence|bi|product|marketing|growth|analytics|insights|reporting|sql) analyst|analytics (?:manager|lead|specialist)|(?:bi|business intelligence) (?:developer|engineer))\b/,
  ],
  [
    "security",
    /\b(?:security|appsec|devsecops|penetration tester|pentester|red team|soc analyst|threat|vulnerability|detection engineer|cyber\w*)\b/,
  ],
  [
    "devops",
    /\b(?:devops|sre|site reliability|reliability engineer|platform engineer|infrastructure engineer|cloud engineer|release engineer|build engineer|production engineer|systems engineer|kubernetes|systems administrator|sysadmin)\b/,
  ],
  [
    "qa",
    /\b(?:qa|quality assurance|quality engineer|test (?:engineer|automation|analyst|lead)|tester|sdet|software engineer in test|automation engineer)\b/,
  ],
  ["frontend", /\b(?:react|angular|vue(?:\.js)?|javascript|typescript)\b/],
  [
    "backend",
    /\b(?:java|golang|go|python|ruby|rails|node(?:\.js)?|\.net|scala|elixir|php|rust|api|distributed systems|payments) (?:engineer|developer)\b/,
  ],
];

const SOFTWARE_TITLE =
  /\b(?:engineer|engineering|developer|programmer|swe|sde|member of (?:the )?technical staff|tech lead|technical lead|cto)\b/;

// SOC codes from readTitle, for titles the rules above don't name.
const OCCUPATION_RULES: readonly (readonly [string, RoleFocus | "software"])[] = [
  ["11-X101", "product"],
  ["15-1253", "qa"],
  ["15-1299.05", "security"],
  ["15-1212", "security"],
  ["15-2051", "data-science"],
  ["15-2041", "data-science"],
  ["15-1243", "data-engineering"],
  ["15-1242", "data-engineering"],
  ["15-1221", "ai-ml"],
  ["15-1244", "devops"],
  ["15-1241", "devops"],
  ["15-1299.08", "devops"],
  ["15-1255", "design"],
  ["27-102", "design"],
  ["15-1252", "software"],
  ["15-1254", "software"],
  ["11-3021", "software"],
];

export type TitleFocus = RoleFocus | "software" | "data" | null;

// A "Marketing Manager, AI" keeps today's rounds; a "Marketing Analyst" still gets the data ones.
const NON_TECHNICAL: ReadonlySet<string> = new Set([
  "marketing",
  "people",
  "finance",
  "legal",
  "operations",
]);
const TECH_WORD = /\b(?:engineer|developer|programmer|scientist|analyst|architect)\b/;

// What the title alone says; "software" and "data" leave the exact focus to the post.
export function focusFromTitle(title: string, occupation: string | null = null): TitleFocus {
  const text = title.toLowerCase();
  const family = roleFamily(text);
  if (family === "sales" || family === "support") return null;
  if (family && NON_TECHNICAL.has(family) && !TECH_WORD.test(text)) return null;
  for (const [focus, rule] of TITLE_RULES) if (rule.test(text)) return focus;
  if (occupation) {
    const found = OCCUPATION_RULES.find(([prefix]) => occupation.startsWith(prefix));
    if (found) return found[1];
  }
  if (family === "engineering" || SOFTWARE_TITLE.test(text)) return "software";
  if (family === "data") return "data";
  if (family === "product") return "product";
  if (family === "design") return "design";
  return null;
}

type Signals = Partial<Record<RoleFocus, RegExp>>;

const SOFTWARE_SIGNALS: Signals = {
  frontend:
    /\b(?:react|next\.js|nextjs|vue|angular|svelte|css|html|redux|tailwind|web performance|core web vitals|accessibility|wcag|design system|browser)\b/g,
  backend:
    /\b(?:postgres(?:ql)?|mysql|kafka|redis|microservices?|rest(?:ful)? apis?|grpc|distributed systems|java|golang|spring|django|rails|node\.js|sql|queues?|sqs|rabbitmq|dynamodb|cassandra|elasticsearch|databases?)\b/g,
  mobile: /\b(?:ios|android|swift|kotlin|react native|flutter|app store|mobile apps?)\b/g,
  "ai-ml":
    /\b(?:llms?|rag|machine learning|pytorch|tensorflow|embeddings?|vector (?:database|search|store)s?|fine[- ]tun\w*|prompts?|genai|generative ai|inference|langchain|ai agents?|evals?)\b/g,
  devops:
    /\b(?:kubernetes|terraform|ci\/cd|sre|observability|helm|on[- ]call|incident|infrastructure as code|argo ?cd|prometheus)\b/g,
  "data-engineering":
    /\b(?:airflow|spark|dbt|etl|elt|data pipelines?|snowflake|bigquery|data warehouse|databricks|dagster)\b/g,
};

const DATA_SIGNALS: Signals = {
  "data-science":
    /\b(?:experiments?|a\/b tests?|causal|statistic\w*|regression|hypothesis|modell?ing|predictive|forecast\w*|python|scikit-learn|machine learning)\b/g,
  "data-analysis":
    /\b(?:sql|dashboards?|tableau|looker|power bi|excel|reporting|kpis?|metrics|insights|stakeholders)\b/g,
  "data-engineering": SOFTWARE_SIGNALS["data-engineering"]!,
  "ai-ml":
    /\b(?:llms?|rag|deep learning|pytorch|tensorflow|embeddings?|fine[- ]tun\w*|mlops|model serving)\b/g,
};

function countSignals(post: string, signals: Signals): Map<RoleFocus, number> {
  const text = post.toLowerCase();
  const counts = new Map<RoleFocus, number>();
  for (const [focus, rule] of Object.entries(signals) as [RoleFocus, RegExp][]) {
    counts.set(focus, new Set(Array.from(text.matchAll(rule), (match) => match[0])).size);
  }
  return counts;
}

function softwareFocus(post: string): RoleFocus {
  const counts = countSignals(post, SOFTWARE_SIGNALS);
  const count = (focus: RoleFocus) => counts.get(focus) ?? 0;
  const top = Math.max(...counts.values());
  for (const focus of ["ai-ml", "mobile", "devops", "data-engineering"] as const) {
    if (count(focus) >= 3 && count(focus) === top) return focus;
  }
  const front = count("frontend");
  const back = count("backend");
  if (front >= 2 && back >= 2 && Math.min(front, back) / Math.max(front, back) >= 0.5)
    return "fullstack";
  return front > back && front >= 2 ? "frontend" : "backend";
}

function dataFocus(post: string): RoleFocus {
  const counts = countSignals(post, DATA_SIGNALS);
  let best: RoleFocus = "data-analysis";
  let most = 0;
  for (const [focus, count] of counts) {
    if (count > most) {
      best = focus;
      most = count;
    }
  }
  return best;
}

export type FocusJob = { title: string; post: string; occupation?: string | null };

export function pickFocus(job: FocusJob): RoleFocus | null {
  const found = focusFromTitle(job.title, job.occupation ?? null);
  if (found === "software") return softwareFocus(job.post);
  if (found === "data") return dataFocus(job.post);
  return found;
}

export function pickLevel(job: Pick<FocusJob, "title" | "post">): PrepLevel {
  const rank = seniorityOf(job.title);
  if (rank === "intern" || rank === "junior") return "junior";
  if (rank === "lead" || rank === "director") return "staff";
  if (rank === "senior") return "senior";
  const years = minYearsOf(job.post);
  if (years === null) return "mid";
  return years < 2 ? "junior" : years < 5 ? "mid" : "senior";
}

const CODING_ROUND =
  /\b(?:coding (?:interview|round|challenge|exercise|test|assessment|screen)|live[- ]coding|pair[- ]programming|pairing (?:session|interview|exercise)|take[- ]home|technical (?:assessment|test|exercise|screen)|leetcode|hackerrank|codility|codesignal|whiteboard(?:ing)?|algorithms and data structures|data structures and algorithms)\b/i;

export function codingRoundLikely(post: string): boolean {
  return CODING_ROUND.test(post);
}

export const FocusChoiceSchema = z.object({
  role: z.enum([...ROLE_FOCUSES, "auto", "none"]).default("auto"),
  level: z.enum([...PREP_LEVELS, "auto"]).default("auto"),
});
export type FocusChoice = z.output<typeof FocusChoiceSchema>;

export const AUTO_FOCUS: FocusChoice = { role: "auto", level: "auto" };

export type ResolvedFocus = { focus: RoleFocus; level: PrepLevel; coding: boolean };

export function resolveFocus(choice: FocusChoice, job: FocusJob): ResolvedFocus | null {
  if (choice.role === "none") return null;
  const focus = choice.role === "auto" ? pickFocus(job) : choice.role;
  if (!focus) return null;
  const level = choice.level === "auto" ? pickLevel(job) : choice.level;
  return { focus, level, coding: !NO_CODING.has(focus) && codingRoundLikely(job.post) };
}

export type FocusPreview = { focus: RoleFocus | "post" | null; level: PrepLevel | "post" };

// What the form can say before the post is read: "post" means the server picks it from the post.
export function previewFocus(title: string, post: string | null): FocusPreview {
  const found = focusFromTitle(title);
  const focus =
    found === "software" || found === "data" ? (post ? pickFocus({ title, post }) : "post") : found;
  const level =
    post || seniorityOf(title) !== "mid" ? pickLevel({ title, post: post ?? "" }) : "post";
  return { focus, level };
}
