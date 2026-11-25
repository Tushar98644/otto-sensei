import type { CheckStatus } from "@/lib/checks/types";
import type { HomeMessages } from "./home-copy";

export type DemoResumeMessages = HomeMessages["resume"];

export type DemoJob = { title: string; company: string; dates: string; bullet: string };

export type DemoPerson = {
  name: string;
  role: string;
  email: string;
  phone: string;
  skills: readonly string[];
  languages: readonly string[];
  jobs: readonly DemoJob[];
};

export function demoPerson(t: DemoResumeMessages): DemoPerson {
  return {
    name: "Maya Chen",
    role: t.role,
    email: "maya@example.com",
    // 555-01xx numbers are reserved for fiction.
    phone: "+1 415 555 0134",
    skills: ["Figma", t.skills.research, t.skills.prototyping],
    languages: [t.languages.english, t.languages.spanish],
    jobs: [
      { ...t.jobs.senior, company: "Pinewood Apps" },
      { ...t.jobs.designer, company: "Tidewater Studio" },
    ],
  };
}

export const DEMO_FILE_NAME = "maya-chen.pdf";

export type ParsedSegment = { text: string; kind?: "column" | "symbol" };

const ICON: ParsedSegment = { text: "�", kind: "symbol" };

function readAcrossColumns(person: DemoPerson, t: DemoResumeMessages): ParsedSegment[][] {
  const { skills, languages, jobs } = person;
  const side = [
    t.headings.skills.toUpperCase(),
    ...skills,
    t.headings.languages.toUpperCase(),
    ...languages,
  ];
  const main = [
    t.headings.experience.toUpperCase(),
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

export function parsedLines(person: DemoPerson, t: DemoResumeMessages): ParsedSegment[][] {
  return [
    [{ text: person.name }],
    [{ text: person.role }],
    [ICON, { text: ` ${person.email} ` }, ICON, { text: ` ${person.phone}` }],
    ...readAcrossColumns(person, t),
  ];
}

export type DemoCheck = { status: CheckStatus; title: string; detail: string };

type CheckKey = keyof HomeMessages["how"]["checks"]["items"];

const CHECK_STATUS: readonly [CheckKey, CheckStatus][] = [
  ["columns", "fail"],
  ["icons", "warn"],
  ["contact", "pass"],
];

export function demoChecks(t: HomeMessages["how"]["checks"]["items"]): DemoCheck[] {
  return CHECK_STATUS.map(([key, status]) => ({ status, ...t[key] }));
}
