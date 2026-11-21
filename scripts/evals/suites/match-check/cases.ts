import type { MatchCheck, MatchRow } from "@/lib/match-check/check";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { TEST_RESUMES } from "../../../match-eval/resumes";
import {
  EVIDENCE_CHARS,
  findMention,
  rankOf,
  resumeSources,
  type MatchCase,
  type MatchExpect,
  type MatchInput,
  type Want,
} from "./graders";

const ELLIPSIS = "…";
const SNIPPET_SIDE = 30;
const MARKER = /^[\s•·◦▪▸*–—-]+/u;

function testResume(id: string): string {
  const found = TEST_RESUMES.find((resume) => resume.id === id);
  if (!found) throw new Error(`No test resume ${id}`);
  return found.text;
}

// A pasted resume keeps its skills on their own line, as most files do.
const skillsOnOwnLine = (id: string) => testResume(id).replace(/\s+Skills:\s*/, "\nSkills: ");

// This one ends with a bare "Excel.", which reads as a skills line.
const BOOKKEEPER_RESUME = testResume("fa-bookkeeper-mid").replace(/\s+Excel\.$/, "\nSkills: Excel");

function linesOf(input: MatchInput): string[] {
  if (input.via === "studio") return resumeSources(input);
  return input.resume
    .split(/\r?\n/)
    .map((line) => line.replace(MARKER, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function quoteFor(lines: readonly string[], want: Want): string {
  for (const line of lines) {
    for (const form of [want.term, ...(want.forms ?? [])]) {
      const hit = findMention(line, form);
      if (!hit) continue;
      if (line.length <= EVIDENCE_CHARS) return line;
      const start = Math.max(0, hit.index - SNIPPET_SIDE);
      const end = Math.min(line.length, hit.index + hit.length + SNIPPET_SIDE);
      return `${start > 0 ? ELLIPSIS : ""}${line.slice(start, end).trim()}${end < line.length ? ELLIPSIS : ""}`;
    }
  }
  return "";
}

// The hand labels written out in the product's result shape, so the dry run checks the labels too.
function goldenOf(input: MatchInput, expect: MatchExpect): MatchCheck {
  const lines = linesOf(input);
  const ordered = [...expect.terms].sort((a, b) => rankOf(b.importance) - rankOf(a.importance));
  const rows = ordered.map((want, index): MatchRow => ({
    id: `m${index + 1}`,
    term: want.term,
    importance: want.importance,
    status: want.status,
    where: want.status === "missing" ? null : { place: "Resume", text: quoteFor(lines, want) },
  }));
  const count = (importance: "must" | "nice") => {
    const group = rows.filter((row) => row.importance === importance);
    return { found: group.filter((row) => row.status !== "missing").length, total: group.length };
  };
  const shown = rows.filter((row) => row.status === "shown").length;
  const listed = rows.filter((row) => row.status === "listed").length;
  return {
    rows,
    total: rows.length,
    found: shown + listed,
    shown,
    listed,
    must: count("must"),
    nice: count("nice"),
    sorted: rows.some((row) => row.importance !== null),
    asks: [...(expect.asks ?? [])],
  };
}

function page(
  id: string,
  resume: string,
  job: string,
  expect: MatchExpect,
  note?: string,
): MatchCase {
  const input: MatchInput = { via: "page", resume, job };
  return { id, input, expect, golden: goldenOf(input, expect), note };
}

function studio(
  id: string,
  resume: Resume,
  job: string,
  expect: MatchExpect,
  note?: string,
): MatchCase {
  const input: MatchInput = { via: "studio", resume, job };
  return { id, input, expect, golden: goldenOf(input, expect), note };
}

const must = (term: string, status: Want["status"], forms?: readonly string[]): Want => ({
  term,
  importance: "must",
  status,
  forms,
});
const nice = (term: string, status: Want["status"], forms?: readonly string[]): Want => ({
  term,
  importance: "nice",
  status,
  forms,
});
const unranked = (term: string, status: Want["status"], forms?: readonly string[]): Want => ({
  term,
  importance: null,
  status,
  forms,
});

const lines = (...rows: string[]) => rows.join("\n");

const BACKEND_POST = lines(
  "Senior Backend Engineer",
  "Lindenmoor Freight · Remote",
  "",
  "About us",
  "Lindenmoor Freight builds AI-powered routing for regional carriers. Our data team works in Python and Snowflake.",
  "",
  "What you'll do",
  "- Build and run shipment services in Go",
  "- Own our Kafka event streams and PostgreSQL schemas",
  "- Review code and mentor two engineers",
  "",
  "What you'll need",
  "- 6+ years of experience building backend systems",
  "- Strong Go; we write almost everything in Go",
  "- Production experience with PostgreSQL",
  "- Docker and Kubernetes (k8s) in production",
  "",
  "Nice to have",
  "- Terraform",
  "- gRPC",
  "- Experience with Redis",
  "",
  "Benefits",
  "- A learning budget, Python courses included",
  "- 28 days of paid leave",
);

const BACKEND_RESUME = lines(
  "TOMAS WHITLOCK",
  "Backend Engineer | tomas.whitlock@example.com",
  "SUMMARY",
  "Backend engineer with seven years building logistics and payment systems.",
  "EXPERIENCE",
  "Senior Software Engineer, Harrowmere Parcel, 2021 - Present",
  "• Rebuilt the dispatch service in Go, cutting p99 latency by 35%",
  "• Moved order data to PostgreSQL and wrote the migration runbook",
  "• Ran the Kafka consumers that feed live tracking",
  "Software Engineer, Fenmore Ledger, 2018 - 2021",
  "• Built billing jobs in Java and kept them running on Docker",
  "SKILLS",
  "Go, Java, PostgreSQL, Kafka, Docker, Redis, Terraform",
);

const FRONTEND_POST = lines(
  "Junior Frontend Developer at Vellichor Games",
  "We're hiring an entry-level developer to build our player web portal.",
  "Requirements: JavaScript, React, HTML and CSS, Git.",
  "Preferred: Next.js, Storybook, Cypress.",
  "Must have 1+ years of experience or a portfolio of shipped work.",
);

const BI_POST = lines(
  "Senior BI Analyst — Quillfield Analytics",
  "Required: SQL, Power BI and advanced Excel.",
  "Preferred: Python, Snowflake, dbt.",
  "You will turn finance and operations questions into dashboards people use every week.",
  "Bachelor's degree in a quantitative field required.",
);

const NURSE_POST = lines(
  "Registered Nurse – Cardiac Step-Down Unit",
  "Tarnwick Health",
  "",
  "Responsibilities:",
  "• Monitor telemetry for up to 5 patients per shift",
  "• Document care in Epic",
  "• Teach patients and families before discharge",
  "",
  "Requirements:",
  "• Active RN license",
  "• Basic Life Support (BLS) and Advanced Cardiac Life Support certification required",
  "• 2+ years of acute care experience",
  "• PALS preferred",
);

const RETAIL_POST = lines(
  "Sales Associate (part time) - Brightwell Outfitters",
  "",
  "What you'll do",
  "- Greet and help customers on the floor",
  "- Run the register and handle returns",
  "- Keep displays tidy",
  "",
  "What we're looking for",
  "- Cash handling experience",
  "- Comfortable with POS systems",
  "- Visual merchandising is a plus",
  "- Spanish speaking is a bonus",
  "- Weekend availability required",
);

const WAREHOUSE_POST = lines(
  "Warehouse Associate – Night Shift",
  "Larchmont Freight",
  "",
  "Requirements",
  "- Forklift certification",
  "- Able to lift 50 lbs and stand for a full shift",
  "",
  "Nice to have",
  "- Stock control experience",
  "- Microsoft Excel",
);

const TEACHER_POST = lines(
  "Head of Mathematics",
  "Marigold Academy",
  "",
  "About the role",
  "You will lead a department of eight teachers and shape how maths is taught across the school.",
  "",
  "Requirements",
  "- Qualified teacher with 8+ years teaching secondary mathematics",
  "- Proven lesson planning and curriculum development",
  "- Strong classroom management",
  "- Master's degree in education or mathematics",
  "",
  "Desirable",
  "- Data skills in Excel",
);

const TEACHER_RESUME = lines(
  "HANNA OKONKWO-REYES",
  "Mathematics Teacher",
  "PROFILE",
  "Secondary mathematics teacher with eleven years in public schools.",
  "TEACHING EXPERIENCE",
  "Lead Mathematics Teacher, Pemberly Lane High School, 2016 - Present",
  "- Wrote the algebra course for grades 9 and 10 and led lesson planning for six teachers",
  "- Coached new staff on classroom management",
  "- Moved homework and grading online",
  "EDUCATION",
  "MEd in Mathematics Education, Westmere University",
  "SKILLS",
  "Curriculum development, Differentiated instruction, Excel",
);

const SHORT_POST =
  "Line cook wanted. Food safety certification required; HACCP is a plus. Evenings and weekends.";

const MISFIT_POST = lines(
  "Platform Engineer, Ottermere Robotics",
  "Requirements",
  "- 4+ years with Java or Kotlin",
  "- Spring Boot services on AWS",
  "- Kubernetes and Terraform",
  "Nice to have",
  "- Experience with Kafka",
);

const VAGUE_POST = lines(
  "Team Member",
  "We are a friendly neighbourhood bakery looking for someone with a great attitude who loves people.",
  "You should be reliable, punctual and happy to learn on the job, and we hope you excel at making every guest feel welcome.",
  "2+ years of experience in a fast-paced environment is helpful.",
  "Early mornings, three days a week.",
);

const ODD_POST = [
  "**Customer Support Specialist**",
  "Fernhollow Clinic Software",
  "",
  "WHAT YOU WILL DO",
  "1. Answer tickets in Zendesk",
  "2. Write help-centre articles",
  "",
  "**Must have**",
  "▪ Zendesk or Intercom",
  "▪ Customer support experience",
  "▪ Fluent English",
  "",
  "**Bonus points**",
  "▪ Salesforce",
  "▪ SQL basics",
].join("\r\n");

const ODD_RESUME = [
  "Lena Marchetti | Support Specialist | lena.m@example.com",
  "EXPERIENCE",
  "Support Specialist · Quaywise Apps · 2022 – Present",
  "◦ Answered 50 chats a day in Intercom and kept first replies under two minutes",
  "◦ Wrote 40 help center articles",
  "SKILLS",
  "Zendesk\tIntercom\tSalesforce",
  "LANGUAGES",
  "English (native) · Italian (fluent)",
].join("\r\n");

const LANGUAGE_POST = lines(
  "Account Manager, Southern Europe",
  "Brindlemoor Software",
  "",
  "Requirements:",
  "- 3+ years managing B2B accounts",
  "- German market experience",
  "- Fluent Spanish and English required",
  "- HubSpot or Salesforce",
  "",
  "Nice to have:",
  "- French is a plus",
);

const LANGUAGE_RESUME = lines(
  "SOFIA VANTERPOOL",
  "Account Manager",
  "EXPERIENCE",
  "Account Manager, Rookwood Analytics, 2020 – Present",
  "- Grew 35 mid-market accounts across Spain and Latin America, all managed in HubSpot",
  "- Ran quarterly business reviews with each account",
  "LANGUAGES",
  "Spanish (native), English (fluent), German (basic)",
);

const AMBIGUOUS_POST = lines(
  "Product Marketing Manager - Ravenmoor Audio",
  "",
  "What you'll do",
  "- Go deep with customers and turn what you learn into launch messaging",
  "- Excel at storytelling across web, email and events",
  "- Make swift calls with incomplete data",
  "",
  "Requirements",
  "- 5+ years in product marketing",
  "- HubSpot and Salesforce",
  "- SEO and content marketing",
  "",
  "Nice to have",
  "- SQL for your own analysis",
);

const AMBIGUOUS_RESUME = lines(
  "JONAS FERRITER",
  "Senior Product Marketing Manager",
  "EXPERIENCE",
  "Product Marketing Lead, Hollowbrook Labs, 2019 - Present",
  "• Launched four products with content marketing programs that doubled trial sign-ups",
  "• Built SEO landing pages that now bring 30% of new leads",
  "• Ran nurture campaigns in HubSpot",
  "SKILLS",
  "HubSpot, Salesforce, SQL, Excel",
);

const ELECTRICIAN_POST = lines(
  "Industrial Maintenance Electrician",
  "Ottermere Robotics – Plant 2",
  "",
  "Requirements",
  "- Journeyman electrician license",
  "- PLC troubleshooting on packaging lines",
  "- Preventive maintenance on production equipment",
  "",
  "Preferred",
  "- AutoCAD for panel drawings",
);

const SALES_POST = lines(
  "Account Executive, Mid-Market",
  "Tallowmere Software",
  "",
  "What you bring",
  "- 3+ years closing mid-market software deals",
  "- Bachelor's degree or equivalent experience",
  "- Salesforce and Gong every day",
  "",
  "Bonus points",
  "- HubSpot",
  "- Experience with Outreach",
);

const GRAD_POST = lines(
  "Graduate Software Engineer",
  "Wrenfield Health Tech",
  "",
  "Who you are",
  "- A recent graduate with a degree in computer science or similar",
  "- Comfortable in Java or Python",
  "- Some SQL",
  "- Git and Linux basics",
  "",
  "Nice to have",
  "- Docker",
);

const BOOKKEEPER_POST = lines(
  "Bookkeeper (part time)",
  "Thistledown & Pike Accounting",
  "",
  "Requirements",
  "- QuickBooks and Xero",
  "- Confident with Excel",
  "- 2+ years of bookkeeping experience",
  "",
  "Nice to have",
  "- NetSuite",
  "- Working towards a CPA",
);

const INTRO = [
  "Ottermere Robotics designs autonomous carts that move parts between stations on busy factory floors, and our fleet now runs in plants across three continents.",
  "Our cloud team writes Go and Rust services on Kubernetes that plan routes for every cart, while the firmware team keeps the motors and sensors in step.",
  "We started in a borrowed garage with two prototypes and a lot of duct tape, and we still build every new cart by hand before it ships to a customer.",
  "Customers tell us the carts are quiet, careful around people, and easy for line workers to call over with a tablet, which is exactly what we set out to make.",
  "We care about calm launches, honest post-mortems, and engineers who leave the code a little better than they found it.",
  "Most of the team works from our two offices, and the rest join from home with a week together in person every quarter.",
];

const BENEFITS = [
  "Health, dental and vision cover for you and your family from your first day.",
  "A yearly learning budget you can spend on books, courses or conferences, including free Rust and Go workshops run by our cloud team.",
  "Twenty-eight days of paid leave plus public holidays, and a paid week off between the winter holidays and the new year.",
  "A home office allowance, a new laptop of your choice, and a monthly stipend for internet.",
  "Paid parental leave for every parent, with a phased return to work when you are ready.",
];

const LONG_POST = lines(
  "Senior Robotics Software Engineer",
  "Ottermere Robotics · Hybrid",
  "",
  "About Ottermere Robotics",
  ...Array.from({ length: 5 }, () => INTRO).flat(),
  "",
  "What you'll do",
  "- Write motion-planning code in C++ for carts on live factory floors",
  "- Tune perception on Linux test rigs and in simulation",
  "- Review designs with firmware and cloud engineers",
  "",
  "Requirements",
  "- 7+ years of professional C++",
  "- Python for tooling and tests",
  "- Strong Linux skills",
  "",
  "Nice to have",
  "- CUDA",
  "- Docker",
  "",
  "Benefits",
  ...Array.from({ length: 4 }, () => BENEFITS).flat(),
  "",
  "Equal opportunity",
  "Ottermere Robotics is an equal opportunity employer. We welcome people of every background, and we make reasonable adjustments at every stage of hiring. Tell your recruiter what would help and we will make it happen.",
);

const LONG_ROLES = [
  ["Staff Robotics Engineer", "Brackwater Automation", "2020 - Present"],
  ["Senior Robotics Engineer", "Pellmoor Motion", "2017 - 2020"],
  ["Robotics Engineer", "Quillfield Machines", "2015 - 2017"],
  ["Software Engineer", "Harrowmere Parcel", "2013 - 2015"],
  ["Junior Software Engineer", "Fenmore Ledger", "2011 - 2013"],
] as const;

const LONG_RESUME = lines(
  "MIREILLE ASHCOMBE",
  "Senior Robotics Software Engineer | mireille.ashcombe@example.com",
  "SUMMARY",
  "Robotics software engineer with thirteen years of motion planning, perception and fleet tooling for warehouse and factory robots, most recently leading the planning team for a fleet of four hundred carts.",
  "EXPERIENCE",
  ...LONG_ROLES.flatMap(([title, company, dates], index) => [
    `${title}, ${company}, ${dates}`,
    index === 0
      ? "• Led the rewrite of the cart motion planner in modern C++ with a team of five engineers, replacing a decade-old planner, cutting replanning time from 900 ms to 120 ms and removing the nightly restarts that operators had worked around for years"
      : "• Built and maintained the planning and control software for a fleet of autonomous carts, working closely with the hardware, firmware and operations teams on every release",
    "• Ran field trials at customer sites, wrote the trial reports and turned what operators said into the next quarter's plan",
    "• Kept the Linux build and test rigs healthy so every change ran on real hardware before it shipped",
    "• Mentored newer engineers through code review, pairing and weekly design sessions",
  ]),
  "EDUCATION",
  "MSc in Robotics, Westmere University",
  "SKILLS",
  "C++, Python, Linux, ROS, Git",
);

const studioBase = (): Resume => ({
  ...emptyResume(0),
  id: "eval-resume",
  title: "Eval resume",
});

const STUDIO_BACKEND: Resume = {
  ...studioBase(),
  basics: {
    name: "Amara Quist",
    headline: "Backend engineer",
    email: "",
    phone: "",
    location: "",
    links: [],
  },
  summary: "Backend engineer with six years building payment systems.",
  experience: [
    {
      id: "job-1",
      company: "Fenmore Ledger",
      title: "Senior Software Engineer",
      location: "",
      startDate: "2021",
      endDate: "Present",
      bullets: [
        { id: "b1", text: "Rebuilt the settlement service in Go, cutting p99 latency by 40%" },
        { id: "b2", text: "Moved 30 services onto Kubernetes with Helm" },
        { id: "b3", text: "Ran gRPC load tests before each release", hidden: true },
      ],
    },
  ],
  projects: [{ id: "p1", name: "Ledger replay tool", link: "", tech: "Rust, SQLite", bullets: [] }],
  skills: [{ id: "s1", label: "Tools", items: ["Docker", "Redis", "Terraform"] }],
  extras: [
    {
      id: "x1",
      kind: "languages",
      title: "Languages",
      items: [
        { id: "l1", title: "English", subtitle: "Fluent", date: "", detail: "", bullets: [] },
        { id: "l2", title: "German", subtitle: "B1", date: "", detail: "", bullets: [] },
      ],
    },
  ],
};

const STUDIO_BACKEND_POST = lines(
  "Staff Backend Engineer",
  "Pellmoor Payments",
  "",
  "Requirements",
  "- Go services in production",
  "- Kubernetes",
  "- Rust or C++",
  "- Docker",
  "",
  "Nice to have",
  "- gRPC",
  "- German is a plus",
  "- Terraform",
);

const STUDIO_DESIGNER: Resume = {
  ...studioBase(),
  basics: {
    name: "Ines Galloway",
    headline: "Product designer",
    email: "",
    phone: "",
    location: "",
    links: [],
  },
  experience: [
    {
      id: "job-1",
      company: "Quaywise Apps",
      title: "Product Designer",
      location: "",
      startDate: "2020",
      endDate: "Present",
      bullets: [
        { id: "b1", text: "Led the checkout redesign in Figma, lifting completion by 12%" },
        { id: "b2", text: "Built clickable prototypes in Framer for three launches" },
      ],
    },
  ],
  certifications: [
    { id: "c1", name: "UX Research Certificate", issuer: "Brindlemoor Institute", date: "2022" },
  ],
  skills: [{ id: "s1", label: "Design", items: ["Figma", "Sketch", "Design systems"] }],
  extras: [
    {
      id: "x1",
      kind: "custom",
      title: "Research",
      items: [
        {
          id: "r1",
          title: "Usability studies",
          subtitle: "",
          date: "",
          detail: "",
          bullets: [{ id: "rb1", text: "Ran usability testing with 30 customers a quarter" }],
        },
      ],
    },
  ],
};

const STUDIO_DESIGNER_POST = lines(
  "Product Designer",
  "Wrenfield Health",
  "",
  "Requirements",
  "- 4+ years designing digital products",
  "- Figma and prototyping",
  "- Usability testing and user research",
  "- Design systems",
  "",
  "Nice to have",
  "- Framer or Webflow",
  "- HTML and CSS",
);

const STUDIO_HIDDEN: Resume = {
  ...studioBase(),
  basics: {
    name: "Dario Fenwick",
    headline: "Data analyst",
    email: "",
    phone: "",
    location: "",
    links: [],
  },
  experience: [
    {
      id: "job-1",
      company: "Rookwood Analytics",
      title: "Data Analyst",
      location: "",
      startDate: "2022",
      endDate: "Present",
      bullets: [{ id: "b1", text: "Built Tableau dashboards for the sales team" }],
    },
    {
      id: "job-2",
      company: "Pellmoor Motion",
      title: "Reporting Intern",
      location: "",
      startDate: "2021",
      endDate: "2021",
      hidden: true,
      bullets: [{ id: "b2", text: "Wrote Looker reports for the finance team" }],
    },
  ],
  skills: [{ id: "s1", label: "Tools", items: ["SQL", "Python"] }],
  hiddenSections: ["skills"],
};

const STUDIO_HIDDEN_POST = lines(
  "Data Analyst",
  "Quillfield Analytics",
  "",
  "Requirements",
  "- SQL",
  "- Tableau or Power BI",
  "- Python",
  "",
  "Nice to have",
  "- Looker",
);

const STUDIO_NURSE: Resume = {
  ...studioBase(),
  basics: {
    name: "Rosalind Achterberg",
    headline: "Registered Nurse",
    email: "",
    phone: "",
    location: "",
    links: [],
  },
  experience: [
    {
      id: "job-1",
      company: "Tarnwick Health",
      title: "Registered Nurse",
      location: "",
      startDate: "2019",
      endDate: "Present",
      bullets: [
        { id: "b1", text: "Cared for five patients a shift on a telemetry unit" },
        { id: "b2", text: "Charted every assessment in Epic" },
      ],
    },
  ],
  education: [
    {
      id: "e1",
      school: "Westmere University",
      degree: "BSN",
      field: "Nursing",
      location: "",
      startDate: "2015",
      endDate: "2019",
      bullets: [],
    },
  ],
  certifications: [
    {
      id: "c1",
      name: "Basic Life Support (BLS)",
      issuer: "Heartline Training Council",
      date: "2024",
    },
  ],
};

const STUDIO_NURSE_POST = lines(
  "Registered Nurse, Medical-Surgical",
  "Fernhollow Clinic",
  "",
  "Requirements:",
  "• BLS required",
  "• ACLS within six months of hire",
  "• Medication administration and patient care experience",
  "",
  "Preferred:",
  "• PALS",
);

export const CASES: readonly MatchCase[] = [
  page(
    "backend-senior-sections",
    BACKEND_RESUME,
    BACKEND_POST,
    {
      terms: [
        must("Go", "shown"),
        unranked("Kafka", "shown"),
        must("PostgreSQL", "shown"),
        must("Docker", "shown"),
        must("Kubernetes", "missing", ["k8s"]),
        nice("Terraform", "listed"),
        nice("gRPC", "missing"),
        nice("Redis", "listed"),
      ],
      traps: ["AI", "Python", "Snowflake"],
      asks: ["6+ years of experience building backend systems"],
    },
    "Headed post: the intro and benefits name tools nobody asks for.",
  ),
  page(
    "frontend-junior-one-paragraph",
    testResume("eng-frontend-junior"),
    FRONTEND_POST,
    {
      terms: [
        must("JavaScript", "listed"),
        must("React", "shown"),
        must("HTML", "listed"),
        must("CSS", "shown"),
        must("Git", "listed"),
        nice("Next.js", "shown"),
        nice("Storybook", "missing"),
        nice("Cypress", "missing"),
      ],
      asks: ["1+ years of experience"],
    },
    "Entry level; the resume is one paragraph that ends in an inline skills list.",
  ),
  page(
    "bi-analyst-inline-labels",
    skillsOnOwnLine("data-bi-analyst-senior"),
    BI_POST,
    {
      terms: [
        must("SQL", "shown"),
        must("Power BI", "shown"),
        must("Excel", "shown"),
        nice("Python", "missing"),
        nice("Snowflake", "missing"),
        nice("dbt", "missing"),
      ],
      asks: ["Bachelor's degree in a quantitative field"],
    },
    "Senior; requirements given as inline Required: and Preferred: labels.",
  ),
  page(
    "nurse-acronyms",
    skillsOnOwnLine("hc-rn-mid"),
    NURSE_POST,
    {
      terms: [
        unranked("Epic", "shown"),
        must("RN", "shown", ["registered nurse"]),
        must("BLS", "shown", ["Basic Life Support"]),
        must("ACLS", "shown", ["Advanced Cardiac Life Support"]),
        nice("PALS", "missing"),
      ],
      asks: ["2+ years of acute care experience"],
    },
    "Healthcare; the post spells out what the resume abbreviates.",
  ),
  page(
    "retail-entry-paraphrased",
    testResume("retail-sales-associate-junior"),
    RETAIL_POST,
    {
      terms: [
        must("Cash handling", "missing"),
        must("Point of sale", "missing", ["POS system", "POS systems", "POS"]),
        nice("Visual merchandising", "missing"),
        nice("Spanish", "missing"),
      ],
      asks: [],
    },
    "Entry level retail: the resume says the same things in other words, so a word check finds none.",
  ),
  page(
    "warehouse-forklift",
    testResume("log-warehouse-associate-junior"),
    WAREHOUSE_POST,
    {
      terms: [
        must("Forklift", "shown"),
        nice("Stock control", "missing"),
        nice("Excel", "missing", ["Microsoft Excel"]),
      ],
      asks: [],
    },
    "Logistics; a short post with a weight limit that is not a skill.",
  ),
  page(
    "teacher-senior-headed",
    TEACHER_RESUME,
    TEACHER_POST,
    {
      terms: [
        must("Lesson planning", "shown"),
        must("Curriculum development", "listed"),
        must("Classroom management", "shown"),
        nice("Excel", "listed"),
      ],
      asks: [
        "8+ years teaching secondary mathematics",
        "Master's degree in education or mathematics",
      ],
    },
    "Education, senior; one skill only in the skills list.",
  ),
  page(
    "very-short-post",
    testResume("hosp-line-cook-mid"),
    SHORT_POST,
    {
      terms: [must("Food safety", "shown"), nice("HACCP", "missing")],
      asks: [],
    },
    "Hospitality; a post just over the 80 character minimum.",
  ),
  page(
    "post-does-not-fit",
    testResume("fa-staff-accountant-mid"),
    MISFIT_POST,
    {
      terms: [
        must("Java", "missing"),
        must("Kotlin", "missing"),
        must("Spring Boot", "missing"),
        must("AWS", "missing"),
        must("Kubernetes", "missing"),
        must("Terraform", "missing"),
        nice("Kafka", "missing"),
      ],
      asks: ["4+ years with Java or Kotlin"],
    },
    "An accountant's resume against a platform engineering post: everything is missing.",
  ),
  page(
    "post-names-no-skills",
    testResume("hosp-shift-supervisor-junior-ca"),
    VAGUE_POST,
    {
      terms: [],
      traps: ["Excel"],
      asks: ["2+ years of experience in a fast-paced environment"],
    },
    "A post that names no skill or tool at all: the check must list nothing.",
  ),
  page(
    "very-long-post-and-resume",
    LONG_RESUME,
    LONG_POST,
    {
      terms: [
        must("Linux", "shown"),
        must("C++", "shown"),
        must("Python", "listed"),
        nice("CUDA", "missing"),
        nice("Docker", "missing"),
      ],
      traps: ["Go", "Rust", "Kubernetes"],
      asks: ["7+ years of professional C++"],
    },
    "A long intro and benefits that name tools, and a resume line over 200 characters.",
  ),
  page(
    "odd-formatting-crlf-markers",
    ODD_RESUME,
    ODD_POST,
    {
      terms: [
        must("Zendesk", "listed"),
        must("Intercom", "shown"),
        must("Customer support", "missing"),
        must("English", "shown"),
        nice("Salesforce", "listed"),
        nice("SQL", "missing"),
      ],
      asks: [],
    },
    "CRLF line ends, markdown and capital headings, numbered and ▪ bullets, tab-separated skills.",
  ),
  page(
    "languages-and-market-trap",
    LANGUAGE_RESUME,
    LANGUAGE_POST,
    {
      terms: [
        must("Spanish", "shown"),
        must("English", "shown"),
        must("HubSpot", "shown"),
        must("Salesforce", "missing"),
        nice("French", "missing"),
      ],
      traps: ["German", "B2B"],
      asks: ["3+ years managing B2B accounts"],
    },
    "German market experience is not a language requirement; a languages section counts as shown.",
  ),
  page(
    "plain-words-that-look-like-tools",
    AMBIGUOUS_RESUME,
    AMBIGUOUS_POST,
    {
      terms: [
        must("HubSpot", "shown"),
        must("Salesforce", "listed"),
        must("SEO", "shown"),
        must("Content marketing", "shown"),
        nice("SQL", "listed"),
      ],
      traps: ["Go", "Excel", "Swift"],
      asks: ["5+ years in product marketing"],
    },
    "Go deep, Excel at, swift calls: plain English, not Go, Excel or Swift.",
  ),
  page(
    "electrician-trades",
    testResume("trades-electrician-senior"),
    ELECTRICIAN_POST,
    {
      terms: [
        must("PLC", "shown"),
        must("Preventive maintenance", "missing"),
        nice("AutoCAD", "missing"),
      ],
      asks: [],
    },
    "Skilled trades, senior; a prose resume with no skills section.",
  ),
  page(
    "sales-ae-years-and-degree",
    skillsOnOwnLine("sales-ae-mid"),
    SALES_POST,
    {
      terms: [
        must("Salesforce", "shown"),
        must("Gong", "shown"),
        nice("HubSpot", "listed"),
        nice("Outreach", "missing"),
      ],
      asks: [
        "3+ years closing mid-market software deals",
        "Bachelor's degree or equivalent experience",
      ],
    },
    "Sales, mid level; the post asks for years and a degree.",
  ),
  page(
    "new-grad-entry-level",
    skillsOnOwnLine("eng-new-grad"),
    GRAD_POST,
    {
      terms: [
        must("Java", "shown"),
        must("Python", "shown"),
        must("SQL", "shown"),
        must("Git", "listed"),
        must("Linux", "listed"),
        nice("Docker", "missing"),
      ],
      asks: ["A recent graduate with a degree in computer science or similar"],
    },
    "Entry level; a short resume with a skills line.",
  ),
  page(
    "bookkeeper-finance",
    BOOKKEEPER_RESUME,
    BOOKKEEPER_POST,
    {
      terms: [
        must("QuickBooks", "shown"),
        must("Xero", "shown"),
        must("Excel", "listed"),
        must("Bookkeeping", "missing"),
        nice("NetSuite", "missing"),
        nice("CPA", "missing", ["certified public accountant"]),
      ],
      traps: ["Accounting"],
      asks: ["2+ years of bookkeeping experience"],
    },
    "Finance admin, mid level; bookkeeping is not the resume's bookkeeper, and the company name is not a skill.",
  ),
  studio(
    "studio-backend-hidden-line",
    STUDIO_BACKEND,
    STUDIO_BACKEND_POST,
    {
      terms: [
        must("Go", "shown"),
        must("Kubernetes", "shown"),
        must("Rust", "listed"),
        must("C++", "missing"),
        must("Docker", "listed"),
        nice("gRPC", "missing"),
        nice("German", "shown"),
        nice("Terraform", "listed"),
      ],
      asks: [],
    },
    "Studio resume: a hidden line, project tools, a skills group and a languages section.",
  ),
  studio(
    "studio-designer-extras",
    STUDIO_DESIGNER,
    STUDIO_DESIGNER_POST,
    {
      terms: [
        must("Figma", "shown"),
        must("Prototyping", "missing"),
        must("Usability testing", "shown"),
        must("User research", "missing"),
        must("Design systems", "listed"),
        nice("Framer", "shown"),
        nice("Webflow", "missing"),
        nice("HTML", "missing"),
        nice("CSS", "missing"),
      ],
      asks: ["4+ years designing digital products"],
    },
    "Studio resume with a custom section; prototypes is not the post's word prototyping.",
  ),
  studio(
    "studio-hidden-section",
    STUDIO_HIDDEN,
    STUDIO_HIDDEN_POST,
    {
      terms: [
        must("SQL", "missing"),
        must("Tableau", "shown"),
        must("Power BI", "missing"),
        must("Python", "missing"),
        nice("Looker", "missing"),
      ],
      asks: [],
    },
    "Studio resume whose skills section and one job are hidden, so they don't count.",
  ),
  studio(
    "studio-nurse-certifications",
    STUDIO_NURSE,
    STUDIO_NURSE_POST,
    {
      terms: [
        unranked("RN", "shown", ["registered nurse"]),
        must("BLS", "shown", ["Basic Life Support"]),
        must("ACLS", "missing", ["Advanced Cardiac Life Support"]),
        must("Medication administration", "missing"),
        must("Patient care", "missing"),
        nice("PALS", "missing"),
      ],
      asks: [],
    },
    "Studio healthcare resume: a certification counts, cared for is not patient care.",
  ),
];
