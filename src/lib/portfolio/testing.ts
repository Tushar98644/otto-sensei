import { emptyResume, type Resume } from "@/lib/resume/schema";

export function sampleResume(overrides: Partial<Resume> = {}): Resume {
  return {
    ...emptyResume(1_000),
    id: "resume-1",
    title: "Acme, 2nd try",
    basics: {
      name: "Maya Chen",
      headline: "Frontend engineer",
      email: "maya@example.com",
      phone: "+1 415 555 0100",
      location: "Lisbon, Portugal",
      links: [
        { id: "l1", label: "LinkedIn", url: "linkedin.com/in/mayachen" },
        { id: "l2", label: "Site", url: "javascript:alert(1)" },
      ],
    },
    summary: "I build fast, friendly web apps.\n\nI like small teams.",
    projects: [
      {
        id: "p1",
        name: "otto-resume",
        link: "https://github.com/mayachen/otto-resume",
        bullets: [{ id: "b1", text: "Parses 1,000 resumes a minute" }],
      },
      { id: "p2", name: "Draft", link: "", bullets: [{ id: "b2", text: "Secret" }], hidden: true },
    ],
    experience: [
      {
        id: "e1",
        company: "Acme",
        title: "Engineer",
        location: "Remote",
        startDate: "Jan 2022",
        endDate: "Present",
        bullets: [
          { id: "b3", text: "Cut load time by 40%" },
          { id: "b4", text: "Hidden line", hidden: true },
        ],
      },
    ],
    skills: [{ id: "s1", label: "", items: ["React", "TypeScript"] }],
    tailor: {
      baseResumeId: "base",
      jobTitle: "Engineer",
      company: "Acme",
      keywords: ["React"],
      createdAt: 1,
      coverLetter: "Dear Acme",
    },
    ...overrides,
  };
}

const b = (id: string, text: string) => ({ id, text });

export function jordanResume(): Resume {
  return {
    ...emptyResume(Date.UTC(2026, 10, 8)),
    id: "resume-jordan",
    title: "Jordan Ellis",
    basics: {
      name: "Jordan Ellis",
      headline: "Full-stack engineer",
      email: "hello@jordanellis.dev",
      phone: "+1 416 555 0182",
      location: "Toronto, Canada",
      links: [
        { id: "l1", label: "GitHub", url: "https://github.com/jordanellis" },
        { id: "l2", label: "LinkedIn", url: "https://linkedin.com/in/jordanellis" },
      ],
    },
    summary:
      "I build product software end to end: the React screen, the Node service behind it, and the Postgres schema under both. Six years at a fintech, a logistics startup and a product studio.\n\nRight now I'm a senior engineer at Ledgerline, where I look after billing. On the side I maintain Lanequeue, a job queue that runs on nothing but Postgres. Open to senior and staff roles from January.",
    experience: [
      {
        id: "e1",
        company: "Ledgerline",
        title: "Senior Software Engineer",
        location: "Remote",
        startDate: "2023",
        endDate: "Now",
        bullets: [
          b(
            "e1b1",
            "Moved invoice generation from a nightly batch job to an event-driven queue on Postgres. 4,800 business accounts now get invoices in under 2 minutes.",
          ),
          b(
            "e1b2",
            "Cut p95 dashboard load from 3.8 s to 0.9 s with materialized views and streamed report panels.",
          ),
          b(
            "e1b3",
            "Wrote the zero-downtime migration playbook behind 40+ schema changes with no outage.",
          ),
        ],
      },
      {
        id: "e2",
        company: "Parcelbird",
        title: "Software Engineer",
        location: "Toronto",
        startDate: "2020",
        endDate: "2023",
        bullets: [
          b(
            "e2b1",
            "Built the carrier-rate API in Node and TypeScript, quoting 1.2M shipments a month across 9 carriers.",
          ),
          b(
            "e2b2",
            "Shipped an offline-first driver app (React, IndexedDB) used by 600 drivers a day.",
          ),
          b(
            "e2b3",
            "Added Playwright tests to CI. Rollbacks fell from about two a month to one a quarter.",
          ),
        ],
      },
      {
        id: "e3",
        company: "Fieldnote Studio",
        title: "Web Developer",
        location: "Toronto",
        startDate: "2018",
        endDate: "2020",
        bullets: [
          b(
            "e3b1",
            "Built 14 client web apps and two internal tools, from first sketch to launch.",
          ),
          b(
            "e3b2",
            "Led the move from jQuery templates to React and TypeScript across active projects.",
          ),
        ],
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Lanequeue",
        link: "https://github.com/jordanellis/lanequeue",
        bullets: [
          b(
            "p1b1",
            "A Postgres-backed job queue for Node. Uses SKIP LOCKED, so there is no Redis to run.",
          ),
        ],
      },
      {
        id: "p2",
        name: "Shelf",
        link: "https://shelf.jordanellis.dev",
        bullets: [
          b("p2b1", "A self-hosted read-later app that saves articles as clean Markdown files."),
        ],
      },
      {
        id: "p3",
        name: "Drift",
        link: "https://github.com/jordanellis/drift",
        bullets: [
          b(
            "p3b1",
            "A CLI that compares two Postgres schemas and writes the migration SQL for you.",
          ),
        ],
      },
      {
        id: "p4",
        name: "Streetcar",
        link: "https://github.com/jordanellis/streetcar",
        bullets: [b("p4b1", "Live tram arrivals on a $40 e-ink screen by the front door.")],
      },
    ],
    education: [
      {
        id: "ed1",
        school: "University of Toronto",
        degree: "B.Sc.",
        field: "Computer Science",
        location: "Toronto",
        startDate: "2014",
        endDate: "2018",
        bullets: [],
      },
    ],
    skills: [
      { id: "s1", label: "Languages", items: ["TypeScript", "SQL", "Go"] },
      { id: "s2", label: "Frontend", items: ["React", "Next.js", "TanStack Query", "Playwright"] },
      { id: "s3", label: "Backend", items: ["Node.js", "Fastify", "Postgres", "Redis"] },
      { id: "s4", label: "Infra", items: ["AWS", "Docker", "GitHub Actions"] },
    ],
  };
}

export function stressResume(): Resume {
  const companies = [
    "Featherstonehaugh International Payments and Settlement Infrastructure Group",
    "",
    "Acme",
    "Initech",
    "Globex",
    "Hooli",
    "Vandelay Industries",
    "Wonka",
  ];
  return {
    ...emptyResume(Date.UTC(2026, 10, 8)),
    id: "resume-stress",
    title: "Stress",
    basics: {
      name: "Maximilian-Alexander Featherstonehaugh-Montgomery",
      headline:
        "Principal platform engineer for distributed payments infrastructure and developer tooling",
      email:
        "maximilian.alexander.featherstonehaugh@an-extremely-long-domain-name-for-testing.example.com",
      phone: "",
      location: "",
      links: [],
    },
    summary: "",
    experience: companies.map((company, index) => ({
      id: `x${index}`,
      company,
      title:
        index === 0 ? "Staff Engineer, Payments Reliability and Developer Experience" : "Engineer",
      location: index % 2 === 0 ? "Remote" : "",
      startDate: `Mar ${2024 - index * 2}`,
      endDate: index === 0 ? "Present" : `Feb ${2026 - index * 2}`,
      bullets:
        index === 3
          ? []
          : [
              b(
                `x${index}a`,
                "Wrote https://example.com/an/unbroken/address/that/is/much/longer/than/any/phone/screen/is/wide/and/keeps/going",
              ),
              b(`x${index}b`, "Shipped a thing that people used every day."),
            ],
    })),
    projects: [
      {
        id: "q1",
        name: "A project with a remarkably long name that wraps onto several lines",
        link: "",
        bullets: [],
      },
      {
        id: "q2",
        name: "nolinks",
        link: "",
        bullets: [b("q2a", "Only a description, and no link at all.")],
      },
      {
        id: "q3",
        name: "many-lines",
        link: "https://github.com/maxfm/many-lines",
        bullets: [
          b("q3a", "First line."),
          b("q3b", "Second line."),
          b("q3c", "Third line."),
          b("q3d", "Fourth line."),
        ],
      },
    ],
    education: [
      {
        id: "s1",
        school: "",
        degree: "Self-taught",
        field: "",
        location: "",
        startDate: "",
        endDate: "",
        bullets: [],
      },
    ],
    skills: [
      {
        id: "k1",
        label: "",
        items: Array.from({ length: 40 }, (_, index) => `Skill${index + 1}`),
      },
    ],
  };
}
