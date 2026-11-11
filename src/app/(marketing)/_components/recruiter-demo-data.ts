import type { CheckStatus } from "@/lib/checks/types";

export const DEMO_PERSON = {
  name: "Maya Chen",
  role: "Product Designer",
  email: "maya@example.com",
  // 555-01xx numbers are reserved for fiction.
  phone: "+1 415 555 0134",
  skills: ["Figma", "User research", "Prototyping"],
  languages: ["English", "Spanish"],
  jobs: [
    {
      title: "Senior Product Designer",
      company: "Pinewood Apps",
      dates: "2021 – now",
      bullet: "Redesigned checkout. Orders up 18%.",
    },
    {
      title: "Product Designer",
      company: "Tidewater Studio",
      dates: "2018 – 2021",
      bullet: "Built the team's design system.",
    },
  ],
} as const;

export const DEMO_FILE_NAME = "maya-chen.pdf";

export type ParsedSegment = { text: string; kind?: "column" | "symbol" };

const ICON: ParsedSegment = { text: "�", kind: "symbol" };

function readAcrossColumns(): ParsedSegment[][] {
  const { skills, languages, jobs } = DEMO_PERSON;
  const side = ["SKILLS", ...skills, "LANGUAGES", ...languages];
  const main = [
    "EXPERIENCE",
    ...jobs.flatMap((job) => [job.title, `${job.company} · ${job.dates}`, `• ${job.bullet}`]),
  ];
  const rows = Math.max(side.length, main.length);
  return Array.from({ length: rows }, (_, row) => {
    const left = side[row];
    const right = main[row];
    const line: ParsedSegment[] = [];
    if (left) line.push({ text: left, kind: "column" });
    if (right) line.push({ text: left ? ` ${right}` : right });
    return line;
  });
}

export const PARSED_LINES: readonly ParsedSegment[][] = [
  [{ text: DEMO_PERSON.name }],
  [{ text: DEMO_PERSON.role }],
  [ICON, { text: ` ${DEMO_PERSON.email} ` }, ICON, { text: ` ${DEMO_PERSON.phone}` }],
  ...readAcrossColumns(),
];

export type DemoCheck = { status: CheckStatus; title: string; detail: string };

export const DEMO_CHECKS: readonly DemoCheck[] = [
  {
    status: "fail",
    title: "Two-column layout",
    detail: "Your skills got mixed into your job history.",
  },
  {
    status: "warn",
    title: "Icons in your contact line",
    detail: "They turn into stray symbols. Plain words work better.",
  },
  { status: "pass", title: "Email and phone found", detail: "Recruiters can reach you." },
];
