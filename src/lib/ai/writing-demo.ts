import type { Resume } from "@/lib/resume/schema";
import { asResumeLine } from "./text";
import type { WritingInput } from "./types";

const MAX_LINES = 3;

function lowerFirst(text: string): string {
  return text.replace(/^\p{Lu}(?=\p{Ll})/u, (letter) => letter.toLowerCase());
}

function topLines(resume: Resume): { line: string; role: string }[] {
  const lines: { line: string; role: string }[] = [];
  for (const job of resume.experience) {
    const role = [job.title, job.company].filter((part) => part.trim()).join(" at ");
    for (const bullet of job.bullets) {
      const line = asResumeLine(bullet.text);
      if (line) lines.push({ line, role });
      if (lines.length === MAX_LINES) return lines;
    }
  }
  return lines;
}

function roleName(job: WritingInput): string {
  const title = job.jobTitle || "this role";
  return job.company ? `${title} at ${job.company}` : title;
}

export function demoLetter(resume: Resume, job: WritingInput): string[] {
  const [first, ...rest] = topLines(resume);
  const opening = `I'm applying for the ${roleName(job)}.`;
  const lead = first
    ? `${first.role ? `As ${first.role}, I` : "I"} ${lowerFirst(first.line)}.`
    : "My resume has the details of my work so far.";
  const middle = rest.length
    ? rest.map((item) => `I also ${lowerFirst(item.line)}.`).join(" ")
    : "I'd be glad to walk you through my experience.";
  return [
    `${opening} ${lead}`,
    middle,
    "This is a sample letter from Otto's demo mode. I'd be glad to talk about the role.",
  ];
}

export function demoAnswer(resume: Resume, job: WritingInput, question: string): string[] {
  const [first] = topLines(resume);
  const fact = first
    ? `${first.role ? `As ${first.role}, I` : "I"} ${lowerFirst(first.line)}.`
    : "My resume has the details of my work so far.";
  const intro = `This is a sample answer to “${question}” for the ${roleName(job)}.`;
  return [`${intro} ${fact} [Add your own reason here.]`];
}

export function demoOutreach(
  resume: Resume,
  job: WritingInput,
  mode: "first" | "follow_up" | "thank_you" = "first",
): { subject: string; email: string[]; note: string } {
  const [first] = topLines(resume);
  const fact = first
    ? `${first.role ? `As ${first.role}, I` : "I"} ${lowerFirst(first.line)}.`
    : "My resume has the details of my work so far.";
  const subject = `${job.jobTitle || "The open role"}${job.company ? ` at ${job.company}` : ""}`;
  if (mode === "thank_you") {
    return {
      subject: `Thank you: ${subject}`,
      email: [
        `Thank you for your time talking about the ${roleName(job)}. I'm still keen on it. ${fact}`,
        "This is a sample thank-you from Otto's demo mode. I look forward to hearing about the next steps.",
      ],
      note: `Thank you for the conversation about the ${roleName(job)}.`,
    };
  }
  if (mode === "follow_up") {
    return {
      subject: `Following up: ${subject}`,
      email: [
        `I applied for the ${roleName(job)} recently and I'm still keen on it. ${fact}`,
        "This is a sample follow-up from Otto's demo mode. Is there anything else I can send while you review applications?",
      ],
      note: `I applied for the ${roleName(job)} and would be glad to connect.`,
    };
  }
  return {
    subject,
    email: [
      `I'm applying for the ${roleName(job)}. ${fact}`,
      "This is a sample message from Otto's demo mode. Would you be open to a short call next week?",
    ],
    note: `I'm applying for the ${roleName(job)} and would be glad to connect.`,
  };
}
