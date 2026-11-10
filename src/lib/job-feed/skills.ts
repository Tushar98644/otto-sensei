import { isPlausible } from "@/lib/tailor/keywords";
import { termTokens, textTokens } from "@/lib/tailor/tokens";

// Client-safe and deterministic. The tools and skills a job post names, found by rules in its
// text, and the same rules run over a resume in the browser, so "Found in your resume: React"
// always means the word is there. Built on the tailor matcher's tokens: "front-end" = "frontend",
// "Node JS" = "Node.js", "K8s" = "Kubernetes", "AWS" = "Amazon Web Services".
//
// Only concrete, checkable names are listed. Broad words ("communication", "APIs", "cloud", "AI")
// would match every post and say nothing.

type Skill = {
  label: string;
  // Other spellings that mean the same skill.
  forms?: readonly string[];
  // Everyday words in lowercase ("react", "rust", "excel at"): only the capitalized spelling
  // counts. "exact": only exactly as written ("REST", "SAS").
  cased?: "capital" | "exact";
  // Names that are also plain English or a place even when capitalized (MATCHING-RESEARCH.md,
  // Round 2: 330 non-engineering posts carried "Go" from "Go To Market" and "Go deep").
  // "tech": the label counts only next to other tech, in a "Skills:" list or beside words like
  // "in", "developer" or "code"; its other spellings ("Golang", "PySpark") always count.
  // "word": counts unless it opens a sentence as a verb ("Excel at", "React to").
  context?: "tech" | "word";
};

const VOCABULARY: readonly Skill[] = [
  // Languages
  { label: "Python" },
  { label: "Java" },
  { label: "JavaScript" },
  { label: "TypeScript" },
  { label: "Go", forms: ["Golang"], context: "tech" },
  { label: "Rust", cased: "capital", context: "tech" },
  { label: "Ruby", cased: "capital", context: "tech" },
  { label: "PHP" },
  { label: "Kotlin" },
  { label: "Swift", cased: "capital", context: "tech" },
  { label: "Objective-C" },
  { label: "Scala" },
  { label: "C", cased: "exact", context: "tech" },
  { label: "C++" },
  { label: "C#" },
  { label: "Elixir", cased: "capital", context: "tech" },
  { label: "Erlang" },
  { label: "Haskell" },
  { label: "Clojure" },
  { label: "OCaml" },
  { label: "Dart", cased: "capital", context: "tech" },
  { label: "Elm", cased: "capital", context: "tech" },
  { label: "Lua", cased: "capital", context: "tech" },
  { label: "Perl", cased: "capital", context: "tech" },
  { label: "R", cased: "exact", context: "tech" },
  { label: "MATLAB" },
  { label: "Julia", cased: "capital", context: "tech" },
  { label: "SQL" },
  { label: "Solidity" },
  { label: "Bash", forms: ["Shell scripting"] },
  { label: "PowerShell" },
  // Frontend
  { label: "React", forms: ["React.js", "ReactJS"], cased: "capital", context: "word" },
  { label: "React Native" },
  { label: "Next.js" },
  { label: "Vue", forms: ["Vue.js"] },
  { label: "Nuxt" },
  { label: "Angular" },
  { label: "Svelte" },
  { label: "Redux" },
  { label: "Webpack" },
  { label: "Vite", cased: "capital", context: "word" },
  { label: "HTML" },
  { label: "CSS" },
  { label: "Sass", forms: ["SCSS"] },
  { label: "Tailwind CSS", forms: ["Tailwind"] },
  { label: "Storybook" },
  { label: "Jest", cased: "capital", context: "word" },
  { label: "Cypress", cased: "capital", context: "tech" },
  { label: "Playwright" },
  { label: "Selenium" },
  { label: "Three.js" },
  { label: "D3.js", forms: ["D3"] },
  { label: "WebGL" },
  { label: "WebAssembly", forms: ["Wasm"] },
  // "Accessibility" alone is in most posts' interview boilerplate; the standard names the skill.
  { label: "WCAG", forms: ["Web accessibility"] },
  // Mobile
  { label: "iOS" },
  { label: "Android" },
  { label: "SwiftUI" },
  { label: "Jetpack Compose" },
  { label: "Flutter", cased: "capital", context: "word" },
  // Backend
  { label: "Node.js" },
  { label: "NestJS" },
  { label: "Express.js" },
  { label: "Django" },
  { label: "Flask", cased: "capital", context: "tech" },
  { label: "FastAPI" },
  { label: "Spring Boot" },
  { label: "Ruby on Rails", forms: ["Rails"], cased: "capital", context: "word" },
  { label: "Laravel" },
  { label: ".NET", forms: ["ASP.NET"] },
  { label: "GraphQL" },
  { label: "gRPC" },
  { label: "REST", forms: ["RESTful"], cased: "exact" },
  { label: "Microservices" },
  { label: "Distributed systems" },
  { label: "System design" },
  { label: "Serverless" },
  { label: "RabbitMQ" },
  { label: "Kafka" },
  { label: "Redis" },
  // Databases and data
  { label: "PostgreSQL" },
  { label: "MySQL" },
  { label: "SQLite" },
  { label: "MongoDB" },
  { label: "DynamoDB" },
  { label: "Cassandra", forms: ["Apache Cassandra"], cased: "capital", context: "tech" },
  { label: "Elasticsearch", forms: ["OpenSearch"] },
  { label: "ClickHouse" },
  { label: "Snowflake", cased: "capital", context: "word" },
  { label: "BigQuery" },
  { label: "Redshift" },
  { label: "Databricks" },
  { label: "dbt" },
  { label: "Airflow" },
  { label: "Spark", forms: ["Apache Spark", "PySpark"], cased: "capital", context: "tech" },
  { label: "Flink", forms: ["Apache Flink"], cased: "capital", context: "tech" },
  { label: "Hadoop" },
  { label: "ETL" },
  { label: "Data modeling", forms: ["Data modelling"] },
  { label: "Data warehousing" },
  { label: "Tableau" },
  { label: "Looker" },
  { label: "Power BI" },
  { label: "Excel", forms: ["Microsoft Excel"], cased: "capital", context: "word" },
  { label: "Google Sheets" },
  { label: "Pandas" },
  { label: "NumPy" },
  { label: "Jupyter" },
  { label: "Statistics" },
  { label: "A/B testing" },
  { label: "SAS", cased: "exact" },
  { label: "SPSS" },
  // Machine learning
  { label: "Machine learning" },
  { label: "Deep learning" },
  { label: "PyTorch" },
  { label: "TensorFlow" },
  { label: "scikit-learn" },
  { label: "Keras" },
  { label: "NLP", forms: ["Natural language processing"] },
  { label: "Computer vision" },
  { label: "LLMs", forms: ["LLM", "Large language models"] },
  { label: "RAG", cased: "exact" },
  { label: "Hugging Face" },
  { label: "LangChain" },
  { label: "MLOps" },
  { label: "Reinforcement learning" },
  // Cloud and infrastructure
  { label: "AWS" },
  { label: "Google Cloud" },
  { label: "Azure", cased: "capital", context: "word" },
  { label: "Terraform" },
  { label: "Pulumi" },
  { label: "Ansible" },
  { label: "Docker" },
  { label: "Kubernetes" },
  { label: "Helm", cased: "capital", context: "tech" },
  { label: "CI/CD" },
  { label: "GitHub Actions" },
  { label: "Jenkins", cased: "capital", context: "word" },
  { label: "CircleCI" },
  { label: "Git" },
  { label: "Linux" },
  { label: "Nginx" },
  { label: "Prometheus", cased: "capital", context: "word" },
  { label: "Grafana" },
  { label: "Datadog" },
  { label: "Splunk" },
  { label: "OpenTelemetry" },
  // Security
  { label: "Penetration testing", forms: ["Pentesting"] },
  { label: "SOC 2" },
  { label: "ISO 27001" },
  { label: "SIEM" },
  { label: "OWASP" },
  { label: "Threat modeling", forms: ["Threat modelling"] },
  { label: "IAM", cased: "exact" },
  // Design
  { label: "Figma" },
  { label: "Sketch", cased: "capital", context: "word" },
  { label: "Adobe XD" },
  { label: "Photoshop" },
  { label: "Illustrator", cased: "capital", context: "word" },
  { label: "InDesign" },
  { label: "After Effects" },
  { label: "Framer", cased: "capital", context: "word" },
  { label: "Webflow" },
  { label: "Prototyping" },
  { label: "Wireframing", forms: ["Wireframes"] },
  { label: "User research", forms: ["UX research"] },
  { label: "Usability testing" },
  { label: "Design systems" },
  { label: "Interaction design" },
  { label: "Motion design" },
  // Product and delivery
  { label: "Agile" },
  { label: "Scrum" },
  { label: "Kanban" },
  { label: "Jira" },
  { label: "Confluence", cased: "capital", context: "word" },
  { label: "Roadmapping", forms: ["Product roadmap"] },
  { label: "Amplitude", cased: "capital", context: "word" },
  { label: "Mixpanel" },
  // Marketing
  { label: "SEO", forms: ["Search engine optimization"] },
  { label: "SEM" },
  { label: "Google Ads" },
  { label: "Google Analytics" },
  { label: "HubSpot" },
  { label: "Marketo" },
  { label: "Content marketing" },
  { label: "Copywriting" },
  { label: "Email marketing" },
  { label: "Lifecycle marketing" },
  { label: "Performance marketing" },
  { label: "Marketing automation" },
  // Sales and support
  { label: "Salesforce" },
  { label: "Salesloft" },
  { label: "MEDDICC", forms: ["MEDDIC", "MEDDPICC"] },
  { label: "CRM", cased: "exact" },
  { label: "Zendesk" },
  { label: "Intercom", cased: "capital", context: "word" },
  { label: "Freshdesk" },
  // Finance and operations
  { label: "Financial modeling", forms: ["Financial modelling"] },
  { label: "FP&A" },
  { label: "GAAP" },
  { label: "IFRS" },
  { label: "NetSuite" },
  { label: "QuickBooks" },
  { label: "SAP", cased: "exact" },
  { label: "Workday", cased: "capital", context: "word" },
  { label: "Airtable" },
  { label: "Zapier" },
];

export const SKILL_LABELS: ReadonlySet<string> = new Set(VOCABULARY.map((skill) => skill.label));

/** Skills that count only in context ("Go", "R", "Spark", "Excel"), for checks and the eval. */
export const CONTEXT_SKILLS: readonly string[] = VOCABULARY.filter((skill) => skill.context).map(
  (skill) => skill.label,
);

type Entry = {
  label: string;
  cased: Skill["cased"];
  context: Skill["context"];
  spellings: readonly string[];
};

// Squashed canonical tokens -> skill, so one pass over a text checks the whole vocabulary.
const ENTRIES = new Map<string, Entry>();
let longestTerm = 1;
for (const skill of VOCABULARY) {
  const spellings = [skill.label, ...(skill.forms ?? [])];
  const entry: Entry = {
    label: skill.label,
    cased: skill.cased,
    context: skill.context,
    spellings,
  };
  for (const spelling of spellings) {
    const tokens = termTokens(spelling);
    if (tokens.length === 0) continue;
    longestTerm = Math.max(longestTerm, tokens.length);
    ENTRIES.set(tokens.join(""), entry);
  }
}
// The squashed key may be one step longer than the term: "Express" + "js".
const MAX_TOKENS = longestTerm + 1;

function casedOk(span: string, entry: Entry): boolean {
  if (entry.cased === "exact") return entry.spellings.includes(span);
  if (entry.cased === "capital") return /^\p{Lu}/u.test(span);
  return true;
}

type Hit = { entry: Entry; start: number; end: number };

// What may sit between two names of one list: "Go, Rust", "Python/R", "C and C++", "Go (Golang)".
// One name the vocabulary doesn't know may sit between: "MySQL, Aurora, Cassandra".
const LIST_GAP =
  /^[\s,;/&|+()·•]*(?:\p{Lu}[\p{L}\p{N}.+#-]*[\s,;/&|+()]+)?(?:(?:and|or|plus|as well as)[\s,;/&|+()]*){0,2}$/iu;
const MAX_LIST_GAP = 24;
// Words before a name that make it the technology: "written in Go", "Languages: R", "Engineer (Go)".
const TECH_BEFORE =
  /(?:\b(?:in|with|using|use|uses|write|writes|writing|written in|coding in|code in|programming in|experience in|proficiency in|proficient in|fluent in|fluency in|knowledge of|familiarity with|familiar with|expertise in|expert in|background in)|\b(?:languages?|skills?|stack|tech(?:nolog(?:y|ies))?|tools?|frameworks?)\s*[:\-–—]|\b(?:engineer|developer|programmer|engineering)s?\s*[,:(\-–—]|\b(?:e\.g\.,?|i\.e\.,?|such as|like|including))\s*$/i;
// Words after it: "Go services", "Rust code", "Swift developer", "Spark jobs", "R packages".
const TECH_AFTER =
  /^[\s-]*(?:developers?|engineers?|engineering|programming|programmers?|code(?:base)?s?|coding|services?|microservices?|back-?end|language|lang|apps?|applications?|sdks?|apis?|librar(?:y|ies)|packages?|modules?|frameworks?|ecosystem|runtime|toolchain|scripts?|scripting|stack|development|jobs|pipelines?|clusters?|streaming|sql|notebooks?|shiny|on rails|programs?|binaries|tests?|testing|charts?|experience|expertise|knowledge|proficiency|skills)\b/i;
// Phrases that are never the technology, even beside other tech: "Go To Market", "on the Go".
const NOT_TECH_AFTER =
  /^[\s-]*(?:to[\s-]+market|live\b|getter|deep\b|above\b|beyond\b|the extra mile|ahead\b|far\b)/i;
const NOT_TECH_BEFORE = /\b(?:on the|let it|let's|series|vitamin|plan|grade|class|type)\s*$/i;
// A name that opens a sentence and is followed by one of these is the verb: "Excel at", "React to".
const VERB_NEXT = /^\s+(?:to|at|in|quickly|fast|swiftly|under|beyond|across|upon)\b/;
const SENTENCE_START = /(?:^|[.!?:;•*\n]|\s[-–—])\s*$/;

/** Whether one hit means the skill, from its spelling and the words around it. */
function inContext(text: string, hits: readonly Hit[], index: number): boolean {
  const hit = hits[index]!;
  const { entry, start, end } = hit;
  if (!entry.context) return true;
  const span = text.slice(start, end);
  const before = text.slice(Math.max(0, start - 40), start);
  const after = text.slice(end, end + 40);
  if (entry.context === "word") return !(SENTENCE_START.test(before) && VERB_NEXT.test(after));
  // "Ruby's", "Julia's": a person, not a language.
  if (/['’]s$/.test(span)) return false;
  // Another spelling ("Golang", "PySpark", "Apache Spark") is never plain English.
  if (span.toLowerCase() !== entry.label.toLowerCase()) return true;
  if (NOT_TECH_AFTER.test(after) || NOT_TECH_BEFORE.test(before)) return false;
  if (TECH_BEFORE.test(before) || TECH_AFTER.test(after)) return true;
  // Part of a longer name that counts on its own: "Ruby" in "Ruby on Rails".
  const inside = (other: Hit) =>
    other !== hit && other.start <= start && other.end >= end && other.end - other.start > end - start;
  if (hits.some((other) => inside(other) && !other.entry.context)) return true;
  // A list of tools: the nearest name before or after it is only a comma, slash or "and" away.
  const neighbour = (other: Hit | undefined, gap: string) =>
    other !== undefined && gap.length <= MAX_LIST_GAP && LIST_GAP.test(gap);
  const previous = hits.slice(0, index).findLast((other) => other.end <= start);
  const next = hits.slice(index + 1).find((other) => other.start >= end);
  return (
    neighbour(previous, previous ? text.slice(previous.end, start) : "") ||
    neighbour(next, next ? text.slice(end, next.start) : "")
  );
}

/** Labels of the vocabulary's skills found in `text`, in the order they first appear. */
export function findSkills(text: string, max = Number.POSITIVE_INFINITY): string[] {
  const tokens = textTokens(text);
  // Every place a name appears, so one in plain English ("Go deep") doesn't hide a later one that
  // is the technology ("written in Go"), and each can be judged by its neighbours.
  const hits: Hit[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const first = tokens[i]!;
    // Inside an alias expansion ("AWS" -> amazon web service) only its first token starts a match.
    if ((tokens[i - 1]?.end ?? -1) > first.start) continue;
    let squashed = "";
    for (let j = i; j < tokens.length && j < i + MAX_TOKENS; j++) {
      const token = tokens[j]!;
      if (j > i && !token.joined) break;
      squashed += token.value;
      // A match must end where a word ends, not halfway through an alias expansion.
      if ((tokens[j + 1]?.start ?? Number.POSITIVE_INFINITY) < token.end) continue;
      const entry =
        ENTRIES.get(squashed) ??
        (token.value.endsWith("js") ? ENTRIES.get(squashed.slice(0, -2)) : undefined);
      if (!entry) continue;
      const span = text.slice(first.start, token.end);
      if (isPlausible(text, first.start, token.end, entry.label) && casedOk(span, entry)) {
        hits.push({ entry, start: first.start, end: token.end });
      }
    }
  }
  const found = new Set<string>();
  for (let index = 0; index < hits.length && found.size < max; index++) {
    const { label } = hits[index]!.entry;
    if (!found.has(label) && inContext(text, hits, index)) found.add(label);
  }
  return [...found];
}

/** Keeps only labels this vocabulary knows, without repeats: what a browser sends is checked. */
export function knownSkills(labels: readonly string[]): string[] {
  return [...new Set(labels.filter((label) => SKILL_LABELS.has(label)))];
}
