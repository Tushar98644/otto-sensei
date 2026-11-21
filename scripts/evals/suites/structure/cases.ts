import type { ExtraKind } from "@/lib/resume/schema";
import { TEST_RESUMES } from "../../../match-eval/resumes";
import type {
  ReadCertification,
  ReadExtra,
  ReadExtraItem,
  ReadJob,
  ReadProject,
  ReadResume,
  ReadSchool,
} from "./graders";

export type StructureCaseData = {
  id: string;
  note: string;
  text: string;
  // null: the text is not a resume, so the reader should return nothing.
  read: ReadResume | null;
  leftOut?: readonly string[];
};

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

const job = ({ location = "", ...rest }: Optional<ReadJob, "location">): ReadJob => ({
  location,
  ...rest,
});

const school = ({
  field = "",
  location = "",
  startDate = "",
  endDate = "",
  bullets = [],
  ...rest
}: Optional<
  ReadSchool,
  "field" | "location" | "startDate" | "endDate" | "bullets"
>): ReadSchool => ({
  field,
  location,
  startDate,
  endDate,
  bullets,
  ...rest,
});

const project = ({ link = "", ...rest }: Optional<ReadProject, "link">): ReadProject => ({
  link,
  ...rest,
});

const cert = (name: string, issuer: string, date: string): ReadCertification => ({
  name,
  issuer,
  date,
});

const item = ({
  subtitle = "",
  date = "",
  detail = "",
  bullets = [],
  title = "",
}: Partial<ReadExtraItem>): ReadExtraItem => ({ title, subtitle, date, detail, bullets });

const extra = (kind: ExtraKind, title: string, items: readonly ReadExtraItem[]): ReadExtra => ({
  kind,
  title,
  items,
});

type ReadParts = Partial<Omit<ReadResume, "basics">> & { basics: Partial<ReadResume["basics"]> };

function read({ basics, ...rest }: ReadParts): ReadResume {
  return {
    basics: { name: "", headline: "", email: "", phone: "", location: "", links: [], ...basics },
    summary: "",
    experience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
    extras: [],
    ...rest,
  };
}

function profileOf(id: string): { profile: string; skills: string[] } {
  const found = TEST_RESUMES.find((resume) => resume.id === id);
  if (!found) throw new Error(`scripts/match-eval/resumes.ts has no resume "${id}"`);
  const [profile = "", skills = ""] = found.text.split(" Skills: ");
  return { profile, skills: skills.replace(/\.$/, "").split(", ") };
}

const analyst = profileOf("data-analyst-junior");
const support = profileOf("support-specialist-junior");

type LongJob = Omit<ReadJob, "bullets"> & { area: string };

const LONG_JOBS: readonly LongJob[] = [
  {
    company: "Quarry Lane Payments",
    title: "VP of Engineering",
    location: "Chicago, IL",
    startDate: "Jan 2021",
    endDate: "Present",
    area: "payments",
  },
  {
    company: "Harbor & Finch Insurance",
    title: "Senior Director of Engineering",
    location: "Chicago, IL",
    startDate: "Mar 2018",
    endDate: "Dec 2020",
    area: "claims",
  },
  {
    company: "Tallowmere Logistics",
    title: "Director of Platform Engineering",
    location: "Milwaukee, WI",
    startDate: "Jun 2015",
    endDate: "Feb 2018",
    area: "freight",
  },
  {
    company: "Brindle Health Systems",
    title: "Engineering Manager",
    location: "Minneapolis, MN",
    startDate: "Aug 2012",
    endDate: "May 2015",
    area: "patient records",
  },
  {
    company: "Coppervale Retail Group",
    title: "Senior Software Engineer",
    location: "Minneapolis, MN",
    startDate: "Apr 2010",
    endDate: "Jul 2012",
    area: "checkout",
  },
  {
    company: "Kittering Labs",
    title: "Software Engineer",
    location: "Madison, WI",
    startDate: "Sep 2007",
    endDate: "Mar 2010",
    area: "lab scheduling",
  },
  {
    company: "Ostler Media",
    title: "Web Developer",
    location: "Madison, WI",
    startDate: "Jun 2005",
    endDate: "Aug 2007",
    area: "publishing",
  },
  {
    company: "Ferncliff Telecom",
    title: "Junior Developer",
    location: "Des Moines, IA",
    startDate: "Jul 2003",
    endDate: "May 2005",
    area: "billing",
  },
  {
    company: "Gristmill Credit Union",
    title: "Systems Analyst",
    location: "Des Moines, IA",
    startDate: "Jan 2002",
    endDate: "Jun 2003",
    area: "loan servicing",
  },
  {
    company: "Pewter Ridge College",
    title: "IT Assistant (part-time)",
    location: "Ames, IA",
    startDate: "Sep 1999",
    endDate: "Dec 2001",
    area: "student portal",
  },
];

const LONG_BULLETS: readonly ((area: string, n: number) => string)[] = [
  (area, n) =>
    `Led a group of ${n + 4} engineers that owned the ${area} platform from design through on-call support`,
  (area, n) =>
    `Cut ${area} processing costs by ${10 + n * 3}% by moving nightly batch jobs to an event-driven pipeline`,
  (area, n) =>
    `Launched a self-service ${area} dashboard that ${(n + 2) * 150} staff use to answer their own questions`,
  (area, n) =>
    `Hired ${n + 3} engineers and wrote the first career ladder and interview guide for the ${area} teams`,
  (area) =>
    `Moved the ${area} services from a leased data center to the cloud with no customer-facing downtime`,
  (area, n) =>
    `Set up incident reviews and service level objectives for ${n + 5} ${area} services, halving repeat outages`,
  (area, n) =>
    `Planned the ${area} roadmap with product and finance, shipping ${n + 6} of the year's quarterly goals on time`,
  (area, n) =>
    `Reduced ${area} page load time from ${n + 3} seconds to under one second for customers on mobile networks`,
  (area) =>
    `Replaced hand-run ${area} releases with automated deploys that ship several times a day`,
  (area, n) =>
    `Mentored ${n + 2} senior engineers into tech lead roles across the ${area} and reporting teams`,
];
const LONG_BULLETS_PER_JOB = 10;

// Each job uses every template once, in its own order; earlier, more senior jobs get the bigger numbers.
const longJobs: ReadJob[] = LONG_JOBS.map(({ area, ...rest }, index) => ({
  ...rest,
  bullets: Array.from({ length: LONG_BULLETS_PER_JOB }, (_, k) =>
    LONG_BULLETS[(index + k) % LONG_BULLETS.length]!(area, LONG_JOBS.length - 1 - index),
  ),
}));

const longRead = read({
  basics: {
    name: "Ottilie Brandvold",
    headline: "Engineering Executive",
    email: "ottilie.brandvold@example.com",
    phone: "+1 555 016 7734",
    location: "Chicago, IL",
    links: [{ label: "LinkedIn", url: "linkedin.com/in/ottilie-brandvold-eng" }],
  },
  summary:
    "Engineering executive with more than twenty years in payments, insurance, logistics and health software. I build platform teams that ship often without paging people at night, and I have run organizations of up to 140 engineers across four offices. Known for turning around late, unreliable programs by fixing planning, on-call and hiring first.",
  experience: longJobs,
  education: [
    school({
      school: "Prairie Lakes University",
      degree: "MS",
      field: "Computer Science",
      startDate: "2006",
      endDate: "2009",
    }),
    school({
      school: "Pewter Ridge College",
      degree: "BS",
      field: "Mathematics",
      startDate: "1997",
      endDate: "2001",
    }),
  ],
  skills: [
    {
      label: "Leadership",
      items: ["Engineering strategy", "Org design", "Hiring", "Budgeting", "Vendor management"],
    },
    {
      label: "Technical",
      items: ["Go", "Java", "Python", "PostgreSQL", "Kafka", "Kubernetes", "AWS", "Terraform"],
    },
    {
      label: "Practices",
      items: [
        "Incident management",
        "Service level objectives",
        "Platform engineering",
        "Data governance",
      ],
    },
  ],
  certifications: [
    cert("Certified Cloud Architect", "Stratus Skills Council", "2019"),
    cert("Information Security Manager", "Bastion Security Institute", "2017"),
    cert("Certified Scrum Leader", "Agile Practice Board", "2014"),
  ],
  extras: [
    extra("publications", "Speaking", [
      item({
        title: "Scaling on-call without burning people out",
        subtitle: "Midwest Platform Summit",
        date: "2023",
      }),
      item({
        title: "Paying down a decade of payments debt",
        subtitle: "Lakeshore Engineering Forum",
        date: "2021",
      }),
    ]),
    extra("awards", "Awards", [
      item({
        title: "Engineering Leader of the Year",
        subtitle: "Lakefront Technology Guild",
        date: "2022",
      }),
    ]),
  ],
});

function longText(resume: ReadResume): string {
  const { basics } = resume;
  const jobs = resume.experience.map((entry) =>
    [
      `${entry.title}, ${entry.company}, ${entry.location} | ${entry.startDate} – ${entry.endDate}`,
      ...entry.bullets.map((bullet) => `• ${bullet}`),
    ].join("\n"),
  );
  return [
    basics.name,
    basics.headline,
    `${basics.location} | ${basics.email} | ${basics.phone} | ${basics.links[0]?.url ?? ""}`,
    "",
    "Summary",
    resume.summary,
    "",
    "Experience",
    jobs.join("\n\n"),
    "",
    "Education",
    ...resume.education.map(
      (entry) =>
        `${entry.degree} ${entry.field}, ${entry.school}, ${entry.startDate} – ${entry.endDate}`,
    ),
    "",
    "Certifications",
    ...resume.certifications.map((entry) => `${entry.name}, ${entry.issuer}, ${entry.date}`),
    "",
    "Skills",
    ...resume.skills.map((group) => `${group.label}: ${group.items.join(", ")}`),
    ...resume.extras.flatMap((section) => [
      "",
      section.title,
      ...section.items.map((entry) => `${entry.title}, ${entry.subtitle}, ${entry.date}`),
    ]),
  ].join("\n");
}

export const STRUCTURE_CASES: readonly StructureCaseData[] = [
  {
    id: "software-engineer-classic",
    note: "Normal: a clean two-job tech resume with grouped skills and two profile links.",
    text: `Mara Quill
Backend Engineer
mara.quill@example.com | +1 555 014 2290 | Toronto, Canada | linkedin.com/in/mara-quill-dev | github.com/maraquill-code

Summary
Backend engineer with five years building billing and data services for subscription businesses.

Experience
Software Engineer II, Brightwell Outfitters, Toronto    Jun 2022 – Present
• Built the order history API in Go that serves 3 million requests a day
• Cut nightly invoice job runtime from 4 hours to 40 minutes by batching database writes
• Mentor two junior engineers through code review and pairing

Software Engineer, Larchmont Freight, Remote    Aug 2019 – May 2022
• Moved shipment tracking from cron scripts to a Kafka event pipeline
• Wrote the carrier rate service used by 1,200 business customers
• Added contract tests that caught 30 breaking changes before release

Education
BSc Computer Science, Corvale University, 2015 – 2019

Skills
Languages: Go, Python, TypeScript, SQL
Infrastructure: PostgreSQL, Kafka, Docker, Kubernetes, AWS`,
    read: read({
      basics: {
        name: "Mara Quill",
        headline: "Backend Engineer",
        email: "mara.quill@example.com",
        phone: "+1 555 014 2290",
        location: "Toronto, Canada",
        links: [
          { label: "LinkedIn", url: "linkedin.com/in/mara-quill-dev" },
          { label: "GitHub", url: "github.com/maraquill-code" },
        ],
      },
      summary:
        "Backend engineer with five years building billing and data services for subscription businesses.",
      experience: [
        job({
          company: "Brightwell Outfitters",
          title: "Software Engineer II",
          location: "Toronto",
          startDate: "Jun 2022",
          endDate: "Present",
          bullets: [
            "Built the order history API in Go that serves 3 million requests a day",
            "Cut nightly invoice job runtime from 4 hours to 40 minutes by batching database writes",
            "Mentor two junior engineers through code review and pairing",
          ],
        }),
        job({
          company: "Larchmont Freight",
          title: "Software Engineer",
          location: "Remote",
          startDate: "Aug 2019",
          endDate: "May 2022",
          bullets: [
            "Moved shipment tracking from cron scripts to a Kafka event pipeline",
            "Wrote the carrier rate service used by 1,200 business customers",
            "Added contract tests that caught 30 breaking changes before release",
          ],
        }),
      ],
      education: [
        school({
          school: "Corvale University",
          degree: "BSc",
          field: "Computer Science",
          startDate: "2015",
          endDate: "2019",
        }),
      ],
      skills: [
        { label: "Languages", items: ["Go", "Python", "TypeScript", "SQL"] },
        { label: "Infrastructure", items: ["PostgreSQL", "Kafka", "Docker", "Kubernetes", "AWS"] },
      ],
    }),
  },
  {
    id: "new-grad-projects",
    note: "Entry level: education first, projects with and without links, one internship, dash bullets.",
    text: `Theo Abernathy-Lund
theo.lund@example.org · (555) 013-4471 · Austin, TX
Portfolio: theolund.example.dev

EDUCATION
Harrowgate Institute of Technology — B.S. in Information Systems
Aug 2021 – May 2025 | Austin, TX
- GPA 3.7/4.0, Dean's List six semesters
- Relevant coursework: Databases, Web Development, Data Structures

PROJECTS
Shelfwise — shelfwise.example.dev
- Built a pantry tracking web app with React and Firebase used by 150 students
- Added barcode scanning that cut item entry time in half
Campus Bus Tracker
- Wrote a Python script that posts live bus arrival times to a campus chat channel

EXPERIENCE
IT Support Intern, Fennimore Health Partners — Austin, TX
May 2024 – Aug 2024
- Resolved 25 help desk tickets a week for a 300-person office
- Wrote setup guides for new laptops that the team still uses

SKILLS
JavaScript, React, Python, SQL, Firebase, Git, Excel`,
    read: read({
      basics: {
        name: "Theo Abernathy-Lund",
        email: "theo.lund@example.org",
        phone: "(555) 013-4471",
        location: "Austin, TX",
        links: [{ label: "Portfolio", url: "theolund.example.dev" }],
      },
      experience: [
        job({
          company: "Fennimore Health Partners",
          title: "IT Support Intern",
          location: "Austin, TX",
          startDate: "May 2024",
          endDate: "Aug 2024",
          bullets: [
            "Resolved 25 help desk tickets a week for a 300-person office",
            "Wrote setup guides for new laptops that the team still uses",
          ],
        }),
      ],
      education: [
        school({
          school: "Harrowgate Institute of Technology",
          degree: "B.S.",
          field: "Information Systems",
          location: "Austin, TX",
          startDate: "Aug 2021",
          endDate: "May 2025",
          bullets: [
            "GPA 3.7/4.0, Dean's List six semesters",
            "Relevant coursework: Databases, Web Development, Data Structures",
          ],
        }),
      ],
      projects: [
        project({
          name: "Shelfwise",
          link: "shelfwise.example.dev",
          bullets: [
            "Built a pantry tracking web app with React and Firebase used by 150 students",
            "Added barcode scanning that cut item entry time in half",
          ],
        }),
        project({
          name: "Campus Bus Tracker",
          bullets: [
            "Wrote a Python script that posts live bus arrival times to a campus chat channel",
          ],
        }),
      ],
      skills: [
        { label: "", items: ["JavaScript", "React", "Python", "SQL", "Firebase", "Git", "Excel"] },
      ],
    }),
  },
  {
    id: "product-director-promotions",
    note: "Senior: two titles under one company heading, an all-caps name, first-person summary, a spoken-languages line.",
    text: `NADIA OKONKWO-REYES
Director of Product | Lisbon, Portugal
nadia.reyes@example.com  •  +351 912 000 431

PROFILE
Product leader who has grown B2B marketplaces from launch to profitability. I build small, senior teams and keep them close to customers.

EXPERIENCE

Quayside Commerce
Director of Product    Mar 2021 – Present
• Lead 4 product managers and 2 designers across buyer, seller and payments teams
• Grew gross merchandise value from €40M to €115M in three years
• Set up the quarterly planning process now used by all 9 product teams
Senior Product Manager    Jan 2018 – Feb 2021
• Launched seller financing with a partner bank, used by 2,000 sellers in the first year
• Rebuilt onboarding, raising seller activation from 31% to 58%

Pellucid Analytics, Amsterdam
Product Manager    Sep 2014 – Dec 2017
• Owned the reporting suite for 600 enterprise accounts
• Ran 40 customer interviews a quarter to shape the roadmap

EDUCATION
MBA, Ostrava School of Management, 2012 – 2014
BA Economics, University of Kestrel Bay, 2008 – 2011

SKILLS
Product strategy, Marketplace pricing, Roadmapping, SQL, Amplitude, Figma

LANGUAGES
English (fluent), Portuguese (native), Spanish (conversational)`,
    read: read({
      basics: {
        name: "NADIA OKONKWO-REYES",
        headline: "Director of Product",
        email: "nadia.reyes@example.com",
        phone: "+351 912 000 431",
        location: "Lisbon, Portugal",
      },
      summary:
        "Product leader who has grown B2B marketplaces from launch to profitability. I build small, senior teams and keep them close to customers.",
      experience: [
        job({
          company: "Quayside Commerce",
          title: "Director of Product",
          startDate: "Mar 2021",
          endDate: "Present",
          bullets: [
            "Lead 4 product managers and 2 designers across buyer, seller and payments teams",
            "Grew gross merchandise value from €40M to €115M in three years",
            "Set up the quarterly planning process now used by all 9 product teams",
          ],
        }),
        job({
          company: "Quayside Commerce",
          title: "Senior Product Manager",
          startDate: "Jan 2018",
          endDate: "Feb 2021",
          bullets: [
            "Launched seller financing with a partner bank, used by 2,000 sellers in the first year",
            "Rebuilt onboarding, raising seller activation from 31% to 58%",
          ],
        }),
        job({
          company: "Pellucid Analytics",
          title: "Product Manager",
          location: "Amsterdam",
          startDate: "Sep 2014",
          endDate: "Dec 2017",
          bullets: [
            "Owned the reporting suite for 600 enterprise accounts",
            "Ran 40 customer interviews a quarter to shape the roadmap",
          ],
        }),
      ],
      education: [
        school({
          school: "Ostrava School of Management",
          degree: "MBA",
          startDate: "2012",
          endDate: "2014",
        }),
        school({
          school: "University of Kestrel Bay",
          degree: "BA",
          field: "Economics",
          startDate: "2008",
          endDate: "2011",
        }),
      ],
      skills: [
        {
          label: "",
          items: [
            "Product strategy",
            "Marketplace pricing",
            "Roadmapping",
            "SQL",
            "Amplitude",
            "Figma",
          ],
        },
      ],
      extras: [
        extra("languages", "Languages", [
          item({ title: "English", subtitle: "fluent" }),
          item({ title: "Portuguese", subtitle: "native" }),
          item({ title: "Spanish", subtitle: "conversational" }),
        ]),
      ],
    }),
  },
  {
    id: "registered-nurse-licenses",
    note: "Non-tech healthcare: licenses before experience, title and employer on separate lines.",
    text: `Imogen Castellanos
Registered Nurse — Medical-Surgical
Denver, CO · 555-019-3384 · imogen.castellanos@example.net

Professional Summary
Registered nurse with 6 years of acute care experience on medical-surgical and telemetry units.

Licenses & Certifications
Registered Nurse (RN) License, Front Range Nursing Board, 2019
Basic Life Support (BLS), Halden Resuscitation Council, 2025
Advanced Cardiac Life Support (ACLS), Halden Resuscitation Council, 2024

Clinical Experience
Staff Nurse
Pinecrest Regional Medical Center, Denver, CO | July 2021 – Present
• Care for 5–6 patients per shift on a 32-bed medical-surgical unit
• Serve as relief charge nurse two shifts a month
• Precept new graduate nurses during their 12-week orientation

Telemetry Nurse
Ashgrove Community Hospital, Aurora, CO | June 2019 – June 2021
• Monitored cardiac rhythms for up to 4 patients and escalated changes to the rapid response team

Education
Bachelor of Science in Nursing, Westmere University, 2019

Skills
Patient assessment, IV therapy, Wound care, Telemetry monitoring, Electronic charting`,
    read: read({
      basics: {
        name: "Imogen Castellanos",
        headline: "Registered Nurse — Medical-Surgical",
        email: "imogen.castellanos@example.net",
        phone: "555-019-3384",
        location: "Denver, CO",
      },
      summary:
        "Registered nurse with 6 years of acute care experience on medical-surgical and telemetry units.",
      experience: [
        job({
          company: "Pinecrest Regional Medical Center",
          title: "Staff Nurse",
          location: "Denver, CO",
          startDate: "July 2021",
          endDate: "Present",
          bullets: [
            "Care for 5–6 patients per shift on a 32-bed medical-surgical unit",
            "Serve as relief charge nurse two shifts a month",
            "Precept new graduate nurses during their 12-week orientation",
          ],
        }),
        job({
          company: "Ashgrove Community Hospital",
          title: "Telemetry Nurse",
          location: "Aurora, CO",
          startDate: "June 2019",
          endDate: "June 2021",
          bullets: [
            "Monitored cardiac rhythms for up to 4 patients and escalated changes to the rapid response team",
          ],
        }),
      ],
      education: [
        school({
          school: "Westmere University",
          degree: "Bachelor of Science",
          field: "Nursing",
          endDate: "2019",
        }),
      ],
      skills: [
        {
          label: "",
          items: [
            "Patient assessment",
            "IV therapy",
            "Wound care",
            "Telemetry monitoring",
            "Electronic charting",
          ],
        },
      ],
      certifications: [
        cert("Registered Nurse (RN) License", "Front Range Nursing Board", "2019"),
        cert("Basic Life Support (BLS)", "Halden Resuscitation Council", "2025"),
        cert("Advanced Cardiac Life Support (ACLS)", "Halden Resuscitation Council", "2024"),
      ],
    }),
  },
  {
    id: "store-manager-numeric-dates",
    note: "Non-tech retail: numeric month/year dates, hyphen-separated role lines, bullet-separated skills.",
    text: `DESMOND ACHTERBERG
Store Manager
Rotterdam, Netherlands | +31 6 1234 0099 | d.achterberg@example.com

WORK HISTORY
Store Manager - Hollander & Wick - Rotterdam
03/2018 - Present
- Run a store of 22 staff with annual sales of €4.1M
- Raised conversion from 18% to 24% by matching floor staffing to footfall
- Cut stock shrinkage by a third with weekly cycle counts

Assistant Store Manager - Velden Home & Living - Utrecht
06/2014 - 02/2018
- Built weekly rotas for 15 staff
- Trained new hires on tills, returns and visual merchandising

EDUCATION
Retail Management Diploma, Maasbrook College, 2012 - 2014

SKILLS
Team leadership • Rota planning • Visual merchandising • Stock control • Cash handling`,
    read: read({
      basics: {
        name: "DESMOND ACHTERBERG",
        headline: "Store Manager",
        email: "d.achterberg@example.com",
        phone: "+31 6 1234 0099",
        location: "Rotterdam, Netherlands",
      },
      experience: [
        job({
          company: "Hollander & Wick",
          title: "Store Manager",
          location: "Rotterdam",
          startDate: "03/2018",
          endDate: "Present",
          bullets: [
            "Run a store of 22 staff with annual sales of €4.1M",
            "Raised conversion from 18% to 24% by matching floor staffing to footfall",
            "Cut stock shrinkage by a third with weekly cycle counts",
          ],
        }),
        job({
          company: "Velden Home & Living",
          title: "Assistant Store Manager",
          location: "Utrecht",
          startDate: "06/2014",
          endDate: "02/2018",
          bullets: [
            "Built weekly rotas for 15 staff",
            "Trained new hires on tills, returns and visual merchandising",
          ],
        }),
      ],
      education: [
        school({
          school: "Maasbrook College",
          degree: "Retail Management Diploma",
          startDate: "2012",
          endDate: "2014",
        }),
      ],
      skills: [
        {
          label: "",
          items: [
            "Team leadership",
            "Rota planning",
            "Visual merchandising",
            "Stock control",
            "Cash handling",
          ],
        },
      ],
    }),
  },
  {
    id: "sous-chef-spoken-languages",
    note: "Hospitality: dates in brackets, spoken languages and interests in their own sections.",
    text: `Rafael Montenegro Ibarra
Sous Chef
Melbourne VIC · 0491 570 156 · rafa.ibarra@example.com

About me
Sous chef who loves seasonal menus and calm, organised kitchens.

Experience
Sous Chef — The Saltbush Room, Melbourne (2022–present)
• Run a brigade of 8 cooks across lunch and dinner service for 120 covers
• Wrote the allergen matrix for every dish on a menu that changes monthly
• Cut food waste by 15% by reworking prep lists

Chef de Partie — Tidewater Bistro, Sydney (2019–2022)
• Ran the grill and sauce sections
• Trained 3 apprentices in knife skills and plating

Education
Certificate IV in Commercial Cookery, Harbourview Culinary Institute, 2017–2018

Certifications
Food Safety Supervisor, Southern Hospitality Training, 2021

Languages
Spanish — native
English — fluent
Italian — basic

Interests
Foraging, sourdough baking, trail running`,
    read: read({
      basics: {
        name: "Rafael Montenegro Ibarra",
        headline: "Sous Chef",
        email: "rafa.ibarra@example.com",
        phone: "0491 570 156",
        location: "Melbourne VIC",
      },
      summary: "Sous chef who loves seasonal menus and calm, organised kitchens.",
      experience: [
        job({
          company: "The Saltbush Room",
          title: "Sous Chef",
          location: "Melbourne",
          startDate: "2022",
          endDate: "present",
          bullets: [
            "Run a brigade of 8 cooks across lunch and dinner service for 120 covers",
            "Wrote the allergen matrix for every dish on a menu that changes monthly",
            "Cut food waste by 15% by reworking prep lists",
          ],
        }),
        job({
          company: "Tidewater Bistro",
          title: "Chef de Partie",
          location: "Sydney",
          startDate: "2019",
          endDate: "2022",
          bullets: [
            "Ran the grill and sauce sections",
            "Trained 3 apprentices in knife skills and plating",
          ],
        }),
      ],
      education: [
        school({
          school: "Harbourview Culinary Institute",
          degree: "Certificate IV",
          field: "Commercial Cookery",
          startDate: "2017",
          endDate: "2018",
        }),
      ],
      certifications: [cert("Food Safety Supervisor", "Southern Hospitality Training", "2021")],
      extras: [
        extra("languages", "Languages", [
          item({ title: "Spanish", subtitle: "native" }),
          item({ title: "English", subtitle: "fluent" }),
          item({ title: "Italian", subtitle: "basic" }),
        ]),
        extra("custom", "Interests", [
          item({ detail: "Foraging, sourdough baking, trail running" }),
        ]),
      ],
    }),
  },
  {
    id: "electrician-pipe-lines",
    note: "Trades: pipe-separated role lines and duty lines with no bullet symbols.",
    text: `Callum Rennick
Licensed Electrician
Glasgow · 07700 900 482 · callum.rennick@example.co.uk

Profile
Time-served electrician with domestic and commercial experience across Glasgow and the west of Scotland.

Employment
Electrician | Ardlaw Electrical Services | Glasgow | Apr 2017 – Present
Install and test lighting, power and fire alarm systems in offices and schools.
Lead a two-person team on fit-outs of up to 40,000 sq ft.
Carry out periodic inspections and write up certificates.

Apprentice Electrician | Kelso & Bain Contractors | Paisley | Sep 2013 – Mar 2017
Completed a four-year apprenticeship on new-build housing sites.

Education
Level 3 Diploma in Electrical Installation, Clydebank Trades College, 2013 – 2017

Certifications
18th Edition Wiring Regulations, Northlight Skills Board, 2019
Inspection and Testing, Northlight Skills Board, 2020

Skills
Fault finding, Fire alarm systems, EV charger installation, Periodic inspection`,
    read: read({
      basics: {
        name: "Callum Rennick",
        headline: "Licensed Electrician",
        email: "callum.rennick@example.co.uk",
        phone: "07700 900 482",
        location: "Glasgow",
      },
      summary:
        "Time-served electrician with domestic and commercial experience across Glasgow and the west of Scotland.",
      experience: [
        job({
          company: "Ardlaw Electrical Services",
          title: "Electrician",
          location: "Glasgow",
          startDate: "Apr 2017",
          endDate: "Present",
          bullets: [
            "Install and test lighting, power and fire alarm systems in offices and schools.",
            "Lead a two-person team on fit-outs of up to 40,000 sq ft.",
            "Carry out periodic inspections and write up certificates.",
          ],
        }),
        job({
          company: "Kelso & Bain Contractors",
          title: "Apprentice Electrician",
          location: "Paisley",
          startDate: "Sep 2013",
          endDate: "Mar 2017",
          bullets: ["Completed a four-year apprenticeship on new-build housing sites."],
        }),
      ],
      education: [
        school({
          school: "Clydebank Trades College",
          degree: "Level 3 Diploma",
          field: "Electrical Installation",
          startDate: "2013",
          endDate: "2017",
        }),
      ],
      skills: [
        {
          label: "",
          items: [
            "Fault finding",
            "Fire alarm systems",
            "EV charger installation",
            "Periodic inspection",
          ],
        },
      ],
      certifications: [
        cert("18th Edition Wiring Regulations", "Northlight Skills Board", "2019"),
        cert("Inspection and Testing", "Northlight Skills Board", "2020"),
      ],
    }),
  },
  {
    id: "teacher-awards-volunteering",
    note: "Education field: awards and a volunteering section under their own headings, 'to' date ranges.",
    text: `Harriet Oyelaran
Secondary Mathematics Teacher
Cape Town, South Africa | harriet.oyelaran@example.org | +27 21 555 0143

Summary
Mathematics teacher for Grades 8 to 12 who uses short daily quizzes and peer tutoring to close gaps early.

Teaching Experience
Mathematics Teacher, Fynbos Ridge High School, Cape Town — Jan 2019 to Present
• Teach five classes of 30 learners across Grades 10 to 12
• Raised the Grade 12 maths pass rate from 71% to 86% over three years
• Run the after-school maths olympiad club

Student Teacher, Kloofnek Primary School, Cape Town — Feb 2018 to Nov 2018
• Planned and taught Grade 6 maths and science lessons under a mentor teacher

Education
Postgraduate Certificate in Education (PGCE), University of Seapoint, 2018
BSc Mathematics, University of Seapoint, 2014 – 2017

Certifications
Registered Educator, Southern Teaching Council, 2019

Awards
Teacher of the Year, Fynbos Ridge High School, 2022
District Maths Mentor Award, Atlantic Schools District, 2023

Volunteering
Tutor, Harbour Lights Learning Trust, 2016 – Present
• Tutor two high school learners in maths every Saturday`,
    read: read({
      basics: {
        name: "Harriet Oyelaran",
        headline: "Secondary Mathematics Teacher",
        email: "harriet.oyelaran@example.org",
        phone: "+27 21 555 0143",
        location: "Cape Town, South Africa",
      },
      summary:
        "Mathematics teacher for Grades 8 to 12 who uses short daily quizzes and peer tutoring to close gaps early.",
      experience: [
        job({
          company: "Fynbos Ridge High School",
          title: "Mathematics Teacher",
          location: "Cape Town",
          startDate: "Jan 2019",
          endDate: "Present",
          bullets: [
            "Teach five classes of 30 learners across Grades 10 to 12",
            "Raised the Grade 12 maths pass rate from 71% to 86% over three years",
            "Run the after-school maths olympiad club",
          ],
        }),
        job({
          company: "Kloofnek Primary School",
          title: "Student Teacher",
          location: "Cape Town",
          startDate: "Feb 2018",
          endDate: "Nov 2018",
          bullets: ["Planned and taught Grade 6 maths and science lessons under a mentor teacher"],
        }),
      ],
      education: [
        school({
          school: "University of Seapoint",
          degree: "Postgraduate Certificate in Education (PGCE)",
          endDate: "2018",
        }),
        school({
          school: "University of Seapoint",
          degree: "BSc",
          field: "Mathematics",
          startDate: "2014",
          endDate: "2017",
        }),
      ],
      certifications: [cert("Registered Educator", "Southern Teaching Council", "2019")],
      extras: [
        extra("awards", "Awards", [
          item({
            title: "Teacher of the Year",
            subtitle: "Fynbos Ridge High School",
            date: "2022",
          }),
          item({
            title: "District Maths Mentor Award",
            subtitle: "Atlantic Schools District",
            date: "2023",
          }),
        ]),
        extra("volunteering", "Volunteering", [
          item({
            title: "Tutor",
            subtitle: "Harbour Lights Learning Trust",
            date: "2016 – Present",
            bullets: ["Tutor two high school learners in maths every Saturday"],
          }),
        ]),
      ],
    }),
  },
  {
    id: "research-scientist-publications",
    note: "Science: citation-style publications, a thesis line under a degree, grants and awards.",
    text: `Lucía Ferreira-Hollis
Research Scientist — Soil Microbiology
Wageningen, Netherlands · lucia.fh@example.org · lfhollis.example.org

Profile
Soil microbiologist studying how cover crops change nitrogen cycling, with 9 peer-reviewed papers.

Research Experience
Research Scientist, Veldhoven Institute for Agricultural Research, Wageningen, 2021 – present
• Lead a three-year field trial across 12 farms measuring nitrous oxide emissions
• Built the lab's amplicon sequencing pipeline in R and Python
• Supervise two PhD students and one technician

Postdoctoral Researcher, Kestrel Bay University, 2018 – 2021
• Showed that rye cover crops cut nitrate leaching by 22% in sandy soils

Education
PhD, Soil Science, Kestrel Bay University, 2014 – 2018
Thesis: Microbial drivers of nitrogen loss in sandy soils
MSc, Environmental Biology, University of Lisle, 2012 – 2014

Publications
Ferreira-Hollis, L., & Dunmore, K. (2023). Cover crops and nitrous oxide in sandy soils. Journal of Field Soil Ecology, 41(2), 113–127.
Ferreira-Hollis, L. (2021). Amplicon pipelines for small labs. Lowland Soil Methods, 9, 55–70.

Grants & Awards
Early Career Fellowship, Lowland Science Foundation, 2022
Best Poster Award, Northern Soil Ecology Meeting, 2019

Skills
R, Python, QIIME 2, qPCR, Field sampling design, Mixed-effects models`,
    read: read({
      basics: {
        name: "Lucía Ferreira-Hollis",
        headline: "Research Scientist — Soil Microbiology",
        email: "lucia.fh@example.org",
        location: "Wageningen, Netherlands",
        links: [{ label: "Website", url: "lfhollis.example.org" }],
      },
      summary:
        "Soil microbiologist studying how cover crops change nitrogen cycling, with 9 peer-reviewed papers.",
      experience: [
        job({
          company: "Veldhoven Institute for Agricultural Research",
          title: "Research Scientist",
          location: "Wageningen",
          startDate: "2021",
          endDate: "present",
          bullets: [
            "Lead a three-year field trial across 12 farms measuring nitrous oxide emissions",
            "Built the lab's amplicon sequencing pipeline in R and Python",
            "Supervise two PhD students and one technician",
          ],
        }),
        job({
          company: "Kestrel Bay University",
          title: "Postdoctoral Researcher",
          startDate: "2018",
          endDate: "2021",
          bullets: ["Showed that rye cover crops cut nitrate leaching by 22% in sandy soils"],
        }),
      ],
      education: [
        school({
          school: "Kestrel Bay University",
          degree: "PhD",
          field: "Soil Science",
          startDate: "2014",
          endDate: "2018",
          bullets: ["Thesis: Microbial drivers of nitrogen loss in sandy soils"],
        }),
        school({
          school: "University of Lisle",
          degree: "MSc",
          field: "Environmental Biology",
          startDate: "2012",
          endDate: "2014",
        }),
      ],
      skills: [
        {
          label: "",
          items: [
            "R",
            "Python",
            "QIIME 2",
            "qPCR",
            "Field sampling design",
            "Mixed-effects models",
          ],
        },
      ],
      extras: [
        extra("publications", "Publications", [
          item({
            detail:
              "Ferreira-Hollis, L., & Dunmore, K. (2023). Cover crops and nitrous oxide in sandy soils. Journal of Field Soil Ecology, 41(2), 113–127.",
          }),
          item({
            detail:
              "Ferreira-Hollis, L. (2021). Amplicon pipelines for small labs. Lowland Soil Methods, 9, 55–70.",
          }),
        ]),
        extra("awards", "Grants & Awards", [
          item({
            title: "Early Career Fellowship",
            subtitle: "Lowland Science Foundation",
            date: "2022",
          }),
          item({
            title: "Best Poster Award",
            subtitle: "Northern Soil Ecology Meeting",
            date: "2019",
          }),
        ]),
      ],
    }),
  },
  {
    id: "two-column-sidebar-first",
    note: "Odd formatting: a two-column PDF read sidebar first, so contact, skills and languages come before the name.",
    text: `CONTACT
ines.halloran@example.com
+353 87 555 0192
Dublin, Ireland
linkedin.com/in/ines-halloran-ux

SKILLS
User research
Wireframing
Prototyping
Figma
Usability testing
Design systems

LANGUAGES
English
Irish
French

INES HALLORAN
Product Designer

ABOUT
Product designer who turns messy research into clear flows for fintech and health apps.

EXPERIENCE
Product Designer
Tidal Ledger, Dublin
2021 – Present
Redesigned the savings goals flow, lifting completion from 42% to 67%
Built and maintain a design system of 80 components
Run monthly usability sessions with 6 to 8 customers

UX Designer
Clover & Quay Studio, Dublin
2018 – 2021
Designed patient booking screens for three clinic chains
Ran card sorts and tree tests to restructure a 200-page help site

EDUCATION
BA Design, Liffey School of Art and Design
2014 – 2018`,
    read: read({
      basics: {
        name: "INES HALLORAN",
        headline: "Product Designer",
        email: "ines.halloran@example.com",
        phone: "+353 87 555 0192",
        location: "Dublin, Ireland",
        links: [{ label: "LinkedIn", url: "linkedin.com/in/ines-halloran-ux" }],
      },
      summary:
        "Product designer who turns messy research into clear flows for fintech and health apps.",
      experience: [
        job({
          company: "Tidal Ledger",
          title: "Product Designer",
          location: "Dublin",
          startDate: "2021",
          endDate: "Present",
          bullets: [
            "Redesigned the savings goals flow, lifting completion from 42% to 67%",
            "Built and maintain a design system of 80 components",
            "Run monthly usability sessions with 6 to 8 customers",
          ],
        }),
        job({
          company: "Clover & Quay Studio",
          title: "UX Designer",
          location: "Dublin",
          startDate: "2018",
          endDate: "2021",
          bullets: [
            "Designed patient booking screens for three clinic chains",
            "Ran card sorts and tree tests to restructure a 200-page help site",
          ],
        }),
      ],
      education: [
        school({
          school: "Liffey School of Art and Design",
          degree: "BA",
          field: "Design",
          startDate: "2014",
          endDate: "2018",
        }),
      ],
      skills: [
        {
          label: "",
          items: [
            "User research",
            "Wireframing",
            "Prototyping",
            "Figma",
            "Usability testing",
            "Design systems",
          ],
        },
      ],
      extras: [
        extra("languages", "Languages", [
          item({ title: "English" }),
          item({ title: "Irish" }),
          item({ title: "French" }),
        ]),
      ],
    }),
  },
  {
    id: "all-caps-pipes",
    note: "Odd formatting: all-caps headings and role lines, pipes everywhere, name and headline on one line.",
    text: `OLUWASEUN BRANDT-MILLER | SENIOR ACCOUNTANT
seun.bm@example.com | +44 7700 900 317 | Leeds, UK

PROFESSIONAL EXPERIENCE
SENIOR ACCOUNTANT | HAWTHORNE & PIKE LLP | LEEDS | 2020 – PRESENT
Prepare monthly management accounts for 14 clients with turnover up to £25M
Led the move from desktop ledgers to cloud accounting for 40 small businesses
Review VAT returns and year-end accounts prepared by two junior staff

ACCOUNTS ASSISTANT | MERIDEN PACKAGING LTD | BRADFORD | 2016 – 2020
Ran purchase ledger for 300 suppliers and weekly payment runs
Reconciled 6 bank accounts every month

EDUCATION
BSc Accounting and Finance | University of Wharfedale | 2013 – 2016

CERTIFICATIONS
Chartered Accountant (ACA) | Institute of Ledger Professionals | 2019

KEY SKILLS
Management accounts | VAT | Year-end close | Xero | Excel | Sage`,
    read: read({
      basics: {
        name: "OLUWASEUN BRANDT-MILLER",
        headline: "SENIOR ACCOUNTANT",
        email: "seun.bm@example.com",
        phone: "+44 7700 900 317",
        location: "Leeds, UK",
      },
      experience: [
        job({
          company: "HAWTHORNE & PIKE LLP",
          title: "SENIOR ACCOUNTANT",
          location: "LEEDS",
          startDate: "2020",
          endDate: "PRESENT",
          bullets: [
            "Prepare monthly management accounts for 14 clients with turnover up to £25M",
            "Led the move from desktop ledgers to cloud accounting for 40 small businesses",
            "Review VAT returns and year-end accounts prepared by two junior staff",
          ],
        }),
        job({
          company: "MERIDEN PACKAGING LTD",
          title: "ACCOUNTS ASSISTANT",
          location: "BRADFORD",
          startDate: "2016",
          endDate: "2020",
          bullets: [
            "Ran purchase ledger for 300 suppliers and weekly payment runs",
            "Reconciled 6 bank accounts every month",
          ],
        }),
      ],
      education: [
        school({
          school: "University of Wharfedale",
          degree: "BSc",
          field: "Accounting and Finance",
          startDate: "2013",
          endDate: "2016",
        }),
      ],
      skills: [
        {
          label: "",
          items: ["Management accounts", "VAT", "Year-end close", "Xero", "Excel", "Sage"],
        },
      ],
      certifications: [
        cert("Chartered Accountant (ACA)", "Institute of Ledger Professionals", "2019"),
      ],
    }),
  },
  {
    id: "paragraph-roles",
    note: "Odd formatting: each job is a first-person paragraph, which must stay one bullet; skills on one inline line.",
    text: `Marguerite Solberg
Operations Manager · Auckland, New Zealand · marguerite.solberg@example.com · 021 555 0178

Experience

Operations Manager, Kōwhai Fresh Produce (2020 – Present)
I run day-to-day operations for a produce distributor with two warehouses and 45 staff. I rebuilt the delivery routing with the drivers, which cut late deliveries from 12% to 3%, and I negotiated new cold-storage contracts that saved $180,000 a year.

Logistics Coordinator, Tasman Bay Shipping (2016 – 2020)
Booked and tracked sea freight for 60 import customers. Introduced a shared shipment tracker that the sales team still uses to answer customer questions.

Education
Bachelor of Commerce, Supply Chain Management — University of Rangitoto, 2012–2015

Skills: Inventory planning; Route planning; Supplier negotiation; Excel; Power BI`,
    read: read({
      basics: {
        name: "Marguerite Solberg",
        headline: "Operations Manager",
        email: "marguerite.solberg@example.com",
        phone: "021 555 0178",
        location: "Auckland, New Zealand",
      },
      experience: [
        job({
          company: "Kōwhai Fresh Produce",
          title: "Operations Manager",
          startDate: "2020",
          endDate: "Present",
          bullets: [
            "I run day-to-day operations for a produce distributor with two warehouses and 45 staff. I rebuilt the delivery routing with the drivers, which cut late deliveries from 12% to 3%, and I negotiated new cold-storage contracts that saved $180,000 a year.",
          ],
        }),
        job({
          company: "Tasman Bay Shipping",
          title: "Logistics Coordinator",
          startDate: "2016",
          endDate: "2020",
          bullets: [
            "Booked and tracked sea freight for 60 import customers. Introduced a shared shipment tracker that the sales team still uses to answer customer questions.",
          ],
        }),
      ],
      education: [
        school({
          school: "University of Rangitoto",
          degree: "Bachelor of Commerce",
          field: "Supply Chain Management",
          startDate: "2012",
          endDate: "2015",
        }),
      ],
      skills: [
        {
          label: "",
          items: [
            "Inventory planning",
            "Route planning",
            "Supplier negotiation",
            "Excel",
            "Power BI",
          ],
        },
      ],
    }),
  },
  {
    id: "tabbed-dates-own-lines",
    note: "Odd formatting: tab-aligned dates on the title line, employer and city on the next, square bullets, em dashes.",
    text: `Jonah Whitcombe-Ade
Customer Success Manager
Remote (Austin, TX)\tjonah.wa@example.com\t555.017.6620

EXPERIENCE

Senior Customer Success Manager\tJan. 2022 — Present
Northbeam Software\tAustin, TX
▪ Manage a book of 45 mid-market accounts worth $6.2M in annual recurring revenue
▪ Kept gross retention at 94% through two price increases
▪ Built the onboarding playbook used by the 10-person CS team

Customer Success Manager\tMar. 2019 — Dec. 2021
Paloma Systems\tDenver, CO
▪ Onboarded 120 new customers to the scheduling platform
▪ Ran quarterly business reviews for the 20 largest accounts

EDUCATION

B.A., Communication\t2014 — 2018
Westmere University\tBoulder, CO

SKILLS
Gainsight · Salesforce · Account planning · Renewals · Churn analysis

CERTIFICATIONS
Certified Customer Success Manager (CCSM), Pathway Success Institute — 2021`,
    read: read({
      basics: {
        name: "Jonah Whitcombe-Ade",
        headline: "Customer Success Manager",
        email: "jonah.wa@example.com",
        phone: "555.017.6620",
        location: "Remote (Austin, TX)",
      },
      experience: [
        job({
          company: "Northbeam Software",
          title: "Senior Customer Success Manager",
          location: "Austin, TX",
          startDate: "Jan. 2022",
          endDate: "Present",
          bullets: [
            "Manage a book of 45 mid-market accounts worth $6.2M in annual recurring revenue",
            "Kept gross retention at 94% through two price increases",
            "Built the onboarding playbook used by the 10-person CS team",
          ],
        }),
        job({
          company: "Paloma Systems",
          title: "Customer Success Manager",
          location: "Denver, CO",
          startDate: "Mar. 2019",
          endDate: "Dec. 2021",
          bullets: [
            "Onboarded 120 new customers to the scheduling platform",
            "Ran quarterly business reviews for the 20 largest accounts",
          ],
        }),
      ],
      education: [
        school({
          school: "Westmere University",
          degree: "B.A.",
          field: "Communication",
          location: "Boulder, CO",
          startDate: "2014",
          endDate: "2018",
        }),
      ],
      skills: [
        {
          label: "",
          items: ["Gainsight", "Salesforce", "Account planning", "Renewals", "Churn analysis"],
        },
      ],
      certifications: [
        cert("Certified Customer Success Manager (CCSM)", "Pathway Success Institute", "2021"),
      ],
    }),
  },
  {
    id: "bare-minimum",
    note: "Very short: a name, an email and one inline skills line, just over the AI read's minimum.",
    text: `Kai Lindqvist
kai.lindqvist@example.com
Skills: Forklift operation, Inventory counts, First aid`,
    read: read({
      basics: { name: "Kai Lindqvist", email: "kai.lindqvist@example.com" },
      skills: [{ label: "", items: ["Forklift operation", "Inventory counts", "First aid"] }],
    }),
  },
  {
    id: "profile-only-data-analyst",
    note: "Very short, from TEST_RESUMES (data-analyst-junior): a profile paragraph and a skills line, no jobs.",
    text: `Wren Takahashi-Moore
wren.tm@example.com
Atlanta, GA

Profile
${analyst.profile}

Skills
${analyst.skills.join(", ")}`,
    read: read({
      basics: {
        name: "Wren Takahashi-Moore",
        email: "wren.tm@example.com",
        location: "Atlanta, GA",
      },
      summary: analyst.profile,
      skills: [{ label: "", items: analyst.skills }],
    }),
  },
  {
    id: "profile-only-support",
    note: "Very short, from TEST_RESUMES (support-specialist-junior): numbers in the profile must not become jobs.",
    text: `Elio Marchetti
+1 555 012 8841 · elio.marchetti@example.com

Profile
${support.profile}

Skills
${support.skills.join(", ")}`,
    read: read({
      basics: {
        name: "Elio Marchetti",
        email: "elio.marchetti@example.com",
        phone: "+1 555 012 8841",
      },
      summary: support.profile,
      skills: [{ label: "", items: support.skills }],
    }),
  },
  {
    id: "volunteer-role-among-jobs",
    note: "Hard: a volunteer job listed with the paid jobs stays in experience; a separate Volunteering heading goes to extras.",
    text: `Beatrix Nwosu
Junior Web Developer
Bristol, UK · beatrix.nwosu@example.com · github.com/bea-nwosu-dev

Summary
Former school administrator moving into web development after a 16-week coding course.

Experience
Volunteer Web Developer, Harbourside Food Bank, Bristol — Oct 2023 – Present
• Rebuilt the food bank's volunteer sign-up site in Next.js
• Set up a simple stock dashboard that the warehouse team checks each morning

School Administrator, Brackenmoor Primary School, Bristol — Sep 2016 – Aug 2023
• Managed admissions and attendance records for 420 pupils
• Moved parent letters from paper to email, saving about £2,000 a year in printing

Education
Full-Stack Web Development Bootcamp, Severn Code Academy, Jan 2023 – May 2023
• Built four team projects with React, Node.js and PostgreSQL

Volunteering
Treasurer, Larkspur Lane Allotment Society, 2019 – Present
• Keep the society's accounts and run the annual plot renewals

Skills
HTML, CSS, JavaScript, React, Next.js, Node.js, PostgreSQL, Git`,
    read: read({
      basics: {
        name: "Beatrix Nwosu",
        headline: "Junior Web Developer",
        email: "beatrix.nwosu@example.com",
        location: "Bristol, UK",
        links: [{ label: "GitHub", url: "github.com/bea-nwosu-dev" }],
      },
      summary:
        "Former school administrator moving into web development after a 16-week coding course.",
      experience: [
        job({
          company: "Harbourside Food Bank",
          title: "Volunteer Web Developer",
          location: "Bristol",
          startDate: "Oct 2023",
          endDate: "Present",
          bullets: [
            "Rebuilt the food bank's volunteer sign-up site in Next.js",
            "Set up a simple stock dashboard that the warehouse team checks each morning",
          ],
        }),
        job({
          company: "Brackenmoor Primary School",
          title: "School Administrator",
          location: "Bristol",
          startDate: "Sep 2016",
          endDate: "Aug 2023",
          bullets: [
            "Managed admissions and attendance records for 420 pupils",
            "Moved parent letters from paper to email, saving about £2,000 a year in printing",
          ],
        }),
      ],
      education: [
        school({
          school: "Severn Code Academy",
          degree: "Full-Stack Web Development Bootcamp",
          startDate: "Jan 2023",
          endDate: "May 2023",
          bullets: ["Built four team projects with React, Node.js and PostgreSQL"],
        }),
      ],
      skills: [
        {
          label: "",
          items: ["HTML", "CSS", "JavaScript", "React", "Next.js", "Node.js", "PostgreSQL", "Git"],
        },
      ],
      extras: [
        extra("volunteering", "Volunteering", [
          item({
            title: "Treasurer",
            subtitle: "Larkspur Lane Allotment Society",
            date: "2019 – Present",
            bullets: ["Keep the society's accounts and run the annual plot renewals"],
          }),
        ]),
      ],
    }),
  },
  {
    id: "personal-details-and-footers",
    note: "Hard: date of birth, marital status, page footers between jobs and a references line, all to be left out.",
    text: `CURRICULUM VITAE

Anneliese Vortmann
Location: Hamburg, Germany
Phone: +49 151 5550 1824
Email: anneliese.vortmann@example.de
Date of birth: 14 March 1991
Nationality: German
Marital status: Married

PROFILE
Logistics planner with eight years in port and rail freight.

WORK EXPERIENCE
Senior Logistics Planner, Elbmarsch Container Terminal, Hamburg, 05/2019 – present
- Plan rail departures for 1,800 containers a week
- Cut average container dwell time from 4.2 to 3.1 days

Anneliese Vortmann – Curriculum Vitae                Page 1 of 2

Logistics Planner, Nordkai Rail Freight, Bremen, 09/2015 – 04/2019
- Scheduled 30 weekly trains between the ports and inland depots
- Built the shift handover checklist used by all planners

EDUCATION
B.Sc. Logistics Management, Hochschule Weserland, 2011 – 2015

LANGUAGES
German (native), English (C1), Polish (B1)

Anneliese Vortmann – Curriculum Vitae                Page 2 of 2

REFERENCES
Available upon request.`,
    leftOut: [
      "Date of birth",
      "14 March 1991",
      "Nationality",
      "Marital status",
      "Married",
      "Page 1 of 2",
      "Page 2 of 2",
      "Curriculum Vitae",
      "Available upon request",
    ],
    read: read({
      basics: {
        name: "Anneliese Vortmann",
        email: "anneliese.vortmann@example.de",
        phone: "+49 151 5550 1824",
        location: "Hamburg, Germany",
      },
      summary: "Logistics planner with eight years in port and rail freight.",
      experience: [
        job({
          company: "Elbmarsch Container Terminal",
          title: "Senior Logistics Planner",
          location: "Hamburg",
          startDate: "05/2019",
          endDate: "present",
          bullets: [
            "Plan rail departures for 1,800 containers a week",
            "Cut average container dwell time from 4.2 to 3.1 days",
          ],
        }),
        job({
          company: "Nordkai Rail Freight",
          title: "Logistics Planner",
          location: "Bremen",
          startDate: "09/2015",
          endDate: "04/2019",
          bullets: [
            "Scheduled 30 weekly trains between the ports and inland depots",
            "Built the shift handover checklist used by all planners",
          ],
        }),
      ],
      education: [
        school({
          school: "Hochschule Weserland",
          degree: "B.Sc.",
          field: "Logistics Management",
          startDate: "2011",
          endDate: "2015",
        }),
      ],
      extras: [
        extra("languages", "Languages", [
          item({ title: "German", subtitle: "native" }),
          item({ title: "English", subtitle: "C1" }),
          item({ title: "Polish", subtitle: "B1" }),
        ]),
      ],
    }),
  },
  {
    id: "finance-diacritics",
    note: "Non-English names and places with diacritics that must be copied exactly; semicolon-separated languages.",
    text: `Zofia Wiśniewska-Hale
Financial Controller
Kraków, Poland | zofia.wh@example.pl | +48 512 555 093

Summary
Financial controller for manufacturing groups, at home with IFRS and Polish GAAP.

Experience
Financial Controller, Złotokłos Industrial Group, Kraków, 2019 – Present
• Close the books for 4 plants within 5 working days each month
• Cut audit adjustments from 23 to 4 by rebuilding the intercompany reconciliation
• Lead a finance team of 7 across Kraków and Łódź

Senior Financial Analyst, Børsen & Lind Consulting, Copenhagen, 2015 – 2019
• Built rolling 18-month forecasts for 12 retail and manufacturing clients
• Moved monthly reporting from spreadsheets to Power BI

Education
MSc Finance and Accounting, Bielany Institute of Economics, 2013 – 2015
BA Economics, Nowa Huta University, 2010 – 2013

Certifications
Chartered Management Accountant, Institute of Northern Accountancy, 2018

Skills
IFRS, Consolidation, SAP S/4HANA, Power BI, Excel, Forecasting

Languages
Polish – native; English – C2; Danish – B1`,
    read: read({
      basics: {
        name: "Zofia Wiśniewska-Hale",
        headline: "Financial Controller",
        email: "zofia.wh@example.pl",
        phone: "+48 512 555 093",
        location: "Kraków, Poland",
      },
      summary: "Financial controller for manufacturing groups, at home with IFRS and Polish GAAP.",
      experience: [
        job({
          company: "Złotokłos Industrial Group",
          title: "Financial Controller",
          location: "Kraków",
          startDate: "2019",
          endDate: "Present",
          bullets: [
            "Close the books for 4 plants within 5 working days each month",
            "Cut audit adjustments from 23 to 4 by rebuilding the intercompany reconciliation",
            "Lead a finance team of 7 across Kraków and Łódź",
          ],
        }),
        job({
          company: "Børsen & Lind Consulting",
          title: "Senior Financial Analyst",
          location: "Copenhagen",
          startDate: "2015",
          endDate: "2019",
          bullets: [
            "Built rolling 18-month forecasts for 12 retail and manufacturing clients",
            "Moved monthly reporting from spreadsheets to Power BI",
          ],
        }),
      ],
      education: [
        school({
          school: "Bielany Institute of Economics",
          degree: "MSc",
          field: "Finance and Accounting",
          startDate: "2013",
          endDate: "2015",
        }),
        school({
          school: "Nowa Huta University",
          degree: "BA",
          field: "Economics",
          startDate: "2010",
          endDate: "2013",
        }),
      ],
      skills: [
        {
          label: "",
          items: ["IFRS", "Consolidation", "SAP S/4HANA", "Power BI", "Excel", "Forecasting"],
        },
      ],
      certifications: [
        cert("Chartered Management Accountant", "Institute of Northern Accountancy", "2018"),
      ],
      extras: [
        extra("languages", "Languages", [
          item({ title: "Polish", subtitle: "native" }),
          item({ title: "English", subtitle: "C2" }),
          item({ title: "Danish", subtitle: "B1" }),
        ]),
      ],
    }),
  },
  {
    id: "freelance-designer",
    note: "Creative: an intro paragraph with no heading, self-employed work, selected projects with a link.",
    text: `Amara Delacroix-Venn
Freelance Brand Designer
amara.dv@example.com · delacroixvenn.example/work · Montréal, QC

Brand designer for independent food and drink businesses. I've designed packaging and identities for 30+ small brands.

Experience
Freelance Brand Designer, Self-employed, Montréal, 2019 – Present
• Design identities, packaging and menus for cafés, bakeries and small breweries
• Run every project from brief to print, working with 3 local printers

Junior Designer, Studio Pommeraie, Montréal, 2016 – 2019
• Designed shelf packaging for a line of 14 organic snack products
• Prepared print-ready files and checked press proofs

Selected Projects
Fourneau Bakery rebrand — delacroixvenn.example/fourneau
• New logo, bags and shopfront for a three-location bakery
Houblon Dormant cans
• Label system for 6 seasonal beers, printed on recycled aluminium sleeves

Education
DEC in Graphic Design, Cégep du Vieux-Port, 2013 – 2016

Skills
Brand identity, Packaging design, Illustrator, InDesign, Photoshop, Print production`,
    read: read({
      basics: {
        name: "Amara Delacroix-Venn",
        headline: "Freelance Brand Designer",
        email: "amara.dv@example.com",
        location: "Montréal, QC",
        links: [{ label: "Portfolio", url: "delacroixvenn.example/work" }],
      },
      summary:
        "Brand designer for independent food and drink businesses. I've designed packaging and identities for 30+ small brands.",
      experience: [
        job({
          company: "Self-employed",
          title: "Freelance Brand Designer",
          location: "Montréal",
          startDate: "2019",
          endDate: "Present",
          bullets: [
            "Design identities, packaging and menus for cafés, bakeries and small breweries",
            "Run every project from brief to print, working with 3 local printers",
          ],
        }),
        job({
          company: "Studio Pommeraie",
          title: "Junior Designer",
          location: "Montréal",
          startDate: "2016",
          endDate: "2019",
          bullets: [
            "Designed shelf packaging for a line of 14 organic snack products",
            "Prepared print-ready files and checked press proofs",
          ],
        }),
      ],
      education: [
        school({
          school: "Cégep du Vieux-Port",
          degree: "DEC",
          field: "Graphic Design",
          startDate: "2013",
          endDate: "2016",
        }),
      ],
      projects: [
        project({
          name: "Fourneau Bakery rebrand",
          link: "delacroixvenn.example/fourneau",
          bullets: ["New logo, bags and shopfront for a three-location bakery"],
        }),
        project({
          name: "Houblon Dormant cans",
          bullets: ["Label system for 6 seasonal beers, printed on recycled aluminium sleeves"],
        }),
      ],
      skills: [
        {
          label: "",
          items: [
            "Brand identity",
            "Packaging design",
            "Illustrator",
            "InDesign",
            "Photoshop",
            "Print production",
          ],
        },
      ],
    }),
  },
  {
    id: "long-senior-career",
    note: "Very long: ten jobs of ten bullets each over 25 years, plus education, certifications, skills, talks and awards.",
    text: longText(longRead),
    read: longRead,
  },
  {
    id: "job-post-not-resume",
    note: "Not a resume: a job post uploaded by mistake; the reader should return nothing rather than invent a person.",
    text: `Assistant Store Manager — Hollander & Wick (Rotterdam)

About the role
Hollander & Wick is hiring an Assistant Store Manager for our flagship store. You will run the shop floor with the Store Manager, coach a team of 15 and own stock accuracy.

What you'll do
- Open and close the store and run morning briefings
- Build weekly rotas and cover shifts when needed
- Lead stock counts and fix shrinkage issues

What we're looking for
- 2+ years of supervisory experience in retail
- Confident with tills, cash handling and stock systems
- Weekend availability

What we offer
- 25 days of holiday and a 30% staff discount
- Paid training toward a retail management diploma

Apply with your CV by 30 November.`,
    read: null,
  },
];
