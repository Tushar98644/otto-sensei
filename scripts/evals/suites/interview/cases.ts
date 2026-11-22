import { demoInterview } from "@/lib/ai/interview";
import type { InterviewPrep, InterviewRequestBody } from "@/lib/insights/prep";
import type { PrepLevel, RoleFocus } from "@/lib/insights/prep-focus";
import { DEFAULT_SECTION_ORDER, type Resume } from "@/lib/resume/schema";
import type { EvalCase } from "../../suite";
import { BACKEND_POST, FRONTEND_POST } from "../tailor/posts";
import { FRONTEND_JUNIOR, GO_BACKEND, SENIOR_PM } from "../tailor/resumes";

export type InterviewExpect = {
  focus: RoleFocus;
  level: PrepLevel;
  coding: boolean;
  minDeepDives: number;
};

export type InterviewCase = EvalCase<InterviewRequestBody, InterviewPrep, InterviewExpect>;

const CREATED_AT = Date.UTC(2026, 10, 1);
const APPLICATION_ID = "00000000-0000-4000-8000-000000000001";

type JobSpec = {
  title: string;
  company: string;
  start: string;
  end: string;
  bullets: readonly string[];
};

function resumeOf(
  key: string,
  name: string,
  headline: string,
  jobs: readonly JobSpec[],
  skills: string[],
): Resume {
  return {
    id: `resume-${key}`,
    version: 1,
    title: `${name} resume`,
    basics: {
      name,
      headline,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
      phone: "",
      location: "",
      links: [],
    },
    summary: "",
    experience: jobs.map((job, index) => ({
      id: `${key}-j${index + 1}`,
      company: job.company,
      title: job.title,
      location: "",
      startDate: job.start,
      endDate: job.end,
      bullets: job.bullets.map((text, line) => ({ id: `${key}-j${index + 1}-b${line + 1}`, text })),
    })),
    education: [],
    projects: [],
    skills: [{ id: `${key}-k1`, label: "", items: skills }],
    certifications: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    source: "import",
    tailor: null,
    template: "classic",
    extras: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

export const AI_ENGINEER = resumeOf(
  "ai",
  "Ravi Menon",
  "AI Engineer",
  [
    {
      title: "AI Engineer",
      company: "Northwind Support",
      start: "2023",
      end: "Present",
      bullets: [
        "Built a RAG assistant over 40,000 support articles with pgvector and a cross-encoder reranker",
        "Cut median answer latency from 6.1s to 2.4s by streaming and caching retrieval results in Redis",
        "Set up an offline eval set of 300 labelled questions that runs in CI on every prompt change",
        "Added PII redaction before prompts reach the model provider",
      ],
    },
    {
      title: "Software Engineer",
      company: "Brightpath Learning",
      start: "2021",
      end: "2023",
      bullets: [
        "Wrote Python services on FastAPI and PostgreSQL for course search",
        "Moved search from SQL LIKE queries to Elasticsearch",
      ],
    },
  ],
  ["Python", "FastAPI", "PostgreSQL", "pgvector", "Redis", "Elasticsearch", "OpenAI API", "Docker"],
);

const AI_ENGINEER_POST = `AI Engineer — Quillstone

Quillstone builds an assistant that answers questions over a company's internal docs. You'll own retrieval quality and the cost of every answer.

What you'll do
- Build and improve our RAG pipeline: chunking, embeddings, hybrid search and reranking
- Design evals that catch regressions before they ship
- Bring latency and cost per answer down as usage grows
- Keep customer data private and separate per tenant

What you bring
- 3+ years building production software, at least 1 with LLMs
- Python, and experience with vector search
- Experience measuring retrieval or model quality

Our process: a call with the hiring manager, a 60-minute live coding interview in Python, and a system design conversation.`;

export const DATA_SCIENTIST = resumeOf(
  "ds",
  "Amara Lindqvist",
  "Data Scientist",
  [
    {
      title: "Data Scientist",
      company: "Parcelwise",
      start: "2022",
      end: "Present",
      bullets: [
        "Designed and analysed 25 A/B tests on the checkout flow with the growth team",
        "Built a churn model in Python with scikit-learn used by the retention team each week",
        "Wrote the SQL behind the weekly delivery-time dashboard in Looker",
        "Introduced CUPED to cut the runtime of checkout experiments",
      ],
    },
    {
      title: "Data Analyst",
      company: "Hollowtree Retail",
      start: "2020",
      end: "2022",
      bullets: [
        "Built cohort retention reports in SQL",
        "Cleaned and deduplicated the customer table",
      ],
    },
  ],
  ["Python", "SQL", "scikit-learn", "pandas", "Looker", "A/B testing"],
);

const DATA_SCIENTIST_POST = `Data Scientist, Experimentation — Fennel & Co

Fennel & Co sells meal kits online. Our experimentation team helps product teams decide what to ship.

What you'll do
- Design experiments and read their results with product managers
- Build models that predict churn and lifetime value
- Improve how we measure, including variance reduction

What you bring
- 3+ years in data science or analytics
- Strong SQL and Python
- Solid statistics: hypothesis tests, power, confidence intervals`;

const SENIOR_PM_POST = `Senior Product Manager, Merchant Payouts — Tidewell

Tidewell runs payroll and payouts for restaurants. You'll own how restaurants get paid, from scheduling payouts to the status emails they get.

What you'll do
- Set the roadmap for payouts with engineering, design and compliance
- Define the metrics that show payouts are fast and reliable
- Work with engineering on a new payouts API for partners

What you bring
- 5+ years of product management, ideally in payments or fintech
- Comfortable with SQL and with technical trade-offs
- Experience running experiments`;

type Spec = {
  id: string;
  resume: Resume;
  title: string;
  company: string;
  post: string;
  expect: InterviewExpect;
  note: string;
};

const SPECS: readonly Spec[] = [
  {
    id: "ai-engineer-mid",
    resume: AI_ENGINEER,
    title: "AI Engineer",
    company: "Quillstone",
    post: AI_ENGINEER_POST,
    expect: { focus: "ai-ml", level: "mid", coding: true, minDeepDives: 2 },
    note: "RAG, evals, caching and cost; the post names a live coding round.",
  },
  {
    id: "backend-senior",
    resume: GO_BACKEND,
    title: "Senior Backend Engineer",
    company: "Lumenfold",
    post: BACKEND_POST,
    expect: { focus: "backend", level: "senior", coding: false, minDeepDives: 2 },
    note: "Ledger services in Go and PostgreSQL; no coding round named.",
  },
  {
    id: "frontend-junior",
    resume: FRONTEND_JUNIOR,
    title: "Junior Frontend Engineer",
    company: "Fernhill Labs",
    post: FRONTEND_POST,
    expect: { focus: "frontend", level: "junior", coding: false, minDeepDives: 2 },
    note: "React, TypeScript, accessibility and tests at junior depth.",
  },
  {
    id: "data-scientist-mid",
    resume: DATA_SCIENTIST,
    title: "Data Scientist",
    company: "Fennel & Co",
    post: DATA_SCIENTIST_POST,
    expect: { focus: "data-science", level: "mid", coding: false, minDeepDives: 2 },
    note: "Experiments, statistics and churn models.",
  },
  {
    id: "pm-senior",
    resume: SENIOR_PM,
    title: "Senior Product Manager",
    company: "Tidewell",
    post: SENIOR_PM_POST,
    expect: { focus: "product", level: "senior", coding: false, minDeepDives: 2 },
    note: "Product sense, metrics and the technical depth the post asks for (a payouts API).",
  },
];

function inputOf(spec: Spec): InterviewRequestBody {
  return {
    applicationId: APPLICATION_ID,
    resume: spec.resume,
    job: { text: spec.post, title: spec.title, company: spec.company },
  };
}

// The demo pack, made without the AI, is each case's golden: the dry run grades it offline.
function demoOf(input: InterviewRequestBody): InterviewPrep {
  return demoInterview(
    input.resume as Resume,
    { jobText: input.job.text, jobTitle: input.job.title ?? "", company: input.job.company ?? "" },
    { now: CREATED_AT },
  );
}

export const INTERVIEW_CASES: readonly InterviewCase[] = SPECS.map((spec) => {
  const input = inputOf(spec);
  return { id: spec.id, input, expect: spec.expect, note: spec.note, golden: demoOf(input) };
});
