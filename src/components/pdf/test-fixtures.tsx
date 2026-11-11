import { renderToBuffer } from "@react-pdf/renderer";
import { extractText, getDocumentProxy } from "unpdf";
import { expect } from "vitest";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import { emptyResume, type Resume, type TemplateId } from "@/lib/resume/schema";
import { ResumePdf } from "./resume-pdf";

// Renders real PDF bytes and reads the text back with pdf.js, the way hiring software would.

export function sampleResume(): Resume {
  const resume = emptyResume(0);
  return {
    ...resume,
    title: "Backend roles",
    basics: {
      name: "Maya Lindqvist",
      headline: "Senior Backend Engineer",
      email: "maya.lindqvist@example.com",
      phone: "+1 415 555 0142",
      location: "Toronto, Canada",
      links: [
        { id: "l1", label: "LinkedIn", url: "https://www.linkedin.com/in/mayalindqvist/" },
        { id: "l2", label: "GitHub", url: "github.com/mayal" },
      ],
    },
    summary:
      "Backend engineer with 7 years of experience building payment and data platforms. Known for turning slow, fragile services into fast and reliable ones.",
    experience: [
      {
        id: "e1",
        title: "Senior Backend Engineer",
        company: "Northwind Payments",
        location: "Toronto, Canada",
        startDate: "Jan 2021",
        endDate: "Present",
        bullets: [
          {
            id: "b1",
            text: "Cut checkout latency 38% by moving fraud checks off the request path into a Kafka-backed worker pool.",
          },
          {
            id: "b2",
            text: "Led the migration of 40 services from a shared PostgreSQL cluster to per-team databases with zero downtime.",
          },
          {
            id: "b3",
            text: "Built an internal Kubernetes deployment tool now used by 12 teams, cutting release time from 2 hours to 15 minutes.",
          },
        ],
      },
      {
        id: "e2",
        title: "Software Engineer",
        company: "Bluefin Analytics",
        location: "Berlin, Germany",
        startDate: "Jun 2017",
        endDate: "Dec 2020",
        bullets: [
          {
            id: "b4",
            text: "Designed a TypeScript and Node.js ingestion API that handles 2 billion events a month.",
          },
          {
            id: "b5",
            text: "Reduced cloud costs by $180,000 a year by rightsizing AWS instances and adding autoscaling.",
          },
          {
            id: "b6",
            text: "Mentored 4 junior engineers through code reviews and weekly pairing sessions.",
          },
          { id: "b7", text: "   " },
        ],
      },
    ],
    education: [
      {
        id: "s1",
        school: "University of Edinburgh",
        degree: "BSc",
        field: "Computer Science",
        location: "Edinburgh, UK",
        startDate: "2013",
        endDate: "2017",
        bullets: [],
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Ledger Lint",
        link: "github.com/mayal/ledger-lint",
        bullets: [
          {
            id: "b8",
            text: "Open-source tool that flags rounding errors in financial reports, with 1,200 stars on GitHub.",
          },
        ],
      },
    ],
    skills: [
      { id: "k1", label: "Languages", items: ["TypeScript", "Go", "SQL", "Python"] },
      {
        id: "k2",
        label: "Infrastructure",
        items: ["Kubernetes", "AWS", "Terraform", "Kafka", "PostgreSQL"],
      },
    ],
    certifications: [
      {
        id: "c1",
        name: "AWS Certified Solutions Architect",
        issuer: "Amazon Web Services",
        date: "2022",
      },
    ],
  };
}

export async function render(
  resume: Resume,
  pageSize?: PdfPageSize,
  template?: TemplateId,
): Promise<Uint8Array> {
  return new Uint8Array(
    await renderToBuffer(<ResumePdf resume={resume} pageSize={pageSize} template={template} />),
  );
}

export async function open(bytes: Uint8Array) {
  // pdf.js may detach the buffer it reads, so it gets a copy.
  return getDocumentProxy(bytes.slice());
}

export async function readPages(bytes: Uint8Array): Promise<string[]> {
  const pdf = await open(bytes);
  try {
    const { text } = await extractText(pdf, { mergePages: false });
    return text;
  } finally {
    await pdf.loadingTask.destroy();
  }
}

export async function readText(bytes: Uint8Array): Promise<string> {
  return (await readPages(bytes)).join("\n");
}

// Enough jobs for two or three pages. `padding` extra summary lines shift where the breaks land.
export function longResume(padding: number): Resume {
  const resume = sampleResume();
  const extra = Array.from({ length: padding }, (_, i) => `Extra summary line ${i + 1}.`);
  resume.summary = [resume.summary, ...extra].join("\n");
  resume.experience = Array.from({ length: 9 }, (_, job) => ({
    id: `job-${job}`,
    title: `Role ${job + 1}`,
    company: `Company ${job + 1}`,
    location: "Remote",
    startDate: `Jan ${2010 + job}`,
    endDate: `Dec ${2010 + job}`,
    bullets: Array.from({ length: 3 + (job % 3) }, (_, line) => ({
      id: `job-${job}-${line}`,
      text:
        line % 2 === 0
          ? "Shipped a billing service that cut failed payments by 18% across 40 markets."
          : "Rebuilt the onboarding flow with the design team, which raised week-one retention from 41% to 55% and cut support tickets about setup by a third over two quarters.",
    })),
  }));
  return resume;
}

export const flatten = (text: string) => text.replace(/\s+/g, " ");

export function expectInOrder(text: string, parts: string[]) {
  let from = 0;
  for (const part of parts) {
    const at = text.indexOf(part, from);
    expect(at, `"${part}" should appear after position ${from}`).toBeGreaterThanOrEqual(0);
    from = at + part.length;
  }
}

// Every newer field in use: company runs, extras, own headings, hidden items, look settings.
export function richResume(): Resume {
  const resume = sampleResume();
  const [first, second] = resume.experience;
  resume.experience = [
    {
      ...first!,
      bullets: [
        ...first!.bullets,
        { id: "b-hidden", text: "Hidden line about Kafka.", hidden: true },
      ],
    },
    {
      id: "e1b",
      title: "Backend Engineer",
      company: "northwind payments",
      location: "Toronto, Canada",
      startDate: "Mar 2019",
      endDate: "Dec 2020",
      bullets: [{ id: "b1b", text: "Owned the ledger service through its first audit." }],
    },
    second!,
    {
      id: "e-hidden",
      title: "Hidden Intern",
      company: "Secret Labs",
      location: "",
      startDate: "2015",
      endDate: "2016",
      bullets: [{ id: "b-int", text: "A job the person chose to hide." }],
      hidden: true,
    },
  ];
  resume.skills = [
    ...resume.skills,
    { id: "k-hidden", label: "Hobbies", items: ["Chess"], hidden: true },
  ];
  resume.certifications = [
    ...resume.certifications,
    { id: "c-hidden", name: "Hidden Certificate", issuer: "Nowhere", date: "2010", hidden: true },
  ];
  resume.sectionTitles = { experience: "Work history", skills: "Toolbox" };
  resume.hiddenSections = ["projects"];
  resume.extras = [
    {
      id: "x-lang",
      kind: "languages",
      title: "Languages",
      items: [
        { id: "l1", title: "Spanish", subtitle: "Fluent", date: "", detail: "", bullets: [] },
        { id: "l2", title: "French", subtitle: "Basic", date: "", detail: "", bullets: [] },
        {
          id: "l3",
          title: "Klingon",
          subtitle: "",
          date: "",
          detail: "",
          bullets: [],
          hidden: true,
        },
      ],
    },
    {
      id: "x-hidden",
      kind: "custom",
      title: "Hidden Section",
      items: [{ id: "h1", title: "Nothing here", subtitle: "", date: "", detail: "", bullets: [] }],
      hidden: true,
    },
    {
      id: "x-awards",
      kind: "awards",
      title: "Awards",
      items: [
        {
          id: "a1",
          title: "Best Paper Award",
          subtitle: "ACM SIGMOD",
          date: "2021",
          detail: "For work on streaming ledgers.",
          bullets: [{ id: "ab1", text: "Chosen from 400 submissions." }],
        },
      ],
    },
  ];
  resume.design = { accent: "navy", font: "serif", density: "compact" };
  return resume;
}
