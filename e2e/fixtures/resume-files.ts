import { buildDocx, noTextPdf, paragraph } from "@/lib/parse/test-fixtures";

export type ResumeFile = { name: string; mimeType: string; buffer: Buffer };

const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// A one-page Word resume in plain paragraphs, the kind the rule-based reader sorts on its own.
export async function resumeDocx(): Promise<ResumeFile> {
  const body = [
    "Morgan Lee",
    "Data Analyst",
    "morgan.lee@example.com | +1 555 010 2233 | Toronto, Canada",
    "SUMMARY",
    "Data analyst with five years of experience turning messy sales data into clear weekly reports.",
    "EXPERIENCE",
    "Data Analyst, Northwind Traders",
    "Jan 2022 - Present",
    "• Built a sales dashboard that 40 account managers use every week.",
    "• Cut the monthly close report from three days to four hours with SQL and Python.",
    "EDUCATION",
    "BSc Statistics, University of Somewhere",
    "Sep 2015 - Jun 2019",
    "SKILLS",
    "SQL, Python, Tableau, Excel",
  ]
    .map((line) => paragraph(line))
    .join("");
  return {
    name: "Morgan Lee resume.docx",
    mimeType: DOCX_TYPE,
    buffer: Buffer.from(await buildDocx({ body })),
  };
}

// A page of shapes with no text layer, like a scan: hiring software finds nothing to read.
export async function scannedPdf(): Promise<ResumeFile> {
  return { name: "scan.pdf", mimeType: "application/pdf", buffer: Buffer.from(await noTextPdf()) };
}

// A resume.json in the jsonresume.org shape, read in the browser without any upload.
export function jsonResume(): ResumeFile {
  const resume = {
    basics: {
      name: "Riley Chen",
      label: "Frontend Engineer",
      email: "riley.chen@example.com",
      phone: "+1 555 010 7788",
      summary: "Frontend engineer who builds fast, accessible checkout flows.",
      location: { city: "Lisbon", countryCode: "PT" },
    },
    work: [
      {
        name: "Fabrikam",
        position: "Frontend Engineer",
        startDate: "2021-04",
        highlights: [
          "Rebuilt the checkout in React, lifting completed orders by 12 percent.",
          "Cut the main bundle from 900 KB to 350 KB.",
        ],
      },
    ],
    education: [
      { institution: "University of Somewhere", studyType: "BSc", area: "Computer Science" },
    ],
    skills: [{ name: "Frontend", keywords: ["TypeScript", "React", "CSS"] }],
  };
  return {
    name: "resume.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(resume, null, 2)),
  };
}
