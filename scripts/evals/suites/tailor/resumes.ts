import { DEFAULT_SECTION_ORDER, type ExtraSection, type Resume } from "@/lib/resume/schema";
import { TEST_RESUMES } from "../../../match-eval/resumes";

type JobSpec = {
  title: string;
  company: string;
  location?: string;
  start: string;
  end: string;
  bullets: readonly string[];
};

type SchoolSpec = {
  school: string;
  degree: string;
  field?: string;
  location?: string;
  start?: string;
  end?: string;
  bullets?: readonly string[];
};

type ResumeSpec = {
  key: string;
  name: string;
  headline?: string;
  location?: string;
  summary?: string;
  jobs: readonly JobSpec[];
  education?: readonly SchoolSpec[];
  projects?: readonly { name: string; bullets: readonly string[] }[];
  skills?: readonly { label: string; items: readonly string[] }[];
  certifications?: readonly { name: string; issuer?: string; date?: string }[];
  extras?: readonly ExtraSection[];
};

export const jobId = (key: string, job: number) => `${key}-j${job}`;
export const lineId = (key: string, job: number, line: number) => `${key}-j${job}-b${line}`;

const skillsOf = (...items: string[]) => [{ label: "", items }];

function buildResume(spec: ResumeSpec): Resume {
  const { key } = spec;
  const bullets = (prefix: string, lines: readonly string[]) =>
    lines.map((text, index) => ({ id: `${prefix}-b${index + 1}`, text }));
  return {
    id: `resume-${key}`,
    version: 1,
    title: `${spec.name} resume`,
    basics: {
      name: spec.name,
      headline: spec.headline ?? "",
      email: `${spec.name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
      phone: "",
      location: spec.location ?? "",
      links: [],
    },
    summary: spec.summary ?? "",
    experience: spec.jobs.map((job, index) => ({
      id: jobId(key, index + 1),
      company: job.company,
      title: job.title,
      location: job.location ?? "",
      startDate: job.start,
      endDate: job.end,
      bullets: bullets(jobId(key, index + 1), job.bullets),
    })),
    education: (spec.education ?? []).map((school, index) => ({
      id: `${key}-s${index + 1}`,
      school: school.school,
      degree: school.degree,
      field: school.field ?? "",
      location: school.location ?? "",
      startDate: school.start ?? "",
      endDate: school.end ?? "",
      bullets: bullets(`${key}-s${index + 1}`, school.bullets ?? []),
    })),
    projects: (spec.projects ?? []).map((project, index) => ({
      id: `${key}-p${index + 1}`,
      name: project.name,
      link: "",
      bullets: bullets(`${key}-p${index + 1}`, project.bullets),
    })),
    skills: (spec.skills ?? []).map((group, index) => ({
      id: `${key}-k${index + 1}`,
      label: group.label,
      items: [...group.items],
    })),
    certifications: (spec.certifications ?? []).map((cert, index) => ({
      id: `${key}-c${index + 1}`,
      name: cert.name,
      issuer: cert.issuer ?? "",
      date: cert.date ?? "",
    })),
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    source: "import",
    tailor: null,
    template: "classic",
    extras: [...(spec.extras ?? [])],
    createdAt: 0,
    updatedAt: 0,
  };
}

function testSummary(id: string): string {
  const found = TEST_RESUMES.find((resume) => resume.id === id);
  if (!found) throw new Error(`scripts/match-eval/resumes.ts has no resume "${id}"`);
  return found.text;
}

export const GO_BACKEND = buildResume({
  key: "go",
  name: "Dana Okoro",
  headline: "Backend Engineer",
  location: "Denver, CO",
  summary: "Backend engineer working on payment systems in Go and PostgreSQL.",
  jobs: [
    {
      title: "Backend Engineer",
      company: "Tallowpine Payments",
      location: "Denver, CO",
      start: "2021",
      end: "Present",
      bullets: [
        "Ran the on-call rotation for the ledger team",
        "Built a Go service that reconciles 3 million card transactions a day against bank files",
        "Moved 14 services from VMs to Kubernetes with Helm charts",
        "Designed gRPC APIs for refunds and chargebacks",
      ],
    },
    {
      title: "Software Engineer",
      company: "Brightwell Outfitters",
      location: "Boulder, CO",
      start: "2018",
      end: "2021",
      bullets: [
        "Maintained the order history pages in Ruby on Rails",
        "Tuned PostgreSQL queries for the checkout service, cutting p95 latency by 35%",
        "Wrote Kafka consumers that sync inventory between warehouses",
      ],
    },
  ],
  education: [
    {
      school: "University of Northfield",
      degree: "B.S.",
      field: "Computer Science",
      start: "2014",
      end: "2018",
    },
  ],
  skills: skillsOf(
    "Go",
    "PostgreSQL",
    "Kubernetes",
    "Kafka",
    "gRPC",
    "Docker",
    "Helm",
    "Ruby on Rails",
  ),
});

export const FRONTEND_JUNIOR = buildResume({
  key: "fe",
  name: "Mina Castellanos",
  headline: "Junior Frontend Developer",
  location: "Austin, TX",
  jobs: [
    {
      title: "Junior Frontend Developer",
      company: "Pebblestone Analytics",
      location: "Austin, TX",
      start: "Jun 2023",
      end: "Present",
      bullets: [
        "Built reusable React components in TypeScript for the customer dashboard",
        "Wrote unit tests with Jest for the billing pages",
        "Fixed color contrast and keyboard focus issues found in an accessibility audit",
      ],
    },
    {
      title: "Frontend Intern",
      company: "Pebblestone Analytics",
      location: "Austin, TX",
      start: "Jan 2023",
      end: "May 2023",
      bullets: [
        "Styled marketing pages with CSS and Tailwind",
        "Helped move two pages from JavaScript to TypeScript",
      ],
    },
  ],
  education: [{ school: "Lakemont State University", degree: "B.A.", field: "Graphic Design" }],
  skills: skillsOf(
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "CSS",
    "Tailwind",
    "Jest",
    "Git",
  ),
});

export const NEW_GRAD_ANALYST = buildResume({
  key: "grad",
  name: "Jonah Whitlock",
  location: "Pittsburgh, PA",
  jobs: [
    {
      title: "Data Analytics Intern",
      company: "Marrow & Finch Insurance",
      location: "Pittsburgh, PA",
      start: "May 2024",
      end: "Aug 2024",
      bullets: [
        "Wrote SQL queries to pull claims data for a weekly report",
        "Built a Tableau dashboard that tracked claim processing times",
        "Cleaned survey data in Python with Pandas",
      ],
    },
    {
      title: "Barista",
      company: "Copperleaf Coffee",
      location: "Pittsburgh, PA",
      start: "2021",
      end: "2024",
      bullets: [
        "Trained new baristas on the opening checklist",
        "Counted the cash drawer at closing",
      ],
    },
  ],
  education: [
    {
      school: "Ridgeview State University",
      degree: "B.S.",
      field: "Statistics",
      start: "2020",
      end: "2024",
      bullets: ["Capstone: forecasted bus ridership with time series models in R"],
    },
  ],
  projects: [
    {
      name: "Rental price analysis",
      bullets: [
        "Scraped 2,000 rental listings and modeled prices with linear regression in Python",
      ],
    },
  ],
  skills: skillsOf("SQL", "Python", "Pandas", "Tableau", "Excel", "R"),
});

export const ENGINEERING_MANAGER = buildResume({
  key: "em",
  name: "Ruth Abernathy-Cole",
  headline: "Engineering Manager",
  location: "Seattle, WA",
  summary: "Engineering manager who has run platform and payments teams.",
  jobs: [
    {
      title: "Engineering Manager",
      company: "Glasswing Freight",
      location: "Seattle, WA",
      start: "2020",
      end: "Present",
      bullets: [
        "Managed 3 teams and 19 engineers across platform and billing",
        "Hired 11 engineers and 2 engineering managers",
        "Set quarterly roadmaps with product and finance leads",
        "Ran the migration from a monolith to services on AWS",
        "Introduced blameless postmortems after on-call incidents",
      ],
    },
    {
      title: "Engineering Manager",
      company: "Corvid Health",
      location: "Portland, OR",
      start: "2017",
      end: "2020",
      bullets: [
        "Managed a team of 7 engineers building patient intake forms",
        "Prepared evidence for the HIPAA security review",
        "Cut release time from two weeks to two days with CI/CD",
      ],
    },
    {
      title: "Senior Software Engineer",
      company: "Corvid Health",
      location: "Portland, OR",
      start: "2014",
      end: "2017",
      bullets: ["Built the scheduling API in Java", "Mentored 4 junior engineers"],
    },
  ],
  education: [
    { school: "Cascade Pacific University", degree: "B.S.", field: "Computer Engineering" },
  ],
  skills: skillsOf("AWS", "Java", "CI/CD", "Hiring", "Roadmapping", "Incident management"),
});

export const ER_NURSE = buildResume({
  key: "rn",
  name: "Lorna Vasquez-Hale",
  headline: "Registered Nurse",
  location: "Columbus, OH",
  summary: testSummary("hc-rn-mid"),
  jobs: [
    {
      title: "Registered Nurse, Medical-Surgical Unit",
      company: "Brookhollow General Hospital",
      location: "Columbus, OH",
      start: "2021",
      end: "Present",
      bullets: [
        "Assess and monitor up to 5 patients a shift on a 32-bed medical-surgical unit",
        "Give medications and IV therapy and chart in Epic",
        "Precept new graduate nurses during their first 12 weeks",
        "Serve as relief charge nurse on night shifts",
      ],
    },
    {
      title: "Nursing Assistant",
      company: "Brookhollow General Hospital",
      location: "Columbus, OH",
      start: "2018",
      end: "2021",
      bullets: ["Took vital signs and helped patients with mobility", "Restocked supply rooms"],
    },
  ],
  education: [{ school: "Maple Crest College of Nursing", degree: "BSN", field: "Nursing" }],
  certifications: [
    { name: "Registered Nurse (RN) License", issuer: "State Board of Nursing", date: "2021" },
    { name: "BLS", date: "2024" },
    { name: "ACLS", date: "2024" },
  ],
  skills: skillsOf(
    "Patient assessment",
    "Medication administration",
    "IV therapy",
    "Wound care",
    "Epic",
    "Telemetry",
  ),
});

export const WAREHOUSE_LEAD = buildResume({
  key: "wh",
  name: "Marcus Delacroix",
  headline: "Warehouse Lead",
  location: "Reno, NV",
  jobs: [
    {
      title: "Warehouse Lead",
      company: "Ironbark Distribution",
      location: "Reno, NV",
      start: "2020",
      end: "Present",
      bullets: [
        "Lead a crew of 12 on the inbound dock across two shifts",
        "Run daily cycle counts in the warehouse management system",
        "Cut dock-to-stock time from 48 to 30 hours by reworking the putaway route",
        "Train new hires on forklift and pallet jack safety",
      ],
    },
    {
      title: "Warehouse Associate",
      company: "Ironbark Distribution",
      location: "Reno, NV",
      start: "2017",
      end: "2020",
      bullets: [
        "Picked and packed 150 orders a shift with RF scanners",
        "Kept a zero-incident safety record for 3 years",
      ],
    },
  ],
  certifications: [
    { name: "Forklift Operator Certification", date: "2017" },
    { name: "OSHA 10-Hour General Industry", date: "2019" },
  ],
  skills: skillsOf("Forklift", "RF scanning", "Cycle counting", "Lean", "Microsoft Excel"),
});

export const PRIMARY_TEACHER_UK = buildResume({
  key: "ks2",
  name: "Harriet Moss",
  headline: "Primary Teacher",
  location: "Leeds, UK",
  summary: "Primary teacher with QTS, teaching Year 4 and leading maths for Key Stage 2.",
  jobs: [
    {
      title: "Class Teacher (Year 4)",
      company: "Thornbury Lane Primary School",
      location: "Leeds",
      start: "2019",
      end: "Present",
      bullets: [
        "Teach a class of 30 Year 4 pupils across the full curriculum",
        "Lead maths for Key Stage 2, including planning the calculation policy",
        "Support pupils with SEND using individual learning plans written with the SENCo",
        "Run the after-school coding club using Scratch",
      ],
    },
    {
      title: "Teaching Assistant",
      company: "Thornbury Lane Primary School",
      location: "Leeds",
      start: "2017",
      end: "2019",
      bullets: [
        "Delivered phonics interventions for small groups in Year 1",
        "Supervised lunchtimes and playground duty",
      ],
    },
  ],
  education: [
    {
      school: "University of Westmere",
      degree: "PGCE",
      field: "Primary Education",
      start: "2018",
      end: "2019",
    },
    {
      school: "University of Westmere",
      degree: "B.A.",
      field: "English Literature",
      start: "2014",
      end: "2017",
    },
  ],
  certifications: [
    { name: "Qualified Teacher Status (QTS)", date: "2019" },
    { name: "Safeguarding Level 1 training", date: "2023" },
  ],
  skills: skillsOf(
    "Lesson planning",
    "Behaviour management",
    "Google Classroom",
    "Phonics",
    "Scratch",
  ),
});

export const LINE_COOK = buildResume({
  key: "cook",
  name: "Tobias Quinlan",
  headline: "Line Cook",
  location: "Portland, ME",
  summary: testSummary("hosp-line-cook-mid"),
  jobs: [
    {
      title: "Line Cook",
      company: "The Gilded Fern",
      location: "Portland, ME",
      start: "2021",
      end: "Present",
      bullets: [
        "Cook on the grill and sauté stations for a 150-cover dinner service",
        "Trained 3 new line cooks on knife skills and station setup",
        "Cut food waste 12% by reworking the weekly prep list",
        "Keep stations stocked and clean and follow food safety rules",
      ],
    },
    {
      title: "Prep Cook",
      company: "Harborlight Diner",
      location: "Portland, ME",
      start: "2019",
      end: "2021",
      bullets: [
        "Prepped vegetables, sauces and proteins for breakfast and lunch",
        "Received and checked produce deliveries against invoices",
      ],
    },
  ],
  certifications: [{ name: "ServSafe Food Handler", date: "2022" }],
  skills: skillsOf("Grill", "Sauté", "Prep", "Food safety", "Inventory"),
});

export const SDR = buildResume({
  key: "sdr",
  name: "Felix Amundsen",
  headline: "Sales Development Representative",
  location: "Chicago, IL",
  summary: testSummary("sales-sdr-junior"),
  jobs: [
    {
      title: "Sales Development Representative",
      company: "Quarrystone Software",
      location: "Chicago, IL",
      start: "2023",
      end: "Present",
      bullets: [
        "Booked 140 qualified meetings for account executives in 2024",
        "Prospected mid-market accounts with Outreach and LinkedIn Sales Navigator",
        "Beat quota four quarters running",
        "Logged every call and email in Salesforce",
      ],
    },
    {
      title: "Retail Sales Associate",
      company: "Northgate Cycles",
      location: "Chicago, IL",
      start: "2021",
      end: "2023",
      bullets: [
        "Sold bikes and service plans to walk-in customers",
        "Ran the store's email list of 3,000 customers in Mailchimp",
      ],
    },
  ],
  education: [
    { school: "Lakeshore Metropolitan University", degree: "B.A.", field: "Communications" },
  ],
  skills: skillsOf("Salesforce", "Outreach", "HubSpot", "Cold calling", "Mailchimp"),
});

export const TEACHER_TO_UX = buildResume({
  key: "ux",
  name: "Odessa Brandt",
  headline: "Middle School Science Teacher",
  location: "Minneapolis, MN",
  jobs: [
    {
      title: "Science Teacher",
      company: "Juniper Hollow Middle School",
      location: "Minneapolis, MN",
      start: "2018",
      end: "Present",
      bullets: [
        "Teach 7th grade science to 5 classes of about 28 students",
        "Interviewed 12 students and parents to redesign the homework portal's sign-in flow",
        "Ran weekly surveys to find which lab activities students found confusing",
        "Wrote the district's new lab safety guide with 2 other teachers",
      ],
    },
  ],
  projects: [
    {
      name: "UX Research Certificate Capstone",
      bullets: [
        "Ran 6 moderated usability tests on a library app prototype in Figma",
        "Synthesized interview notes into an affinity map and 3 personas",
      ],
    },
  ],
  education: [
    { school: "Northstar Pines University", degree: "M.Ed.", field: "Curriculum and Instruction" },
    { school: "Northstar Pines University", degree: "B.S.", field: "Biology" },
  ],
  certifications: [
    { name: "UX Research Certificate", issuer: "Brightpath Online Academy", date: "2024" },
  ],
  skills: skillsOf("Figma", "Usability testing", "Survey design", "Interviewing", "Google Forms"),
});

export const SUPPORT_SPECIALIST = buildResume({
  key: "cs",
  name: "Ines Marchetti",
  headline: "Customer Support Specialist",
  location: "Tucson, AZ",
  summary: testSummary("support-specialist-junior"),
  jobs: [
    {
      title: "Customer Support Specialist",
      company: "Lumacraft Apps",
      location: "Tucson, AZ",
      start: "2022",
      end: "Present",
      bullets: [
        "Answer 60 chat and email tickets a day in Zendesk and Intercom",
        "Wrote 25 help center articles that cut repeat questions about billing",
        "Flagged recurring bugs to the product team in a weekly digest",
      ],
    },
    {
      title: "Front Desk Associate",
      company: "Saguaro Springs Hotel",
      location: "Tucson, AZ",
      start: "2020",
      end: "2022",
      bullets: [
        "Checked in guests and resolved booking problems",
        "Handled phone and email reservations",
      ],
    },
  ],
  skills: skillsOf("Zendesk", "Intercom", "Help center writing", "Customer service"),
});

export const THIN_BARISTA = buildResume({
  key: "thin",
  name: "Sol Ferreira",
  location: "Albuquerque, NM",
  jobs: [
    {
      title: "Barista",
      company: "Little Wren Cafe",
      start: "2024",
      end: "Present",
      bullets: ["Made espresso drinks during the morning rush"],
    },
  ],
  skills: skillsOf("Espresso", "Cash handling"),
});

export const SUMMARY_ONLY = buildResume({
  key: "flat",
  name: "Avery Lindqvist",
  headline: "Backend Engineer",
  summary: testSummary("eng-backend-go-mid"),
  jobs: [],
});

export const DEVOPS = buildResume({
  key: "ops",
  name: "Bram Eastwood",
  headline: "DevOps Engineer",
  location: "Toronto, ON",
  jobs: [
    {
      title: "DevOps Engineer",
      company: "Stillwater Grain Co-op",
      location: "Toronto, ON",
      start: "2021",
      end: "Present",
      bullets: [
        "Manage AWS accounts for 6 product teams with Terraform",
        "Wrote Python and Bash scripts that rotate database credentials",
        "Set up Ansible playbooks for 200 Linux build servers",
        "Cut monthly AWS spend by 22% by right-sizing EC2 instances",
      ],
    },
    {
      title: "Systems Administrator",
      company: "Maplefield Credit Union",
      location: "Hamilton, ON",
      start: "2017",
      end: "2021",
      bullets: [
        "Moved nightly backups from tape to cloud storage",
        "Patched and monitored 120 Linux and Windows servers",
      ],
    },
  ],
  certifications: [
    {
      name: "AWS Certified SysOps Administrator – Associate",
      issuer: "Amazon Web Services",
      date: "2022",
    },
  ],
  skills: skillsOf("AWS", "Terraform", "Ansible", "Python", "Bash", "Linux", "Docker", "Jenkins"),
});

export const MESSY_BOOKKEEPER = buildResume({
  key: "books",
  name: "Agnes Thornquist",
  location: "Spokane, WA",
  summary: testSummary("fa-bookkeeper-mid"),
  jobs: [
    {
      title: "BOOKKEEPER",
      company: "self-employed (Ledgerlight Bookkeeping)",
      start: "Jan '21",
      end: "now",
      bullets: [
        "• Monthly bank reconciliations for 9 small-business clients in QuickBooks Online",
        "- AP / AR, payroll runs & 1099 prep",
        "",
        "* Month-end close + sales tax filings (WA) in Xero",
        "   cleaned up 2 yrs of messy books for a bakery client   ",
      ],
    },
    {
      title: "Office Assistant",
      company: "Pinecrest Dental",
      start: "06/2018",
      end: "12/2020",
      bullets: [
        "Answered phones; scheduled patients;; billed insurance",
        "Kept the petty cash log",
      ],
    },
  ],
  skills: [
    { label: "Software:", items: ["QuickBooks Online; Xero; Excel (pivot tables, VLOOKUP)"] },
    { label: "Other", items: ["Payroll", "AP/AR", "reconciliations"] },
  ],
});

export const SENIOR_PM = buildResume({
  key: "pm",
  name: "Celeste Varga",
  headline: "Senior Product Manager",
  location: "Boston, MA",
  summary:
    "Senior product manager with a background in payments and lending products for small businesses. Comfortable with SQL and with working alongside compliance teams.",
  jobs: [
    {
      title: "Senior Product Manager, Payments",
      company: "Fairlight Commerce",
      location: "Boston, MA",
      start: "2021",
      end: "Present",
      bullets: [
        "Own the roadmap for merchant payouts across web and mobile",
        "Run quarterly planning with 4 engineering teams and design",
        "Wrote SQL against the payments warehouse to size new features",
        "Launched same-day ACH payouts for 1,800 merchants",
        "Worked with the compliance and risk teams on new KYC checks for payouts",
        "Cut payout support tickets 27% with clearer status emails",
        "Ran 15 customer interviews a quarter with small-business owners",
      ],
    },
    {
      title: "Product Manager, Lending",
      company: "Fairlight Commerce",
      location: "Boston, MA",
      start: "2018",
      end: "2021",
      bullets: [
        "Launched a working-capital loan product that funded $40M in its first year",
        "Mentored 2 associate product managers",
        "Partnered with underwriting on a new credit decision flow",
        "Set up A/B tests in Amplitude for the loan application",
        "Wrote PRDs and user stories in Jira",
      ],
    },
    {
      title: "Associate Product Manager",
      company: "Tollgate Software",
      location: "Cambridge, MA",
      start: "2016",
      end: "2018",
      bullets: [
        "Shipped invoice reminders that cut late payments 9%",
        "Ran beta programs with 60 customers",
        "Wrote release notes and help articles",
        "Worked with sales on renewal pitch decks",
      ],
    },
    {
      title: "Business Analyst",
      company: "Tollgate Software",
      location: "Cambridge, MA",
      start: "2014",
      end: "2016",
      bullets: [
        "Built Excel models for pricing changes",
        "Answered data requests from finance with SQL",
        "Documented requirements for the billing system rebuild",
      ],
    },
    {
      title: "Operations Associate",
      company: "Harrow & Vale Bank",
      location: "Providence, RI",
      start: "2012",
      end: "2014",
      bullets: [
        "Processed wire transfers and ACH returns",
        "Reconciled daily settlement reports",
        "Trained 4 new hires on the back-office systems",
      ],
    },
    {
      title: "Intern",
      company: "Harrow & Vale Bank",
      location: "Providence, RI",
      start: "Summer 2011",
      end: "",
      bullets: [
        "Mapped the check deposit process for an efficiency review",
        "Drew a Visio diagram of the branch onboarding flow",
      ],
    },
  ],
  projects: [
    {
      name: "Open-source payments glossary",
      bullets: ["Maintain a public glossary of 300 payments terms"],
    },
  ],
  education: [
    {
      school: "Granite Bay School of Management",
      degree: "MBA",
      field: "Evening program",
      start: "2017",
      end: "2020",
    },
    {
      school: "Larchfield University",
      degree: "B.A.",
      field: "Economics",
      start: "2008",
      end: "2012",
    },
  ],
  certifications: [{ name: "Certified Scrum Product Owner (CSPO)", date: "2017" }],
  skills: [
    {
      label: "Product",
      items: ["Roadmapping", "Discovery", "PRDs", "User interviews", "A/B testing", "Pricing"],
    },
    { label: "Data", items: ["SQL", "Excel", "Amplitude", "Tableau"] },
    { label: "Payments", items: ["ACH", "Card issuing", "KYC", "Reconciliation"] },
    { label: "Tools", items: ["Jira", "Confluence", "Figma", "Visio"] },
  ],
  extras: [
    {
      id: "pm-x1",
      kind: "languages",
      title: "Languages",
      items: [
        {
          id: "pm-x1-i1",
          title: "Spanish",
          subtitle: "Professional working",
          date: "",
          detail: "",
          bullets: [],
        },
        {
          id: "pm-x1-i2",
          title: "Portuguese",
          subtitle: "Basic",
          date: "",
          detail: "",
          bullets: [],
        },
      ],
    },
    {
      id: "pm-x2",
      kind: "volunteering",
      title: "Volunteering",
      items: [
        {
          id: "pm-x2-i1",
          title: "Treasurer",
          subtitle: "Riverbend Rowing Club",
          date: "2019 – Present",
          detail: "",
          bullets: [{ id: "pm-x2-i1-b1", text: "Keep the club's books and run the annual budget" }],
        },
      ],
    },
  ],
});

export const DATA_ENGINEER = buildResume({
  key: "de",
  name: "Rafael Lindgren",
  headline: "Data Engineer",
  location: "Atlanta, GA",
  jobs: [
    {
      title: "Data Engineer",
      company: "Bellwether Grocers",
      location: "Atlanta, GA",
      start: "2021",
      end: "Present",
      bullets: [
        "Built Airflow DAGs that load 40 source tables into Snowflake each night",
        "Wrote dbt models for sales and inventory reporting",
        "Cut warehouse costs 18% by moving heavy jobs to incremental models",
        "Set up data quality tests that page the team on failed loads",
      ],
    },
    {
      title: "Data Analyst",
      company: "Bellwether Grocers",
      location: "Atlanta, GA",
      start: "2019",
      end: "2021",
      bullets: [
        "Built weekly sales dashboards in Tableau",
        "Wrote SQL for store managers' ad hoc questions",
      ],
    },
  ],
  education: [
    { school: "Peachtree Valley University", degree: "B.S.", field: "Information Systems" },
  ],
  skills: skillsOf("Python", "SQL", "Airflow", "dbt", "Snowflake", "Tableau", "Git"),
});

export const APPRENTICE_ELECTRICIAN = buildResume({
  key: "elec",
  name: "Wes Calloway",
  headline: "Electrical Apprentice",
  location: "Boise, ID",
  jobs: [
    {
      title: "Electrical Apprentice",
      company: "Brightline Electric Co.",
      location: "Boise, ID",
      start: "2022",
      end: "Present",
      bullets: [
        "Bent and installed EMT conduit on commercial tenant build-outs",
        "Pulled wire and terminated circuits in panels up to 400 amps under a licensed electrician",
        "Read blueprints to lay out outlets and lighting",
        "Kept job site safety logs",
      ],
    },
    {
      title: "Warehouse Associate",
      company: "Tamarack Supply",
      location: "Boise, ID",
      start: "2020",
      end: "2022",
      bullets: ["Loaded trucks and ran a forklift", "Counted inventory"],
    },
  ],
  education: [
    {
      school: "Treasure Valley Trades Institute",
      degree: "Electrical Apprenticeship Program",
      field: "Year 3 of 4",
    },
  ],
  certifications: [{ name: "OSHA 10-Hour Construction", date: "2022" }],
  skills: skillsOf("Conduit bending", "Blueprint reading", "NEC", "Hand and power tools"),
});

export const SCIENTIST = buildResume({
  key: "sci",
  name: "Helena Strand",
  headline: "Senior Scientist",
  location: "Raleigh, NC",
  summary: "Analytical chemist with a PhD who develops and validates methods for biologics.",
  jobs: [
    {
      title: "Senior Scientist, Analytical Development",
      company: "Calderwood Biologics",
      location: "Durham, NC",
      start: "2019",
      end: "Present",
      bullets: [
        "Developed and validated 14 HPLC and LC-MS methods for monoclonal antibody release testing",
        "Wrote method transfer protocols for 2 contract manufacturing sites",
        "Led investigations for out-of-specification results under GMP",
        "Trained 5 associates on chromatography data review",
      ],
    },
    {
      title: "Postdoctoral Researcher",
      company: "Halloway Institute of Chemistry",
      location: "Madison, WI",
      start: "2016",
      end: "2019",
      bullets: [
        "Studied protein aggregation with size-exclusion chromatography",
        "Published 4 papers in peer-reviewed journals",
      ],
    },
  ],
  education: [
    {
      school: "University of Brackenridge",
      degree: "PhD",
      field: "Analytical Chemistry",
      start: "2011",
      end: "2016",
    },
    {
      school: "University of Brackenridge",
      degree: "B.S.",
      field: "Chemistry",
      start: "2007",
      end: "2011",
    },
  ],
  skills: skillsOf(
    "HPLC",
    "LC-MS",
    "Method validation",
    "GMP",
    "Size-exclusion chromatography",
    "Technical writing",
  ),
});

export const LOGISTICS_COORDINATOR = buildResume({
  key: "log",
  name: "Lena Whitcombe",
  headline: "Logistics Coordinator",
  location: "Savannah, GA",
  jobs: [
    {
      title: "Logistics Coordinator",
      company: "Driftwood Imports",
      location: "Savannah, GA",
      start: "2020",
      end: "Present",
      bullets: [
        "Book ocean and drayage freight for 30 containers a week",
        "Track shipments in SAP and update customers on delays",
        "Prepare commercial invoices and packing lists for customs brokers",
        "Built an Excel tracker for demurrage and detention charges",
      ],
    },
    {
      title: "Customer Service Representative",
      company: "Driftwood Imports",
      location: "Savannah, GA",
      start: "2018",
      end: "2020",
      bullets: ["Answered order questions by phone and email", "Entered purchase orders into SAP"],
    },
  ],
  skills: skillsOf("SAP", "Excel", "Freight booking", "Customs documentation"),
});

export const ADMIN_ASSISTANT = buildResume({
  key: "admin",
  name: "Ruby Halloran",
  headline: "Administrative Assistant",
  location: "Madison, WI",
  jobs: [
    {
      title: "Administrative Assistant",
      company: "Foxglove Property Group",
      location: "Madison, WI",
      start: "2021",
      end: "Present",
      bullets: [
        "Manage calendars and travel for 3 property managers",
        "Order office supplies and track spending in Excel",
        "Greet visitors and answer the main phone line",
        "Took minutes at weekly leasing meetings",
      ],
    },
    {
      title: "Receptionist",
      company: "Birchmont Veterinary Clinic",
      location: "Madison, WI",
      start: "2019",
      end: "2021",
      bullets: [
        "Checked in pet owners and booked appointments",
        "Processed payments at the front desk",
      ],
    },
  ],
  skills: skillsOf("Microsoft Office", "Excel", "Google Workspace", "Scheduling"),
});

export const LISTED_ONLY = buildResume({
  key: "py",
  name: "Ezra Pollard",
  headline: "Software Engineer",
  location: "Pittsburgh, PA",
  jobs: [
    {
      title: "Software Engineer",
      company: "Hartwell Learning",
      location: "Pittsburgh, PA",
      start: "2020",
      end: "Present",
      bullets: [
        "Built the grading service in Python and Django",
        "Cut page load time 30% by caching course pages in Redis",
        "Wrote the REST API that mobile apps use to sync assignments",
      ],
    },
    {
      title: "Junior Developer",
      company: "Ambergate Media",
      location: "Pittsburgh, PA",
      start: "2018",
      end: "2020",
      bullets: [
        "Maintained WordPress plugins for client sites",
        "Wrote PHP scripts to import article archives",
      ],
    },
  ],
  skills: skillsOf(
    "Python",
    "Django",
    "Redis",
    "PostgreSQL",
    "Docker",
    "Kubernetes",
    "AWS",
    "Terraform",
  ),
});
