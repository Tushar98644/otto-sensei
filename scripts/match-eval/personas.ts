import { emptyWorkProfile, type WorkProfile } from "@/lib/eligibility/profile";
import type { PlaceChoice } from "@/lib/job-feed/types";

// Labelled personas for precision and off-role share (docs/matching.md "Evaluation").
// A job's label comes from its title alone, so it never depends on either matcher's own reading:
// 2 the persona's own role, 1 a neighbouring role they'd still consider, 0 off-role. The rules read
// the title's role part (before a comma, dash, bracket or "at"); ownAnywhere reads the whole title.

export type Persona = {
  id: string;
  name: string;
  titles: string[];
  years: number;
  skills: string;
  own: RegExp;
  ownAnywhere?: RegExp;
  near?: RegExp;
  // Roles that share a word with the persona's but aren't theirs ("Sales Engineer" for a developer).
  not?: RegExp;
};

const SOFTWARE =
  /\b(?:software (?:engineer|developer|development|engineering|architect)|developer|programmer|swe\d?|sde\d?|react native|flutter|full[- ]?stack|front[- ]?end|back[- ]?end|web (?:engineer|developer)|mobile (?:engineer|developer)|ios|android|platform engineer|infrastructure engineer|site reliability|sre|devops|cloud engineer|product engineer|application (?:engineer|developer)|founding engineer|member of technical staff|desenvolvedora?|engenheir[oa] de software|programadora?)\b/i;
// "Engineer I, Software - New Grad" names the level before the discipline.
const SOFTWARE_ANYWHERE =
  /\bsoftware\b.*\b(?:engineer|engineering|developer)\b|\bengineer(?: [ivx]+| \d)?, software\b|\bplatform engineering\b|\bproduct engineering\b/i;
const NOT_SOFTWARE =
  /\b(?:sales|solutions? engineer|support|customer|field|hardware|mechanical|electrical|civil|chemical|process|manufacturing|quality|maintenance|facilities|structural|construction|hvac|biomedical|clinical|recruit\w*|account|analyst|product manager|program manager|project manager|designer|marketing|writer|advocate|trainer|tutor|teacher|instructor)\b/i;

export const PERSONAS: readonly Persona[] = [
  {
    id: "swe-junior",
    name: "Software engineer (junior)",
    titles: ["Software Engineer Intern", "Junior Software Developer"],
    years: 1,
    skills:
      "JavaScript, TypeScript, React, Node.js, Python, SQL, PostgreSQL, Git, HTML, CSS, REST APIs, Docker, Linux",
    own: SOFTWARE,
    ownAnywhere: SOFTWARE_ANYWHERE,
    near: /\b(?:qa|test|automation|data engineer|machine learning engineer|ml engineer|ai engineer|security engineer|engineer)\b/i,
    not: NOT_SOFTWARE,
  },
  {
    id: "swe-senior",
    name: "Software engineer (senior)",
    titles: ["Senior Software Engineer", "Software Engineer"],
    years: 8,
    skills:
      "Go, Java, Python, Kubernetes, AWS, PostgreSQL, Kafka, Microservices, Distributed systems, Docker, Terraform, gRPC, Redis",
    own: SOFTWARE,
    ownAnywhere: SOFTWARE_ANYWHERE,
    near: /\b(?:architect|tech lead|engineering manager|manager,? (?:software )?engineering|data engineer|machine learning engineer|ml engineer|ai engineer|security engineer|engineer)\b/i,
    not: NOT_SOFTWARE,
  },
  {
    id: "ai-engineer",
    name: "AI engineer",
    titles: ["Machine Learning Engineer", "Software Engineer"],
    years: 4,
    skills:
      "Python, PyTorch, TensorFlow, LLMs, RAG, LangChain, Hugging Face, MLOps, Machine learning, Deep learning, NLP, AWS, Docker, SQL",
    own: /\b(?:(?:machine learning|ml|ai|artificial intelligence|llm|genai|generative ai|deep learning|nlp|computer vision|ai\/ml|ml\/ai) (?:engineer|scientist|researcher|developer|architect|specialist|lead|engineering)|applied scientist|research scientist|research engineer|data scientist|mlops|cientista de dados|engenheir[oa] de (?:machine learning|ia|ml))\b/i,
    ownAnywhere:
      /\b(?:engineer|scientist|developer|researcher|programmer)\b.*\b(?:machine learning|ml|ai|llm|genai|nlp|computer vision)\b|\b(?:machine learning|ml|ai|genai|llm|deep learning|nlp)\b.*\b(?:engineer|scientist|developer|researcher|programmer)\b/i,
    near: /\b(?:data engineer|data science|quantitative|analytics engineer)\b|\b(?:software (?:engineer|developer)|developer|full[- ]?stack|back[- ]?end|platform engineer)\b/i,
    not: /\b(?:sales|account|recruit\w*|marketing|support|customer|counsel|legal|trainer|tutor|annotat\w*|label\w*|writer|data entry|product manager|designer)\b/i,
  },
  {
    id: "data-analyst",
    name: "Data analyst",
    titles: ["Data Analyst", "Business Intelligence Analyst"],
    years: 3,
    skills: "SQL, Excel, Python, Tableau, Power BI, Looker, Statistics, Pandas, Data modeling",
    own: /\b(?:data analyst|data insights|analytics|business intelligence|bi (?:analyst|developer|engineer)|reporting analyst|insights? analyst|data analysis|analista de dados|analista de bi|product analyst|marketing analyst|quantitative analyst|analytics engineer)\b/i,
    near: /\b(?:data scientist|data engineer|business analyst|financial analyst|operations analyst|research analyst|analyst|analista|insights|quantitative|data specialist|data (?:manager|lead))\b/i,
    not: /\b(?:sales|account executive|recruit\w*|nurse)\b/i,
  },
  {
    id: "product-manager",
    name: "Product manager",
    titles: ["Product Manager", "Associate Product Manager"],
    years: 5,
    skills:
      "Roadmapping, Jira, SQL, A/B testing, Agile, Scrum, Amplitude, Mixpanel, Figma, User research",
    own: /\b(?:product manager|product owner|product management|head of product|product lead|gerente de produto|product director|chief product officer|group product manager)\b/i,
    near: /\b(?:program manager|product operations|product ops|product marketing|product analyst|product designer|project manager|scrum master|business analyst)\b/i,
    not: /\b(?:sales|engineer|developer|designer|marketing manager|recruit\w*)\b/i,
  },
  {
    id: "ux-designer",
    name: "UI/UX designer",
    titles: ["UI/UX Designer", "Product Designer"],
    years: 4,
    skills:
      "Figma, Sketch, Adobe XD, Prototyping, Wireframing, User research, Usability testing, Design systems, Interaction design",
    own: /\b(?:ux|ui|user experience|product designer|interaction designer|experience designer|design lead|design manager|ux researcher|user researcher|service designer|visual designer|web designer|digital designer|designer de produto|designer de ux|designer ux|design director|head of design|director,? design)\b/i,
    near: /\b(?:designer|design|content strategist|researcher|creative director)\b/i,
    not: /\b(?:interior|fashion|floral|landscape|kitchen|instructional|curriculum|hardware|mechanical|electrical|circuit|chip|asic|fpga|structural|civil|engineer|developer|technician|drafter|cad)\b/i,
  },
  {
    id: "nurse",
    name: "Registered nurse",
    titles: ["Registered Nurse", "Staff Nurse"],
    years: 4,
    skills: "Patient care, BLS, ACLS, Epic, medication administration, triage, care planning",
    own: /\b(?:registered nurse|rn|staff nurse|nurse|enfermeir[oa])\b/i,
    near: /\b(?:nurse practitioner|lpn|lvn|clinical nurse|charge nurse|nurse manager|midwife|care coordinator|nursing|advanced practice|cnm|np)\b/i,
    not: /\b(?:recruit\w*|sales|account|software|engineer|analyst|assistant|aide|cna|technician|educator|instructor|informatic\w*)\b/i,
  },
  {
    id: "accountant",
    name: "Accountant",
    titles: ["Senior Accountant", "Accountant"],
    years: 5,
    skills:
      "GAAP, IFRS, QuickBooks, NetSuite, Excel, Financial modeling, month-end close, reconciliation, general ledger",
    own: /\b(?:accountant|accounting|general ledger|controller|bookkeep\w*|accounts (?:payable|receivable)|audit(?:or)?|tax (?:accountant|associate|senior|manager|analyst|specialist)|revenue accountant|cost accountant|contador[a]?|contábil|contabilidade|chartered accountant)\b/i,
    near: /\b(?:financial analyst|finance (?:manager|analyst|associate|specialist)|fp&a|payroll|treasury|billing|tax|finance|financial reporting|financial operations|fiscal)\b/i,
    not: /\b(?:software|engineer|developer|sales|account executive|account manager|recruit\w*|nurse)\b/i,
  },
  {
    id: "marketing",
    name: "Marketing manager",
    titles: ["Marketing Manager", "Digital Marketing Specialist"],
    years: 4,
    skills:
      "SEO, SEM, Google Ads, Google Analytics, HubSpot, Content marketing, Email marketing, Marketing automation, Copywriting",
    own: /\b(?:marketing|marketer|growth (?:manager|lead|marketer)|seo|sem|ppc|demand gen\w*|lifecycle|content (?:strategist|manager|marketing|marketer)|brand manager|campaign manager|ads|paid (?:media|social|search)|performance (?:marketing|strategist)|creative strategist|social media|marketing digital)\b/i,
    near: /\b(?:communications|public relations|pr manager|copywriter|content|brand|events?|partnerships|community manager)\b/i,
    not: /\b(?:engineer|developer|software|data scientist|recruit\w*|sales development|account executive|designer)\b/i,
  },
  {
    id: "sales",
    name: "Account executive",
    titles: ["Account Executive", "Sales Development Representative"],
    years: 3,
    skills:
      "Salesforce, HubSpot, CRM, MEDDICC, Salesloft, prospecting, negotiation, pipeline management",
    own: /\b(?:account executive|sales|sdr|bdr|business development|account development|new business|business developer|key account|account manager|inside sales|territory (?:manager|representative)|vendas|executiv[oa] de contas|comercial)\b/i,
    near: /\b(?:customer success|partnerships?|partner manager|solutions? consultant|presales|pre-sales|revenue|channel|relationship manager|account director)\b/i,
    not: /\b(?:engineer|developer|software|recruit\w*|accountant|nurse|marketing|analyst|operations|enablement|counsel|designer|associate, retail|cashier)\b/i,
  },
  {
    id: "legal",
    name: "Lawyer",
    titles: ["Corporate Counsel", "Associate Attorney"],
    years: 6,
    skills: "contract drafting, negotiation, corporate law, compliance, legal research, litigation",
    own: /\b(?:counsel|attorney|lawyer|solicitor|legal (?:director|manager|advisor|adviser|lead|officer|associate|specialist|counsel)|head of legal|general counsel|barrister|advogad[oa]|jur[ií]dico)\b/i,
    near: /\b(?:paralegal|legal|compliance|privacy|regulatory|contracts? (?:manager|specialist)|kyc|aml)\b/i,
    not: /\b(?:engineer|developer|software|sales|recruit\w*|nurse|legal engineer|assistant|designer|analyst)\b/i,
  },
];

export type Place = { id: string; place: PlaceChoice; work: WorkProfile };

const worker = (country: string, timeZone: string, rights: Partial<WorkProfile["rights"]>) => ({
  ...emptyWorkProfile(),
  country,
  timeZone,
  rights: { ...emptyWorkProfile().rights, ...rights },
});

export const PLACES: readonly Place[] = [
  { id: "US", place: "c:US", work: worker("US", "America/New_York", { us: "authorized" }) },
  { id: "UK", place: "c:GB", work: worker("GB", "Europe/London", { uk: "authorized" }) },
  { id: "AU", place: "c:AU", work: worker("AU", "Australia/Sydney", {}) },
  { id: "BR", place: "c:BR", work: worker("BR", "America/Sao_Paulo", {}) },
  { id: "IN", place: "c:IN", work: worker("IN", "Asia/Kolkata", {}) },
];

const PARTS = /\s+[-–—|@•·:]\s+|\s+at\s+|\s*[,;()[\]{}]\s*|-(?=intern\b)/i;

// The first part of the title that names a role at all decides, so "SMSTR64 - Software Engineer"
// reads as its role while "Senior Software Engineer, Support Tools" keeps its first part.
export function labelOf(persona: Persona, title: string): 0 | 1 | 2 {
  const parts = title
    .split(PARTS)
    .map((part) => part.trim())
    .filter(Boolean);
  const role =
    parts.find(
      (part) => persona.not?.test(part) || persona.own.test(part) || persona.near?.test(part),
    ) ??
    parts[0] ??
    title;
  if (persona.not?.test(role)) return 0;
  if (persona.own.test(role) || persona.ownAnywhere?.test(title)) return 2;
  if (persona.near?.test(role)) return 1;
  return 0;
}
