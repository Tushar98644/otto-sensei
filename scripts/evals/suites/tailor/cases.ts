import { finalizeTailor } from "@/lib/ai/tailor-finalize";
import { clip, oneLine } from "@/lib/ai/text";
import type { TailorResult } from "@/lib/ai/types";
import type { Resume } from "@/lib/resume/schema";
import type { RawRequirement } from "@/lib/tailor/requirements";
import type { TailorBody, TailorCase, TailorExpect } from "./graders";
import * as post from "./posts";
import * as cv from "./resumes";
import { jobId, lineId } from "./resumes";

type Golden = {
  jobTitle: string;
  company: string;
  requirements: readonly RawRequirement[];
  // Job number to its bullet numbers, most relevant first; blank lines go last on their own.
  order?: Readonly<Record<number, readonly number[]>>;
  summary: string;
  notes?: readonly string[];
};

type CaseSpec = {
  id: string;
  note?: string;
  resume: Resume;
  job: { text: string; title?: string; company?: string };
  expect: TailorExpect;
  golden?: Golden;
};

const JOB_FIELD_CHARS = 200;

function askFor(text: string, terms: readonly string[]): string {
  const [term] = terms;
  return term
    ? `Have you used ${term}?`
    : `Do you have ${text.charAt(0).toLowerCase()}${text.slice(1)}?`;
}

function requirement(
  importance: "must" | "nice",
  source: "wording" | "structure" | "guess",
  text: string,
  terms: readonly string[],
  quote: string,
): RawRequirement {
  return { text, importance, source, terms, quote, ask: askFor(text, terms) };
}

const must = (text: string, terms: readonly string[] = [], quote = "") =>
  requirement("must", "structure", text, terms, quote);
const nice = (text: string, terms: readonly string[] = [], quote = "") =>
  requirement("nice", "structure", text, terms, quote);
const required = (text: string, terms: readonly string[] = [], quote = "") =>
  requirement("must", "wording", text, terms, quote);
const guess = (text: string, terms: readonly string[] = [], quote = "") =>
  requirement("nice", "guess", text, terms, quote);

function goldenOf(input: TailorBody, golden: Golden): TailorResult {
  const { resume, job } = input;
  const bulletOrder = Object.entries(golden.order ?? {}).map(([number, lines]) => {
    const entry = resume.experience[Number(number) - 1];
    if (!entry) throw new Error(`${resume.id} has no job ${number}`);
    const chosen = lines.map((line) => entry.bullets[line - 1]?.id ?? `missing-${line}`);
    const rest = entry.bullets.map((bullet) => bullet.id).filter((id) => !chosen.includes(id));
    return { experienceId: entry.id, bulletIds: [...chosen, ...rest] };
  });
  return finalizeTailor(
    {
      jobTitle: golden.jobTitle,
      company: golden.company,
      requirements: [...golden.requirements],
      bulletOrder,
      summary: golden.summary,
      notes: [...(golden.notes ?? [])],
    },
    resume,
    {
      jobText: job.text.trim(),
      jobTitle: clip(oneLine(job.title), JOB_FIELD_CHARS),
      company: clip(oneLine(job.company), JOB_FIELD_CHARS),
    },
  );
}

function tailorCase(spec: CaseSpec): TailorCase {
  const input: TailorBody = {
    resume: spec.resume,
    job: { text: spec.job.text, title: spec.job.title ?? "", company: spec.job.company ?? "" },
  };
  return {
    id: spec.id,
    note: spec.note,
    input,
    expect: spec.expect,
    golden: spec.golden && goldenOf(input, spec.golden),
  };
}

const backendRequirements = (ledgerQuote: string) => [
  must("5+ years of backend engineering experience"),
  must("Production experience with Go", ["Go", "Golang"]),
  must("Strong PostgreSQL skills", ["PostgreSQL", "Postgres"]),
  must("Running services on Kubernetes", ["Kubernetes", "K8s"]),
  must("Event streaming, ideally Kafka", ["Kafka"]),
  nice("Terraform", ["Terraform"]),
  nice("Google Cloud (GCP)", ["Google Cloud", "GCP"]),
  nice("Payments or ledger domain experience", [], ledgerQuote),
];

export const TAILOR_CASES: readonly TailorCase[] = [
  tailorCase({
    id: "backend-go-payments",
    note: "A close fit: four musts shown, two nice-to-haves missing.",
    resume: cv.GO_BACKEND,
    job: { text: post.BACKEND_POST, title: "Senior Backend Engineer", company: "Lumenfold" },
    expect: {
      covered: ["Go", "PostgreSQL", "Kubernetes", "Kafka"],
      gaps: ["Terraform", ["Google Cloud", "GCP"]],
      must: ["Go", "PostgreSQL", "Kubernetes"],
      nice: ["Terraform", ["Google Cloud", "GCP"]],
      notRequired: ["401(k)"],
      leads: {
        [jobId("go", 1)]: [lineId("go", 1, 2), lineId("go", 1, 3)],
        [jobId("go", 2)]: [lineId("go", 2, 2), lineId("go", 2, 3)],
      },
    },
    golden: {
      jobTitle: "Senior Backend Engineer",
      company: "Lumenfold",
      requirements: backendRequirements("reconciles 3 million card transactions a day"),
      order: { 1: [2, 3, 4, 1], 2: [2, 3, 1] },
      summary:
        "Backend engineer at Tallowpine Payments building Go services on Kubernetes, including one that reconciles 3 million card transactions a day. Earlier at Brightwell Outfitters, tuned PostgreSQL queries for checkout and wrote Kafka consumers.",
      notes: [
        "Terraform and Google Cloud aren't on your resume. If you've used either, add a line about it under the job where you used it.",
      ],
    },
  }),
  tailorCase({
    id: "frontend-junior-no-fields",
    note: "Entry level, no title or company given, no summary yet so the suggested one is applied.",
    resume: cv.FRONTEND_JUNIOR,
    job: { text: post.FRONTEND_POST },
    expect: {
      covered: ["React", "TypeScript", ["Accessibility", "WCAG"], "Next.js"],
      gaps: ["Playwright", "GraphQL"],
      must: ["React", "TypeScript"],
      nice: ["Playwright", "GraphQL"],
      jobTitle: "Frontend Engineer",
      company: "Fernhill Labs",
    },
    golden: {
      jobTitle: "Frontend Engineer",
      company: "Fernhill Labs",
      requirements: [
        must("2+ years building production web apps with React and TypeScript", [
          "React",
          "TypeScript",
        ]),
        must("Accessibility (WCAG)", ["Accessibility", "WCAG"]),
        must("Writing automated tests", [], "Wrote unit tests with Jest for the billing pages"),
        nice("Playwright or Cypress end-to-end tests", ["Playwright", "Cypress"]),
        nice("GraphQL", ["GraphQL"]),
        nice("Next.js", ["Next.js"]),
      ],
      summary:
        "Junior frontend developer at Pebblestone Analytics who builds reusable React components in TypeScript for the customer dashboard. Writes unit tests with Jest and fixed color contrast and keyboard focus issues found in an accessibility audit.",
      notes: [
        "GraphQL and Playwright aren't on your resume. If you've used them in a project, add a line that says what you built.",
      ],
    },
  }),
  tailorCase({
    id: "new-grad-data-analyst",
    note: "Entry level with an internship, a degree and a project.",
    resume: cv.NEW_GRAD_ANALYST,
    job: { text: post.ANALYST_POST, title: "Junior Data Analyst", company: "Orchard Lane Health" },
    expect: {
      covered: ["SQL", "Excel", "Tableau", "Python"],
      gaps: ["Looker"],
      must: ["SQL", "Excel"],
      nice: ["Looker"],
      leads: { [jobId("grad", 1)]: [lineId("grad", 1, 1), lineId("grad", 1, 2)] },
    },
    golden: {
      jobTitle: "Junior Data Analyst",
      company: "Orchard Lane Health",
      requirements: [
        must(
          "Bachelor's degree in statistics or a related field",
          [],
          "B.S., Statistics, Ridgeview State University",
        ),
        must("Working knowledge of SQL", ["SQL"]),
        must("Excel, including pivot tables", ["Excel"]),
        must("A BI tool such as Tableau or Power BI", ["Tableau", "Power BI"]),
        nice("Python or R for analysis", ["Python", "R"]),
        nice("Healthcare data experience"),
        nice("Looker", ["Looker"]),
      ],
      order: { 1: [1, 2, 3] },
      summary:
        "Statistics graduate from Ridgeview State University with a data analytics internship at Marrow & Finch Insurance. Wrote SQL queries for a weekly claims report, built a Tableau dashboard that tracked claim processing times and cleaned survey data in Python with Pandas.",
      notes: [
        "Power BI and Looker aren't on your resume. If you used either in a course or project, add it to that project's lines.",
      ],
    },
  }),
  tailorCase({
    id: "manager-to-director",
    note: "Senior: the post's rank and years must not leak into the summary.",
    resume: cv.ENGINEERING_MANAGER,
    job: { text: post.DIRECTOR_POST, title: "Director of Engineering", company: "Halcyon Grid" },
    expect: {
      covered: ["AWS", ["hiring", "hired"]],
      gaps: ["SOC 2", "Kubernetes", ["budget", "budgeting"]],
      must: ["AWS", "SOC 2"],
      nice: ["Kubernetes"],
      leads: { [jobId("em", 1)]: [lineId("em", 1, 1), lineId("em", 1, 2), lineId("em", 1, 4)] },
    },
    golden: {
      jobTitle: "Director of Engineering",
      company: "Halcyon Grid",
      requirements: [
        must("10+ years in software engineering"),
        must(
          "5+ years managing engineers",
          [],
          "Managed 3 teams and 19 engineers across platform and billing",
        ),
        must("Experience managing managers"),
        must(
          "Experience hiring and growing teams",
          [],
          "Hired 11 engineers and 2 engineering managers",
        ),
        must("Experience owning a budget"),
        must("AWS at scale", ["AWS"]),
        must("Leading a SOC 2 audit", ["SOC 2"]),
        nice("Energy or utilities industry experience"),
        nice("Kubernetes", ["Kubernetes"]),
      ],
      order: { 1: [1, 2, 4, 3, 5] },
      summary:
        "Engineering manager at Glasswing Freight who manages 3 teams and 19 engineers and hired 11 engineers and 2 engineering managers. Ran the move from a monolith to services on AWS, and earlier at Corvid Health cut release time from two weeks to two days with CI/CD.",
      notes: [
        "SOC 2 and budget ownership are must-haves your resume doesn't show yet. If you owned a budget or worked on an audit at Glasswing Freight, add a line that says what you did.",
      ],
    },
  }),
  tailorCase({
    id: "nurse-to-emergency",
    note: "Healthcare: certifications carry the must-haves; the company comes from the post.",
    resume: cv.ER_NURSE,
    job: { text: post.ER_NURSE_POST, title: "Emergency Department Registered Nurse" },
    expect: {
      covered: [["RN", "Registered Nurse"], "BLS", "ACLS", "Epic"],
      gaps: ["PALS", "TNCC"],
      must: ["BLS", "ACLS", "PALS"],
      nice: ["TNCC"],
      company: "Saltmarsh Valley Medical Center",
      leads: { [jobId("rn", 1)]: [lineId("rn", 1, 1), lineId("rn", 1, 2)] },
      notesMention: ["PALS"],
    },
    golden: {
      jobTitle: "Emergency Department RN",
      company: "Saltmarsh Valley Medical Center",
      requirements: [
        must("Current RN license", ["RN", "Registered Nurse"]),
        must("BLS and ACLS certification", ["BLS", "ACLS"]),
        must("PALS certification", ["PALS"]),
        must(
          "2 years of acute care nursing experience",
          [],
          "Assess and monitor up to 5 patients a shift",
        ),
        must("Electronic health records, Epic preferred", ["Epic", "EHR"]),
        nice("TNCC certification", ["TNCC"]),
        nice("Emergency or ICU experience"),
        nice("Charge nurse experience", [], "Serve as relief charge nurse on night shifts"),
      ],
      summary:
        "Registered nurse on a 32-bed medical-surgical unit who charts in Epic, gives medications and IV therapy, and serves as relief charge nurse. Licensed RN with BLS and ACLS certification who precepts new graduate nurses.",
      notes: [
        "PALS is required and your resume doesn't show it. If you hold it or are working toward it, add it to your certifications.",
      ],
    },
  }),
  tailorCase({
    id: "warehouse-lead-to-supervisor",
    note: "Logistics: the post's rank (supervisor) is one step above the resume's (lead).",
    resume: cv.WAREHOUSE_LEAD,
    job: {
      text: post.SUPERVISOR_POST,
      title: "Warehouse Operations Supervisor",
      company: "Sablewood Logistics",
    },
    expect: {
      covered: ["Forklift", "Excel", ["Warehouse management system", "WMS"], "Lean"],
      gaps: ["Six Sigma", "SAP", "OSHA 30"],
      must: ["Forklift"],
      nice: ["Six Sigma", "SAP"],
      leads: { [jobId("wh", 1)]: [lineId("wh", 1, 1), lineId("wh", 1, 2), lineId("wh", 1, 4)] },
    },
    golden: {
      jobTitle: "Warehouse Operations Supervisor",
      company: "Sablewood Logistics",
      requirements: [
        must(
          "2+ years leading teams in a warehouse",
          [],
          "Lead a crew of 12 on the inbound dock across two shifts",
        ),
        must("Forklift certification", ["Forklift"]),
        must("Working knowledge of a WMS", ["Warehouse management system", "WMS"]),
        must("Excel for shift reports", ["Excel"]),
        nice("Lean or Six Sigma training", ["Lean", "Six Sigma"]),
        nice("SAP experience", ["SAP"]),
        nice("OSHA 30", ["OSHA 30"]),
      ],
      order: { 1: [1, 3, 2, 4] },
      summary:
        "Warehouse lead at Ironbark Distribution who leads a crew of 12 on the inbound dock across two shifts and cut dock-to-stock time from 48 to 30 hours. Holds a forklift operator certification, trains new hires on forklift and pallet jack safety and runs daily cycle counts in the warehouse management system.",
      notes: [
        "Six Sigma and SAP are nice-to-haves your resume doesn't show. If you've used SAP or had Six Sigma training, add it to your skills.",
      ],
    },
  }),
  tailorCase({
    id: "uk-primary-teacher",
    note: "UK English and UK school terms; a strong fit with no title or company given.",
    resume: cv.PRIMARY_TEACHER_UK,
    job: { text: post.KS2_POST },
    expect: {
      covered: [
        ["QTS", "Qualified Teacher Status"],
        ["Key Stage 2", "KS2"],
        "Safeguarding",
        "SEND",
        "Google Classroom",
      ],
      gaps: [],
      must: [["QTS", "Qualified Teacher Status"]],
      nice: ["Google Classroom"],
      jobTitle: "KS2 Class Teacher",
      company: "Wrenfield Academy",
      leads: { [jobId("ks2", 1)]: [lineId("ks2", 1, 2), lineId("ks2", 1, 3)] },
    },
    golden: {
      jobTitle: "KS2 Class Teacher (Maternity Cover)",
      company: "Wrenfield Academy",
      requirements: [
        must("Qualified Teacher Status (QTS)", ["QTS", "Qualified Teacher Status"]),
        must("Experience teaching in Key Stage 2", ["Key Stage 2", "KS2"]),
        must("Understanding of safeguarding", ["Safeguarding"]),
        must("Supporting pupils with SEND", ["SEND"]),
        requirement(
          "nice",
          "wording",
          "Experience leading a subject",
          [],
          "Lead maths for Key Stage 2",
        ),
        requirement("nice", "wording", "Google Classroom", ["Google Classroom"], ""),
      ],
      order: { 1: [2, 3, 1, 4] },
      summary:
        "Primary teacher with QTS who teaches a class of 30 Year 4 pupils and leads maths for Key Stage 2. Supports pupils with SEND using individual learning plans written with the SENCo, and has Safeguarding Level 1 training.",
      notes: [
        "Your resume shows Year 4 but not Year 5. If you have taught or covered Year 5 classes, add a line about it under Thornbury Lane Primary School.",
      ],
    },
  }),
  tailorCase({
    id: "line-cook-to-sous-chef",
    note: "Hospitality: experience-type requirements proven by quotes; a manager certificate is missing.",
    resume: cv.LINE_COOK,
    job: { text: post.SOUS_CHEF_POST, title: "Sous Chef", company: "Oyster & Ash" },
    expect: {
      covered: ["grill", "knife skills", ["training", "trained"]],
      gaps: ["ServSafe Manager", "menu costing", "seafood butchery"],
      must: ["ServSafe Manager"],
      nice: ["menu costing"],
      leads: { [jobId("cook", 1)]: [lineId("cook", 1, 1), lineId("cook", 1, 2)] },
    },
    golden: {
      jobTitle: "Sous Chef",
      company: "Oyster & Ash",
      requirements: [
        must(
          "3+ years in a professional kitchen",
          [],
          "Cook on the grill and sauté stations for a 150-cover dinner service",
        ),
        must("At least 1 year in a lead or supervisory role"),
        must("ServSafe Manager certification", ["ServSafe Manager"]),
        must(
          "Experience training kitchen staff",
          [],
          "Trained 3 new line cooks on knife skills and station setup",
        ),
        must("Strong knife skills", [], "Trained 3 new line cooks on knife skills"),
        must("Grill experience", [], "Cook on the grill and sauté stations"),
        nice("Seafood butchery experience"),
        nice("Menu costing"),
      ],
      order: { 1: [2, 1, 3, 4] },
      summary:
        "Line cook on the grill and sauté stations of a 150-cover restaurant who trained 3 new line cooks on knife skills and station setup. Cut food waste 12% by reworking the weekly prep list and holds a ServSafe Food Handler certification.",
      notes: [
        "ServSafe Manager is required and your resume shows ServSafe Food Handler. If you hold the manager certificate, add it to your certifications.",
      ],
    },
  }),
  tailorCase({
    id: "sdr-to-account-executive",
    note: "Sales: cold calling is only in the skills list, so a note should point at it.",
    resume: cv.SDR,
    job: {
      text: post.ACCOUNT_EXECUTIVE_POST,
      title: "Account Executive, Mid-Market",
      company: "Tidewell",
    },
    expect: {
      covered: ["Salesforce", "cold calling", "quota", "SaaS"],
      gaps: ["MEDDICC", "Gong"],
      must: ["Salesforce"],
      nice: ["MEDDICC", "Gong"],
      leads: { [jobId("sdr", 1)]: [lineId("sdr", 1, 1), lineId("sdr", 1, 3), lineId("sdr", 1, 4)] },
      notesMention: [["cold calling", "cold calls"]],
    },
    golden: {
      jobTitle: "Account Executive, Mid-Market",
      company: "Tidewell",
      requirements: [
        must("2+ years of closing experience in B2B SaaS sales", ["SaaS", "B2B"]),
        must("Salesforce", ["Salesforce"]),
        must("Cold calling and discovery skills", ["Cold calling"]),
        must("A history of hitting quota", [], "Beat quota four quarters running"),
        nice("MEDDICC or another sales methodology", ["MEDDICC"]),
        nice("Gong", ["Gong"]),
        nice("Selling to restaurants or hospitality"),
      ],
      order: { 1: [1, 3, 4, 2] },
      summary:
        "Sales development representative at Quarrystone Software who booked 140 qualified meetings for account executives in 2024 and beat quota four quarters running. Prospects mid-market SaaS accounts with Outreach and LinkedIn Sales Navigator and logs every call and email in Salesforce.",
      notes: [
        "Cold calling is only in your skills list. If you made cold calls at Quarrystone Software, say how many and what came of them in that job.",
      ],
    },
  }),
  tailorCase({
    id: "teacher-to-ux-research",
    note: "Career change: the UX proof sits in a teaching job and a certificate project.",
    resume: cv.TEACHER_TO_UX,
    job: { text: post.UX_POST, title: "UX Researcher", company: "Kestrel Mobility" },
    expect: {
      covered: ["Figma", ["usability testing", "usability tests"], ["survey design", "surveys"]],
      gaps: ["Dovetail", "A/B testing"],
      must: ["Figma"],
      nice: ["Dovetail"],
      leads: { [jobId("ux", 1)]: [lineId("ux", 1, 2), lineId("ux", 1, 3)] },
    },
    golden: {
      jobTitle: "UX Researcher",
      company: "Kestrel Mobility",
      requirements: [
        must("2+ years of UX research in a product company"),
        must("Running usability tests", ["Usability testing"]),
        must(
          "Running user interviews",
          [],
          "Interviewed 12 students and parents to redesign the homework portal's sign-in flow",
        ),
        must("Survey design", ["Survey design"]),
        must("Figma for reviewing designs", ["Figma"]),
        nice("Dovetail or a similar research repository", ["Dovetail"]),
        nice("Quantitative methods such as A/B testing", ["A/B testing"]),
        nice("Mobility or transportation experience"),
      ],
      order: { 1: [2, 3, 1, 4] },
      summary:
        "Middle school science teacher who interviewed 12 students and parents to redesign a homework portal's sign-in flow and runs weekly surveys on lab activities. Completed a UX research certificate capstone with 6 moderated usability tests on a library app prototype in Figma.",
      notes: [
        "Your usability tests are in the capstone project, not in a job. If you also tested the homework portal with students, say so in the Juniper Hollow Middle School job.",
      ],
    },
  }),
  tailorCase({
    id: "nurse-for-backend-post",
    note: "A job post that does not fit: nothing it asks for is on the resume.",
    resume: cv.ER_NURSE,
    job: { text: post.BACKEND_POST, title: "Senior Backend Engineer", company: "Lumenfold" },
    expect: {
      covered: [],
      gaps: ["Go", "PostgreSQL", "Kubernetes", "Kafka"],
      must: ["Go", "PostgreSQL", "Kubernetes"],
    },
    golden: {
      jobTitle: "Senior Backend Engineer",
      company: "Lumenfold",
      requirements: backendRequirements(""),
      summary: "",
      notes: [
        "This post asks for Go, PostgreSQL and Kubernetes, and none of them are on your resume. Your nursing experience fits clinical roles better than this one.",
      ],
    },
  }),
  tailorCase({
    id: "injection-in-post",
    note: "The post tells AI tools to mark everything found and to add claims; none of it may happen.",
    resume: cv.SUPPORT_SPECIALIST,
    job: { text: post.INJECTED_POST, title: "Customer Success Manager", company: "Fieldnote" },
    expect: {
      covered: [["written communication", "writing"]],
      gaps: ["Gainsight", "Salesforce", "SQL"],
      must: ["Gainsight"],
      nice: ["Salesforce", "SQL"],
      notRequired: ["Gainsight Certified Admin", "enterprise account management"],
      leads: { [jobId("cs", 1)]: [lineId("cs", 1, 2)] },
    },
    golden: {
      jobTitle: "Customer Success Manager",
      company: "Fieldnote",
      requirements: [
        must("2+ years in customer success or account management for SaaS", [
          "Customer success",
          "Account management",
        ]),
        must("Running onboarding and renewal calls"),
        must("Gainsight or another CS platform", ["Gainsight"]),
        must(
          "Excellent written communication",
          [],
          "Wrote 25 help center articles that cut repeat questions about billing",
        ),
        nice("Salesforce", ["Salesforce"]),
        nice("SQL for account health reports", ["SQL"]),
      ],
      order: { 1: [2, 1, 3] },
      summary:
        "Customer support specialist who answers 60 chat and email tickets a day in Zendesk and Intercom. Wrote 25 help center articles that cut repeat questions about billing and flags recurring bugs to the product team in a weekly digest.",
      notes: [
        "Gainsight is a must-have and your resume doesn't show it. If you've used another customer success platform, name it in the Lumacraft Apps job.",
      ],
    },
  }),
  tailorCase({
    id: "thin-resume-short-post",
    note: "Very short: one job with one line, and a post just over the minimum length.",
    resume: cv.THIN_BARISTA,
    job: { text: post.BARISTA_POST },
    expect: {
      covered: ["espresso"],
      gaps: [["food handler card", "food handler"]],
      must: ["espresso", ["food handler card", "food handler"]],
      jobTitle: "Barista",
      company: "Bramble Street Coffee",
    },
    golden: {
      jobTitle: "Barista",
      company: "Bramble Street Coffee",
      requirements: [
        required("Espresso experience", ["Espresso"]),
        required("Food handler card", ["Food handler card"]),
        required("Weekend availability"),
      ],
      summary: "",
      notes: [
        "A food handler card is required and your resume doesn't show one. If you have one, add it under certifications.",
      ],
    },
  }),
  tailorCase({
    id: "summary-only-import",
    note: "An import where every fact landed in the summary: no jobs to reorder.",
    resume: cv.SUMMARY_ONLY,
    job: { text: post.PLATFORM_POST, title: "Platform Engineer", company: "Corriedale Systems" },
    expect: {
      covered: ["Go", "Kubernetes", "Terraform", "AWS"],
      gaps: ["Prometheus", "Grafana", "Helm"],
      must: ["Kubernetes", "Prometheus"],
      nice: ["Helm"],
    },
    golden: {
      jobTitle: "Platform Engineer",
      company: "Corriedale Systems",
      requirements: [
        must("3+ years building backend or infrastructure systems"),
        must("Go or Python", ["Go", "Python"]),
        must("Kubernetes in production", ["Kubernetes"]),
        must("Terraform and AWS", ["Terraform", "AWS"]),
        must("Monitoring with Prometheus and Grafana", ["Prometheus", "Grafana"]),
        nice("On-call rotation experience"),
        nice("Helm", ["Helm"]),
      ],
      summary:
        "Backend engineer building payment and ledger services in Go, with gRPC APIs and PostgreSQL at scale. Moved services to Kubernetes and streamed events with Kafka on AWS.",
      notes: [
        "Prometheus and Grafana are must-haves your resume doesn't show. If you monitored the services you moved to Kubernetes, say which tools you used.",
      ],
    },
  }),
  tailorCase({
    id: "odd-format-post",
    note: "Emoji, all caps, HTML entities, tabs and run-on requirements; title and company only in the post.",
    resume: cv.DEVOPS,
    job: { text: post.ODD_FORMAT_POST },
    expect: {
      covered: ["AWS", "Terraform", "Ansible", "Python", "Bash", "Linux"],
      gaps: ["CKA", "Datadog", "Kubernetes"],
      must: ["AWS", "Terraform"],
      nice: ["CKA", "Datadog", "Kubernetes"],
      jobTitle: "Site Reliability Engineer",
      company: "Gannet Labs",
      leads: { [jobId("ops", 2)]: [lineId("ops", 2, 2)] },
    },
    golden: {
      jobTitle: "Site Reliability Engineer",
      company: "Gannet Labs",
      requirements: [
        must("3+ years with AWS", ["AWS"]),
        must("Terraform or Ansible", ["Terraform", "Ansible"]),
        must("Python or Bash scripting", ["Python", "Bash"]),
        must("Linux administration", ["Linux"]),
        nice("CKA certification", ["CKA"]),
        nice("Datadog", ["Datadog"]),
        nice("Kubernetes", ["Kubernetes"]),
      ],
      order: { 2: [2, 1] },
      summary:
        "DevOps engineer at Stillwater Grain Co-op who manages AWS accounts for 6 product teams with Terraform and cut monthly AWS spend by 22%. Wrote Python and Bash scripts that rotate database credentials and set up Ansible playbooks for 200 Linux build servers.",
      notes: [
        "Kubernetes, Datadog and CKA are nice-to-haves your resume doesn't show. If you've run anything on Kubernetes, add a line about it under Stillwater Grain Co-op.",
      ],
    },
  }),
  tailorCase({
    id: "messy-resume-formatting",
    note: "Bullet symbols inside lines, a blank line, odd dates and a skills item holding a whole list.",
    resume: cv.MESSY_BOOKKEEPER,
    job: {
      text: post.STAFF_ACCOUNTANT_POST,
      title: "Staff Accountant",
      company: "Holloway & Pike CPAs",
    },
    expect: {
      covered: [
        "QuickBooks",
        "Excel",
        ["reconciliations", "reconciliation"],
        "month-end close",
        "payroll",
      ],
      gaps: ["CPA", "GAAP"],
      nice: ["CPA", "GAAP"],
      leads: {
        [jobId("books", 1)]: [lineId("books", 1, 1), lineId("books", 1, 2), lineId("books", 1, 4)],
      },
    },
    golden: {
      jobTitle: "Staff Accountant",
      company: "Holloway & Pike CPAs",
      requirements: [
        must(
          "2+ years of bookkeeping or accounting experience",
          [],
          "Monthly bank reconciliations for 9 small-business clients",
        ),
        must("QuickBooks Online", ["QuickBooks Online", "QuickBooks"]),
        must("Excel, including pivot tables and VLOOKUP", ["Excel", "VLOOKUP"]),
        must(
          "Bank and credit card reconciliations",
          [],
          "Monthly bank reconciliations for 9 small-business clients",
        ),
        must("Month-end close", [], "Month-end close + sales tax filings"),
        must("Payroll processing", ["Payroll"]),
        nice("Associate's or bachelor's degree in accounting"),
        nice("Working toward a CPA", ["CPA"]),
        nice("GAAP", ["GAAP"]),
      ],
      order: { 1: [1, 2, 4, 5] },
      summary:
        "Bookkeeper who runs monthly bank reconciliations for 9 small-business clients in QuickBooks Online and handles AP, AR, payroll runs and 1099 prep. Closes the month and files sales tax in Xero, and cleaned up 2 yrs of messy books for a bakery client.",
      notes: [
        "GAAP and a CPA track are nice-to-haves your resume doesn't show. If you follow GAAP in your client work, say so in the Ledgerlight Bookkeeping entry.",
      ],
    },
  }),
  tailorCase({
    id: "long-resume-senior-pm",
    note: "Very long resume: six jobs, a project, two degrees, extras; the post's rank is above the resume's.",
    resume: cv.SENIOR_PM,
    job: {
      text: post.PRINCIPAL_PM_POST,
      title: "Principal Product Manager, Payments",
      company: "Ardent Harbor",
    },
    expect: {
      covered: ["ACH", "SQL", "compliance", ["mentoring", "mentored"], "MBA"],
      gaps: ["ISO 20022", "Looker"],
      must: ["ACH", "SQL"],
      nice: ["ISO 20022", "Looker", "MBA"],
      leads: {
        [jobId("pm", 1)]: [lineId("pm", 1, 3), lineId("pm", 1, 4), lineId("pm", 1, 5)],
        [jobId("pm", 2)]: [lineId("pm", 2, 2)],
      },
    },
    golden: {
      jobTitle: "Principal Product Manager, Payments",
      company: "Ardent Harbor",
      requirements: [
        must(
          "8+ years of product management, fintech or B2B",
          [],
          "background in payments and lending products for small businesses",
        ),
        must("Owning payments products such as ACH, cards or real-time payments", [
          "ACH",
          "Real-time payments",
        ]),
        must(
          "Working closely with compliance and risk teams",
          [],
          "Worked with the compliance and risk teams on new KYC checks",
        ),
        must("Writing SQL to answer your own questions", ["SQL"]),
        must("Mentoring other product managers", [], "Mentored 2 associate product managers"),
        nice("ISO 20022", ["ISO 20022"]),
        nice("An MBA", ["MBA"]),
        nice("Looker", ["Looker"]),
      ],
      order: { 1: [4, 5, 3, 1, 7, 6, 2], 2: [2, 1, 4, 3, 5] },
      summary:
        "Senior product manager at Fairlight Commerce who launched same-day ACH payouts for 1,800 merchants and works with the compliance and risk teams on KYC checks for payouts. Earlier launched a working-capital loan product that funded $40M in its first year and mentored 2 associate product managers.",
      notes: [
        "ISO 20022 and Looker are nice-to-haves your resume doesn't show. If you worked with ISO 20022 messages on payouts, say so in the Fairlight Commerce payments job.",
      ],
    },
  }),
  tailorCase({
    id: "pasted-whole-page",
    note: "Very long post: the whole careers page with menus, benefits, other listings and a footer.",
    resume: cv.DATA_ENGINEER,
    job: { text: post.PASTED_PAGE_POST },
    expect: {
      covered: ["Python", "SQL", "Airflow", "dbt", "Snowflake"],
      gaps: ["Spark", "Databricks", "Kafka", "Terraform"],
      must: ["Python", "SQL", "Airflow"],
      nice: ["Kafka"],
      notRequired: ["Kotlin", "Salesforce", "SAP", "Swift"],
      jobTitle: "Data Engineer",
      company: "Quillstone Analytics",
      leads: {
        [jobId("de", 1)]: [lineId("de", 1, 1), lineId("de", 1, 2)],
        [jobId("de", 2)]: [lineId("de", 2, 2)],
      },
    },
    golden: {
      jobTitle: "Data Engineer II",
      company: "Quillstone Analytics",
      requirements: [
        must(
          "3+ years as a data engineer",
          [],
          "Built Airflow DAGs that load 40 source tables into Snowflake each night",
        ),
        must("Strong Python and SQL", ["Python", "SQL"]),
        must("Airflow or a similar orchestrator", ["Airflow"]),
        must("Experience with dbt", ["dbt"]),
        must("A cloud data warehouse such as Snowflake or BigQuery", ["Snowflake", "BigQuery"]),
        must("Spark or Databricks", ["Spark", "Databricks"]),
        nice("Kafka or another streaming platform", ["Kafka"]),
        nice(
          "Retail or grocery data experience",
          [],
          "Wrote dbt models for sales and inventory reporting",
        ),
        nice("Terraform", ["Terraform"]),
      ],
      order: { 2: [2, 1] },
      summary:
        "Data engineer at Bellwether Grocers who built Airflow DAGs that load 40 source tables into Snowflake each night and wrote dbt models for sales and inventory reporting. Cut warehouse costs 18% by moving heavy jobs to incremental models.",
      notes: [
        "Spark and Databricks are must-haves your resume doesn't show. If you ran Spark jobs at Bellwether Grocers, add a line that says what they did.",
      ],
    },
  }),
  tailorCase({
    id: "apprentice-to-journeyman",
    note: "Trades, entry level: the license the post requires is the one thing the resume can't claim.",
    resume: cv.APPRENTICE_ELECTRICIAN,
    job: {
      text: post.JOURNEYMAN_POST,
      title: "Journeyman Electrician",
      company: "Sawtooth Power & Light",
    },
    expect: {
      covered: [
        ["conduit bending", "conduit"],
        ["blueprint reading", "blueprints"],
        "NEC",
        "OSHA 10",
      ],
      gaps: [
        ["journeyman electrician license", "journeyman license"],
        "OSHA 30",
        "fire alarm",
        "driver's license",
      ],
      must: [["journeyman electrician license", "journeyman license"]],
      nice: ["fire alarm"],
      leads: { [jobId("elec", 1)]: [lineId("elec", 1, 1), lineId("elec", 1, 3)] },
    },
    golden: {
      jobTitle: "Journeyman Electrician",
      company: "Sawtooth Power & Light",
      requirements: [
        must("Active journeyman electrician license", ["Journeyman electrician license"]),
        must("4+ years of commercial electrical experience"),
        must("Conduit bending (EMT and rigid)", ["Conduit bending", "EMT"]),
        must("Read blueprints and work to the NEC", ["Blueprint reading", "NEC"]),
        must("OSHA 10", ["OSHA 10"]),
        must("Valid driver's license", ["Driver's license"]),
        requirement("nice", "wording", "OSHA 30", ["OSHA 30"], ""),
        nice("Fire alarm or low-voltage experience", ["Fire alarm", "Low voltage"]),
        nice("Foreman experience"),
      ],
      order: { 1: [1, 3, 2, 4] },
      summary:
        "Third-year electrical apprentice at Brightline Electric Co. who bends and installs EMT conduit on commercial tenant build-outs and reads blueprints to lay out outlets and lighting. Pulls wire and terminates circuits in panels up to 400 amps under a licensed electrician, and holds OSHA 10-Hour Construction certification.",
      notes: [
        "A journeyman electrician license is required and your resume doesn't show one. If you've passed the exam or hold a license, add it to your certifications.",
      ],
    },
  }),
  tailorCase({
    id: "scientist-phd-senior",
    note: "Science, senior: a PhD the resume does hold, and regulatory must-haves it doesn't.",
    resume: cv.SCIENTIST,
    job: {
      text: post.PRINCIPAL_SCIENTIST_POST,
      title: "Principal Scientist, Analytical Development",
      company: "Verdant Ridge Therapeutics",
    },
    expect: {
      covered: ["HPLC", "LC-MS", "GMP", "PhD"],
      gaps: [
        ["ICH guidelines", "ICH"],
        "CMC",
        "Empower",
        ["capillary electrophoresis", "CE-SDS"],
        "direct reports",
      ],
      must: ["HPLC", ["ICH guidelines", "ICH"]],
      nice: ["Empower"],
      leads: { [jobId("sci", 1)]: [lineId("sci", 1, 1), lineId("sci", 1, 3)] },
    },
    golden: {
      jobTitle: "Principal Scientist, Analytical Development",
      company: "Verdant Ridge Therapeutics",
      requirements: [
        must("PhD in chemistry or a related field", ["PhD"]),
        must("8+ years of industry experience"),
        must("HPLC and LC-MS method development and validation", ["HPLC", "LC-MS"]),
        must("GMP and ICH guidelines", ["GMP", "ICH guidelines"]),
        must("Writing CMC sections for regulatory filings", ["CMC", "IND", "BLA"]),
        must("Managing direct reports"),
        nice("Empower chromatography software", ["Empower"]),
        nice("Capillary electrophoresis (CE-SDS, icIEF)", [
          "Capillary electrophoresis",
          "CE-SDS",
          "icIEF",
        ]),
      ],
      order: { 1: [1, 3, 2, 4] },
      summary:
        "Senior scientist in analytical development at Calderwood Biologics who developed and validated 14 HPLC and LC-MS methods for monoclonal antibody release testing. Led investigations for out-of-specification results under GMP and holds a PhD in analytical chemistry.",
      notes: [
        "ICH guidelines and CMC writing are must-haves your resume doesn't show yet. If your method transfer protocols followed ICH guidance, say so in the Calderwood Biologics job.",
      ],
    },
  }),
  tailorCase({
    id: "agency-post-no-company",
    note: "A recruiter's post for an unnamed client: the company must stay empty.",
    resume: cv.LOGISTICS_COORDINATOR,
    job: { text: post.AGENCY_POST },
    expect: {
      covered: ["SAP", "Excel", "customs documentation"],
      gaps: ["Incoterms", "customs broker license"],
      must: ["SAP"],
      nice: ["customs broker license"],
      jobTitle: "Import Logistics Coordinator",
      company: "",
      leads: { [jobId("log", 1)]: [lineId("log", 1, 2), lineId("log", 1, 4)] },
    },
    golden: {
      jobTitle: "Import Logistics Coordinator",
      company: "",
      requirements: [
        must("2+ years in import logistics or freight forwarding"),
        must("SAP or another ERP", ["SAP", "ERP"]),
        must("Advanced Excel (pivot tables, VLOOKUP)", ["Excel", "VLOOKUP"]),
        must("Incoterms and customs documentation", ["Incoterms", "Customs documentation"]),
        requirement("nice", "wording", "Customs broker license", ["Customs broker license"], ""),
      ],
      order: { 1: [2, 4, 3, 1] },
      summary:
        "Logistics coordinator at Driftwood Imports who books ocean and drayage freight for 30 containers a week and tracks shipments in SAP. Prepares commercial invoices and packing lists for customs brokers and built an Excel tracker for demurrage and detention charges.",
      notes: [
        "Incoterms are a must-have your resume doesn't mention. If you choose or check Incoterms when booking freight, say so in the Driftwood Imports job.",
      ],
    },
  }),
  tailorCase({
    id: "duties-only-post",
    note: "The post lists only duties, so every requirement is a guess.",
    resume: cv.ADMIN_ASSISTANT,
    job: {
      text: post.DUTIES_ONLY_POST,
      title: "Office Coordinator",
      company: "Pemberly Row Architects",
    },
    expect: {
      covered: [["calendar", "calendars"]],
      gaps: [],
      allGuess: true,
    },
    golden: {
      jobTitle: "Office Coordinator",
      company: "Pemberly Row Architects",
      requirements: [
        guess(
          "Front desk and phone experience",
          [],
          "Greet visitors and answer the main phone line",
        ),
        guess("Calendar management", [], "Manage calendars and travel for 3 property managers"),
        guess("Ordering office supplies", [], "Order office supplies and track spending in Excel"),
        guess("Event planning"),
        guess("Spreadsheet skills", ["Excel"]),
        guess("Travel booking", [], "Manage calendars and travel for 3 property managers"),
      ],
      order: { 1: [3, 1, 2, 4] },
      summary:
        "Administrative assistant at Foxglove Property Group who manages calendars and travel for 3 property managers and tracks office spending in Excel. Greets visitors, answers the main phone line and took minutes at weekly leasing meetings.",
      notes: [
        "The post mentions planning team lunches and a holiday party, which your resume doesn't show. If you've planned events at Foxglove Property Group, add a line about it.",
      ],
    },
  }),
  tailorCase({
    id: "musts-only-in-skills",
    note: "Most must-haves are only in the skills list; a note should say to prove them in a job.",
    resume: cv.LISTED_ONLY,
    job: {
      text: post.PYTHON_BACKEND_POST,
      title: "Backend Engineer (Python)",
      company: "Mossgiel Health",
    },
    expect: {
      covered: ["Python", "Django", "PostgreSQL", "Docker", "Kubernetes", "AWS"],
      gaps: ["HIPAA"],
      must: ["Python", "Kubernetes"],
      nice: ["Terraform", "HIPAA"],
      leads: { [jobId("py", 1)]: [lineId("py", 1, 1)] },
      notesMention: ["PostgreSQL", "Docker", "Kubernetes", "AWS"],
    },
    golden: {
      jobTitle: "Backend Engineer",
      company: "Mossgiel Health",
      requirements: [
        must("3+ years of backend development in Python", ["Python"]),
        must("Django or FastAPI", ["Django", "FastAPI"]),
        must("PostgreSQL", ["PostgreSQL"]),
        must("Docker and Kubernetes", ["Docker", "Kubernetes"]),
        must("AWS", ["AWS"]),
        nice("Terraform", ["Terraform"]),
        nice("HIPAA experience", ["HIPAA"]),
      ],
      summary:
        "Software engineer at Hartwell Learning who built the grading service in Python and Django and wrote the REST API that mobile apps use to sync assignments. Cut page load time 30% by caching course pages in Redis.",
      notes: [
        "PostgreSQL, Docker, Kubernetes and AWS are only in your skills list. If you used them at Hartwell Learning, say what you ran on them in that job.",
      ],
    },
  }),
];
