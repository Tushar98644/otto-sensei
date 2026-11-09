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
};

const VOCABULARY: readonly Skill[] = [
  // Languages
  { label: "Python" },
  { label: "Java" },
  { label: "JavaScript" },
  { label: "TypeScript" },
  { label: "Go", forms: ["Golang"] },
  { label: "Rust", cased: "capital" },
  { label: "Ruby", cased: "capital" },
  { label: "PHP" },
  { label: "Kotlin" },
  { label: "Swift", cased: "capital" },
  { label: "Objective-C" },
  { label: "Scala" },
  { label: "C++" },
  { label: "C#" },
  { label: "Elixir", cased: "capital" },
  { label: "Erlang" },
  { label: "Haskell" },
  { label: "Clojure" },
  { label: "OCaml" },
  { label: "Dart", cased: "capital" },
  { label: "Lua", cased: "capital" },
  { label: "Perl", cased: "capital" },
  { label: "R", cased: "exact" },
  { label: "MATLAB" },
  { label: "Julia", cased: "capital" },
  { label: "SQL" },
  { label: "Solidity" },
  { label: "Bash", forms: ["Shell scripting"] },
  { label: "PowerShell" },
  // Frontend
  { label: "React", forms: ["React.js", "ReactJS"], cased: "capital" },
  { label: "React Native" },
  { label: "Next.js" },
  { label: "Vue", forms: ["Vue.js"] },
  { label: "Nuxt" },
  { label: "Angular" },
  { label: "Svelte" },
  { label: "Redux" },
  { label: "Webpack" },
  { label: "Vite", cased: "capital" },
  { label: "HTML" },
  { label: "CSS" },
  { label: "Sass", forms: ["SCSS"] },
  { label: "Tailwind CSS", forms: ["Tailwind"] },
  { label: "Storybook" },
  { label: "Jest", cased: "capital" },
  { label: "Cypress", cased: "capital" },
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
  { label: "Flutter", cased: "capital" },
  // Backend
  { label: "Node.js" },
  { label: "NestJS" },
  { label: "Express.js" },
  { label: "Django" },
  { label: "Flask", cased: "capital" },
  { label: "FastAPI" },
  { label: "Spring Boot" },
  { label: "Ruby on Rails", forms: ["Rails"], cased: "capital" },
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
  { label: "Cassandra", cased: "capital" },
  { label: "Elasticsearch", forms: ["OpenSearch"] },
  { label: "ClickHouse" },
  { label: "Snowflake", cased: "capital" },
  { label: "BigQuery" },
  { label: "Redshift" },
  { label: "Databricks" },
  { label: "dbt" },
  { label: "Airflow" },
  { label: "Spark", forms: ["Apache Spark", "PySpark"], cased: "capital" },
  { label: "Flink", cased: "capital" },
  { label: "Hadoop" },
  { label: "ETL" },
  { label: "Data modeling", forms: ["Data modelling"] },
  { label: "Data warehousing" },
  { label: "Tableau" },
  { label: "Looker" },
  { label: "Power BI" },
  { label: "Excel", forms: ["Microsoft Excel"], cased: "capital" },
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
  { label: "Azure", cased: "capital" },
  { label: "Terraform" },
  { label: "Pulumi" },
  { label: "Ansible" },
  { label: "Docker" },
  { label: "Kubernetes" },
  { label: "Helm", cased: "capital" },
  { label: "CI/CD" },
  { label: "GitHub Actions" },
  { label: "Jenkins", cased: "capital" },
  { label: "CircleCI" },
  { label: "Git" },
  { label: "Linux" },
  { label: "Nginx" },
  { label: "Prometheus", cased: "capital" },
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
  { label: "Sketch", cased: "capital" },
  { label: "Adobe XD" },
  { label: "Photoshop" },
  { label: "Illustrator", cased: "capital" },
  { label: "InDesign" },
  { label: "After Effects" },
  { label: "Framer", cased: "capital" },
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
  { label: "Confluence", cased: "capital" },
  { label: "Roadmapping", forms: ["Product roadmap"] },
  { label: "Amplitude", cased: "capital" },
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
  { label: "Intercom", cased: "capital" },
  { label: "Freshdesk" },
  // Finance and operations
  { label: "Financial modeling", forms: ["Financial modelling"] },
  { label: "FP&A" },
  { label: "GAAP" },
  { label: "IFRS" },
  { label: "NetSuite" },
  { label: "QuickBooks" },
  { label: "SAP", cased: "exact" },
  { label: "Workday", cased: "capital" },
  { label: "Airtable" },
  { label: "Zapier" },
];

export const SKILL_LABELS: ReadonlySet<string> = new Set(VOCABULARY.map((skill) => skill.label));

type Entry = { label: string; cased: Skill["cased"]; spellings: readonly string[] };

// Squashed canonical tokens -> skill, so one pass over a text checks the whole vocabulary.
const ENTRIES = new Map<string, Entry>();
let longestTerm = 1;
for (const skill of VOCABULARY) {
  const spellings = [skill.label, ...(skill.forms ?? [])];
  const entry: Entry = { label: skill.label, cased: skill.cased, spellings };
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

/** Labels of the vocabulary's skills found in `text`, in the order they first appear. */
export function findSkills(text: string, max = Number.POSITIVE_INFINITY): string[] {
  const tokens = textTokens(text);
  const found = new Set<string>();
  for (let i = 0; i < tokens.length && found.size < max; i++) {
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
      if (!entry || found.has(entry.label)) continue;
      const span = text.slice(first.start, token.end);
      if (isPlausible(text, first.start, token.end, entry.label) && casedOk(span, entry)) {
        found.add(entry.label);
      }
    }
  }
  return [...found];
}

/** Keeps only labels this vocabulary knows, without repeats: what a browser sends is checked. */
export function knownSkills(labels: readonly string[]): string[] {
  return [...new Set(labels.filter((label) => SKILL_LABELS.has(label)))];
}
